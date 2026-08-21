import { playMessageChime } from './notificationSound';

let swRegistration: ServiceWorkerRegistration | null = null;
let originalDocumentTitle = typeof document !== 'undefined' ? document.title : 'AttendStack';
let unreadTitleCount = 0;

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
    console.log('[AttendStack] Chat Service Worker registered successfully:', reg.scope);
    return reg;
  } catch (err) {
    console.warn('[AttendStack] Service Worker registration failed:', err);
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

export interface ChatNotificationPayload {
  title: string;
  body: string;
  conversationId?: string;
  avatar?: string | null;
  playSound?: boolean;
}

/**
 * Dispatch a Browser & Background Notification for an incoming chat message
 */
export const sendBrowserChatNotification = async ({
  title,
  body,
  conversationId,
  avatar,
  playSound = true,
}: ChatNotificationPayload): Promise<void> => {
  if (typeof window === 'undefined') return;

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
    notification.onclick = (event) => {
      event.preventDefault();
      window.focus();
      if (conversationId && window.location.pathname !== '/chat') {
        window.location.href = targetUrl;
      }
      notification.close();
    };
  } catch (notifErr) {
    console.error('Failed to display browser notification:', notifErr);
  }
};
