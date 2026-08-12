import apiClient from '../app/services/api';

export interface UserMinimal {
  id: string;
  username: string;
  email: string;
  name: string;
  is_active?: boolean;
  status?: string;
  employment_status?: string;
  profile_photo_url?: string;
  avatar?: string;
}

export interface Attachment {
  id: string;
  file: string;
  file_url: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

export interface Message {
  id: string;
  conversation: string;
  sender: UserMinimal;
  content: string | null;
  message_type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE' | 'SYSTEM';
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  attachments: Attachment[];
}

export interface ConversationMember {
  id: number;
  user: UserMinimal;
  role: 'ADMIN' | 'MEMBER';
  joined_at: string;
}

export interface Conversation {
  id: string;
  type: 'DIRECT' | 'GROUP';
  name: string | null;
  display_name: string;
  avatar: string | null;
  created_at: string;
  updated_at: string;
  members: ConversationMember[];
  last_message: Message | null;
  unread_count: number;
}

export const fetchConversations = async (): Promise<Conversation[]> => {
  const response = await apiClient.get('/api/v1/chat/conversations/');
  return response.data.results || response.data;
};

export const fetchMessages = async (conversationId: string, page = 1): Promise<{ results: Message[]; next: string | null }> => {
  const response = await apiClient.get(`/api/v1/chat/conversations/${conversationId}/messages/?page=${page}`);
  if (response.data.results) {
    return response.data;
  }
  return { results: response.data, next: null };
};

export const sendMessageWithAttachments = async (
  conversationId: string,
  content: string,
  files: File[] = []
): Promise<Message> => {
  const formData = new FormData();
  if (content) {
    formData.append('content', content);
  }
  files.forEach((file) => {
    formData.append('files', file);
  });

  const response = await apiClient.post(
    `/api/v1/chat/conversations/${conversationId}/send-message/`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
};

export const createDirectChat = async (targetUserId: string): Promise<Conversation> => {
  const response = await apiClient.post('/api/v1/chat/conversations/direct/', {
    target_user_id: targetUserId,
  });
  return response.data;
};

export const createGroupChat = async (name: string, memberIds: string[]): Promise<Conversation> => {
  const response = await apiClient.post('/api/v1/chat/conversations/group/', {
    name,
    member_ids: memberIds,
  });
  return response.data;
};

export const searchUsers = async (query: string): Promise<UserMinimal[]> => {
  const response = await apiClient.get(`/api/v1/chat/users/?search=${encodeURIComponent(query)}`);
  return response.data.results || response.data;
};

export const markConversationAsRead = async (conversationId: string): Promise<void> => {
  await apiClient.post(`/api/v1/chat/conversations/${conversationId}/read/`);
};

export const deleteMessage = async (conversationId: string, messageId: string): Promise<void> => {
  await apiClient.post(`/api/v1/chat/conversations/${conversationId}/delete-message/`, {
    message_id: messageId,
  });
};


export interface ChatWebSocketController {
  ws: WebSocket | null;
  close: () => void;
}

export const connectChatWebSocket = (
  conversationId: string,
  onMessage: (data: any) => void,
  onError?: (err: Event) => void
): ChatWebSocketController => {
  let isClosedManually = false;
  let activeWs: WebSocket | null = null;
  let reconnectTimeout: any = null;

  const connect = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!token || isClosedManually) return;

    const rawBackend = (process.env.NEXT_PUBLIC_API_ENDPOINT || 'http://127.0.0.1:8000').trim();
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    let host;
    try {
      const urlObj = new URL(rawBackend);
      host = urlObj.host;
      console.log('WebSocket connecting to:', host);
    } catch (e) {
      // If URL parsing fails, extract host from rawBackend string
      host = rawBackend.replace(/^https?:\/\//, '').replace(/\/$/, '');
      console.warn('Failed to parse backend URL, extracted host:', host, 'Error:', e);
    }

    const wsUrl = `${wsProtocol}//${host}/ws/chat/${conversationId}/?token=${encodeURIComponent(token)}`;
    console.log('Full WebSocket URL:', wsUrl);
    const ws = new WebSocket(wsUrl);
    activeWs = ws;

    ws.onopen = () => {
      console.log('WebSocket connection established successfully');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received WebSocket message:', data);
        onMessage(data);
      } catch (err) {
        console.error('Failed to parse WS message:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket error occurred:', err);
      if (onError) onError(err);
    };

    ws.onclose = (event) => {
      console.log('WebSocket closed with code:', event.code, 'reason:', event.reason);
      if (!isClosedManually && event.code !== 1000 && event.code !== 4001 && event.code !== 4003) {
        // Attempt auto-reconnect after 2s if closed unexpectedly
        console.log('Attempting to reconnect WebSocket...');
        reconnectTimeout = setTimeout(() => {
          connect();
        }, 2000);
      }
    };
  };

  connect();

  return {
    get ws() {
      return activeWs;
    },
    close: () => {
      isClosedManually = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (activeWs) {
        activeWs.close(1000, "Component unmounted");
      }
    },
  };
};