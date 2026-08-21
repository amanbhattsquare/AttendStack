import { playMessageChime } from './notificationSound';

let swRegistration: ServiceWorkerRegistration | null = null;
let originalDocumentTitle = typeof document !== 'undefined' ? document.title : 'AttendStack';
let unreadTitleCount = 0;

// Track active window notifications by tag for programmatic closing
const activeWindowNotifications = new Map<string, Notification>();

// Deduplication store for notified message IDs (In-Memory + SessionStorage)
const notifiedMessageIds = new Set<string>();

const loadNotifiedIdsFromStorage = () => {
  if (typeof window === 'undefined') return;
  try {
    const raw = sessionStorage.getItem('attendstack_notified_msg_ids');
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        arr.forEach((id) => notifiedMessageIds.add(String(id)));
      }
    }
  } catch (_) {}
};

const saveNotifiedIdsToStorage = () => {
  if (typeof window === 'undefined') return;
  try {
    // Keep max 500 recent IDs to avoid storage bloating
    const arr = Array.from(notifiedMessageIds).slice(-500);
    sessionStorage.setItem('attendstack_notified_msg_ids', JSON.stringify(arr));
  } catch (_) {}
};

loadNotifiedIdsFromStorage();

/**
 * Check if a message has already triggered a notification
 */
export const hasMessageBeenNotified = (messageId?: string | number | null): boolean => {
  if (!messageId) return false;
  return notifiedMessageIds.has(String(messageId));
};

/**
 * Mark a message as notified so it never triggers again
 */
export const markMessageAsNotified = (messageId?: string | number | null): void => {
  if (!messageId) return;
  notifiedMessageIds.add(String(messageId));
  saveNotifiedIdsToStorage();
};

/**
 * Seed existing historical messages into notified cache on login / initial load
 */
export const initNotifiedMessages = (messageIds: (string | number)[]): void => {
  if (!Array.isArray(messageIds)) return;
  messageIds.forEach((id) => {
    if (id) notifiedMessageIds.add(String(id));
  });
  saveNotifiedIdsToStorage();
};

/**
 * Register Service Worker for background chat notifications
 */
export const registerChatServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    swRegistration = reg;
    return reg;
  } catch (err) {
    console.warn('[AttendStack] Service Worker registration warning:', err);
    return null;
  }
};

/**
 * Check current notification permission
 */
export const getNotificationPermission = (): NotificationPermission => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
};

/**
 * Request notification permission from the user
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await registerChatServiceWorker();
    }
    return permission;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return 'denied';
  }
};

/**
 * Update the browser tab title with unread badge count
 */
export const updateTabTitleBadge = (count: number) => {
  if (typeof document === 'undefined') return;
  unreadTitleCount = count;
  if (count > 0) {
    const base = originalDocumentTitle.replace(/^\(\d+\)\s*/, '');
    document.title = `(${count}) ${base}`;
  } else {
    document.title = originalDocumentTitle.replace(/^\(\d+\)\s*/, '');
  }
};

export const clearTabTitleBadge = () => {
  updateTabTitleBadge(0);
};

/**
 * Close any active notification banners for a given conversation (when seen/opened)
 */
export const closeConversationNotifications = async (conversationId?: string | null): Promise<void> => {
  if (typeof window === 'undefined' || !conversationId) return;

  const notificationTag = `chat_${conversationId}`;

  // 1. Close standard active window notification
  const activeWinNotif = activeWindowNotifications.get(notificationTag);
  if (activeWinNotif) {
    try {
      activeWinNotif.close();
    } catch (_) {}
    activeWindowNotifications.delete(notificationTag);
  }

  // 2. Close active service worker notifications matching tag
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && 'getNotifications' in reg) {
        const notifs = await reg.getNotifications({ tag: notificationTag });
        notifs.forEach((n) => n.close());
      }
    }
  } catch (_) {}
};

export interface ChatNotificationPayload {
  messageId?: string;
  title: string;
  body: string;
  conversationId?: string;
  avatar?: string | null;
  playSound?: boolean;
}

/**
 * Dispatch a Browser & Background Notification for an incoming new chat message
 */
export const sendBrowserChatNotification = async ({
  messageId,
  title,
  body,
  conversationId,
  avatar,
  playSound = true,
}: ChatNotificationPayload): Promise<void> => {
  if (typeof window === 'undefined') return;

  // Strict anti-duplicate check: if messageId has already triggered notification, exit immediately
  if (messageId) {
    if (hasMessageBeenNotified(messageId)) {
      return;
    }
    markMessageAsNotified(messageId);
  }

  // 1. Play Audio Chime & trigger phone vibration
  if (playSound) {
    playMessageChime();
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([200, 100, 200]);
      } catch (_) {}
    }
  }

  // 2. If Notification API is not supported or permission not granted, return early
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const notificationTag = conversationId ? `chat_${conversationId}` : 'attendstack_chat';
  const targetUrl = conversationId ? `/chat?convId=${conversationId}` : '/chat';
  const iconUrl = avatar || '/favicon.png';

  const notificationOptions: NotificationOptions & Record<string, any> = {
    body,
    icon: iconUrl,
    badge: '/favicon.png',
    tag: notificationTag,
    renotify: true,
    silent: true,
    data: {
      url: targetUrl,
      conversationId,
    },
  };

  // 3. Try showing via Service Worker first (works in mobile background / PWA)
  try {
    if (!swRegistration && 'serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) swRegistration = reg;
    }

    if (swRegistration && 'showNotification' in swRegistration) {
      await swRegistration.showNotification(title, notificationOptions as NotificationOptions);
      return;
    }
  } catch (swErr) {
    console.debug('Service worker notification fallback:', swErr);
  }

  // 4. Fallback to standard Window Notification
  try {
    const notification = new Notification(title, notificationOptions);
    activeWindowNotifications.set(notificationTag, notification);

    notification.onclick = (event) => {
      event.preventDefault();
      window.focus();
      if (conversationId && window.location.pathname !== '/chat') {
        window.location.href = targetUrl;
      }
      notification.close();
      activeWindowNotifications.delete(notificationTag);
    };

    notification.onclose = () => {
      activeWindowNotifications.delete(notificationTag);
    };
  } catch (notifErr) {
    console.error('Failed to display browser notification:', notifErr);
  }
};
