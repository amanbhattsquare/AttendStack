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
} from '../../helper/browserNotification';
import { preloadNotificationSound } from '../../helper/notificationSound';

export const GlobalChatNotificationListener: React.FC = () => {
  const pathname = usePathname();
  const prevConversationsRef = useRef<Record<string, { lastMsgId?: string; unread: number }>>({});
  const isFirstLoadRef = useRef(true);

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

    let totalUnread = 0;
    const currentMap: Record<string, { lastMsgId?: string; unread: number }> = {};

    conversations.forEach((conv) => {
      totalUnread += conv.unread_count || 0;
      currentMap[conv.id] = {
        lastMsgId: conv.last_message?.id,
        unread: conv.unread_count || 0,
      };

      // Check if there is a newly arrived message on an existing conversation
      if (!isFirstLoadRef.current) {
        const prev = prevConversationsRef.current[conv.id];
        const hasNewMessage =
          conv.last_message &&
          conv.last_message.id &&
          (!prev || prev.lastMsgId !== conv.last_message.id);

        // Check if message is from someone else (not myself)
        const isFromOther =
          conv.last_message &&
          conv.last_message.sender &&
          conv.other_user &&
          conv.last_message.sender.id === conv.other_user.id;

        // If user is on another page OR document is hidden (background tab)
        const isDocumentHidden = typeof document !== 'undefined' && document.hidden;
        const isAwayFromChat = pathname !== '/chat';

        if (hasNewMessage && (isAwayFromChat || isDocumentHidden)) {
          const senderName =
            conv.last_message?.sender?.name ||
            conv.last_message?.sender?.email ||
            conv.display_name ||
            'Team Member';
          const bodyText =
            conv.last_message?.content ||
            (conv.last_message?.attachments?.length
              ? `[${conv.last_message.attachments.length} attachment(s)]`
              : 'Sent a message');

          sendBrowserChatNotification({
            title: `${senderName} (${conv.display_name})`,
            body: bodyText,
            conversationId: conv.id,
            avatar: conv.avatar || conv.other_user?.avatar,
            playSound: true,
          });
        }
      }
    });

    // Update unread title badge
    if (totalUnread > 0) {
      updateTabTitleBadge(totalUnread);
    } else {
      clearTabTitleBadge();
    }

    prevConversationsRef.current = currentMap;
    isFirstLoadRef.current = false;
  }, [conversations, pathname]);

  return null; // Headless component
};

export default GlobalChatNotificationListener;
