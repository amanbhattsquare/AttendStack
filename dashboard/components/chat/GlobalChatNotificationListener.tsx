'use client';

import React, { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { fetchConversations, Conversation } from '../../helper/chatApi';
import {
  registerChatServiceWorker,
  sendBrowserChatNotification,
  updateTabTitleBadge,
  clearTabTitleBadge,
  initNotifiedMessages,
  hasMessageBeenNotified,
} from '../../helper/browserNotification';
import { preloadNotificationSound } from '../../helper/notificationSound';

export const GlobalChatNotificationListener: React.FC = () => {
  const pathname = usePathname();
  const prevConversationsRef = useRef<Record<string, { lastMsgId?: string; unread: number }>>({});
  const isFirstLoadRef = useRef(true);

  // Current logged in user ID
  const getCurrentUserId = () => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const u = JSON.parse(stored);
        return u?.id ? String(u.id) : null;
      }
    } catch (_) {}
    return null;
  };

  // Initialize service worker & preload audio on mount
  useEffect(() => {
    registerChatServiceWorker();
    preloadNotificationSound();
  }, []);

  // Poll conversations every 12 seconds in background to detect incoming messages
  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ['global_conversations_notifications'],
    queryFn: fetchConversations,
    refetchInterval: 12000,
    refetchIntervalInBackground: true,
    staleTime: 5000,
  });

  // Monitor unread and new messages
  useEffect(() => {
    if (!conversations || !Array.isArray(conversations)) return;

    const currentUserId = getCurrentUserId();
    let totalUnread = 0;
    const currentMap: Record<string, { lastMsgId?: string; unread: number }> = {};

    // 1. On FIRST load / login, seed all existing messages into notified registry so old messages NEVER trigger notifications
    if (isFirstLoadRef.current) {
      const existingMsgIds = conversations
        .map((c) => c.last_message?.id)
        .filter(Boolean) as string[];
      initNotifiedMessages(existingMsgIds);

      conversations.forEach((conv) => {
        totalUnread += conv.unread_count || 0;
        currentMap[conv.id] = {
          lastMsgId: conv.last_message?.id,
          unread: conv.unread_count || 0,
        };
      });

      if (totalUnread > 0) {
        updateTabTitleBadge(totalUnread);
      } else {
        clearTabTitleBadge();
      }

      prevConversationsRef.current = currentMap;
      isFirstLoadRef.current = false;
      return;
    }

    // 2. Subsequent polls: only trigger for brand-new incoming messages not yet notified
    conversations.forEach((conv) => {
      totalUnread += conv.unread_count || 0;
      currentMap[conv.id] = {
        lastMsgId: conv.last_message?.id,
        unread: conv.unread_count || 0,
      };

      const lastMsg = conv.last_message;
      if (!lastMsg || !lastMsg.id) return;

      const prev = prevConversationsRef.current[conv.id];
      const isNewMessageArrival = !prev || prev.lastMsgId !== lastMsg.id;

      // Skip if this message has already triggered a notification
      if (hasMessageBeenNotified(lastMsg.id)) return;

      // Skip if the message was sent by the current user
      const isFromMe = currentUserId && lastMsg.sender && String(lastMsg.sender.id) === currentUserId;
      if (isFromMe) return;

      // Check if user is away from chat OR tab is in background
      const isDocumentHidden = typeof document !== 'undefined' && document.hidden;
      const isAwayFromChat = pathname !== '/chat';

      if (isNewMessageArrival && (isAwayFromChat || isDocumentHidden)) {
        const senderName =
          lastMsg.sender?.name ||
          lastMsg.sender?.email ||
          conv.display_name ||
          'Team Member';

        const bodyText =
          lastMsg.content ||
          (lastMsg.attachments?.length
            ? `[${lastMsg.attachments.length} attachment(s)]`
            : 'Sent a message');

        sendBrowserChatNotification({
          messageId: lastMsg.id,
          title: `${senderName} (${conv.display_name})`,
          body: bodyText,
          conversationId: conv.id,
          avatar: conv.avatar || conv.other_user?.avatar || lastMsg.sender?.avatar || lastMsg.sender?.profile_photo_url,
          playSound: true,
        });
      }
    });

    // Update unread title badge
    if (totalUnread > 0) {
      updateTabTitleBadge(totalUnread);
    } else {
      clearTabTitleBadge();
    }

    prevConversationsRef.current = currentMap;
  }, [conversations, pathname]);

  return null; // Headless component
};

export default GlobalChatNotificationListener;
