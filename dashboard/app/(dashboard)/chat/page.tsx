"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Form,
  Button,
  Badge,
  Modal,
  InputGroup,
  Spinner,
  Image as BSImage,
  Dropdown,
  Row,
  Col,
} from "react-bootstrap";
import {
  Send,
  Paperclip,
  PlusCircle,
  Users,
  MessageSquare,
  Search,
  X,
  FileText,
  Video as VideoIcon,
  CheckCheck,
  ArrowLeft,
  MoreVertical,
  UserCheck,
  User,
  Sparkles,
  Trash2,
  CornerUpRight,
  Copy,
  Smile,
  Megaphone,
  Bell,
  Pin,
  AtSign,
} from "lucide-react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import {
  Conversation,
  Message,
  UserMinimal,
  fetchConversations,
  fetchMessages,
  sendMessageWithAttachments,
  createDirectChat,
  createGroupChat,
  searchUsers,
  markConversationAsRead,
  connectChatWebSocket,
  deleteMessage,
  clearChatHistory,
  sendAnnouncement,
  acknowledgeAnnouncement,
} from "../../../helper/chatApi";

// Redux for sidebar control
import { useAppDispatch } from "store/store";
import { setCollapsed } from "store/slices/appSlice";

// Avatar colors – solid, professional palette
const getAvatarColor = (name: string) => {
  const solidColors = [
    "#6366f1", // Indigo
    "#3b82f6", // Blue
    "#0ea5e9", // Sky
    "#14b8a6", // Teal
    "#f59e0b", // Amber
    "#ec4899", // Pink
    "#8b5cf6", // Violet
    "#10b981", // Emerald
    "#f97316", // Orange
    "#06b6d4", // Cyan
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return solidColors[Math.abs(hash) % solidColors.length];
};

// Format message timestamp
const formatMessageTime = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    if (isToday) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    if (isYesterday) {
      return "Yesterday " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return (
      d.toLocaleDateString([], { month: "short", day: "numeric" }) +
      " " +
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  } catch {
    return "";
  }
};

// Format last message time for sidebar
const formatSidebarTime = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    if (isToday) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    if (isYesterday) return "Yesterday";
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "";
  }
};

// Date separator helper
const getDateLabel = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return "Today";
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
  } catch {
    return "";
  }
};

export default function ChatPage() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // View state: which panel is visible on mobile
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  // Message input state
  const [inputContent, setInputContent] = useState<string>("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<{ url: string; type: string; name: string; size: string }[]>([]);

  // Search, Filter and Modal states
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [convFilter, setConvFilter] = useState<"all" | "direct" | "group">("all");
  const [showDirectModal, setShowDirectModal] = useState<boolean>(false);
  const [showGroupModal, setShowGroupModal] = useState<boolean>(false);
  const [userSearchResults, setUserSearchResults] = useState<UserMinimal[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState<boolean>(false);
  const [userQuery, setUserQuery] = useState<string>("");

  // Group creation state
  const [groupName, setGroupName] = useState<string>("");
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<UserMinimal[]>([]);

  // Media preview lightbox
  const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null);

  // Typing indicator state
  const [typingUser, setTypingUser] = useState<string | null>(null);

  // Forward message state
  const [forwardMsg, setForwardMsg] = useState<Message | null>(null);
  const [forwardSearch, setForwardSearch] = useState<string>("");
  const [forwardedConvIds, setForwardedConvIds] = useState<string[]>([]);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  // Emoji picker state
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Clear Chat modal & state
  const [showClearModal, setShowClearModal] = useState<boolean>(false);
  const clearChatMutation = useMutation({
    mutationFn: () => clearChatHistory(activeConversation!.id),
    onSuccess: () => {
      setShowClearModal(false);
      refetchMessages();
      refetchConversations();
    },
  });

  // Announcement modal & state
  const [showAnnouncementModal, setShowAnnouncementModal] = useState<boolean>(false);
  const [announcementText, setAnnouncementText] = useState<string>("");
  const [announcementTarget, setAnnouncementTarget] = useState<string>("EVERYONE");
  const [announcementDept, setAnnouncementDept] = useState<string>("");
  const [announcementPinned, setAnnouncementPinned] = useState<boolean>(true);
  const [announcementRequiresAck, setAnnouncementRequiresAck] = useState<boolean>(true);

  const sendAnnouncementMutation = useMutation({
    mutationFn: () =>
      sendAnnouncement({
        content: announcementText.trim(),
        target_type: announcementTarget,
        department_target: announcementDept.trim(),
        pinned: announcementPinned,
        requires_acknowledgement: announcementRequiresAck,
      }),
    onSuccess: () => {
      setShowAnnouncementModal(false);
      setAnnouncementText("");
      refetchConversations();
      refetchMessages();
    },
  });

  // Acknowledge Announcement mutation
  const acknowledgeMutation = useMutation({
    mutationFn: (messageId: string) => acknowledgeAnnouncement(messageId),
    onSuccess: () => {
      refetchMessages();
    },
  });

  // Group @Mentions state
  const [showMentionSuggestions, setShowMentionSuggestions] = useState<boolean>(false);
  const [mentionQuery, setMentionQuery] = useState<string>("");

  const EMOJI_LIST = [
    "😊", "😂", "🥰", "😍", "😎", "😅", "🤔", "🥳",
    "👍", "👏", "🙌", "🙏", "❤️", "🔥", "✨", "🎉",
    "🚀", "💡", "💯", "✅", "⭐", "📌", "💬", "🤝",
    "😭", "🙈", "💪", "✌️", "👌", "🎯", "🌟", "⚡"
  ];

  const handleSelectEmoji = (emoji: string) => {
    setInputContent((prev) => prev + emoji);
    setShowEmojiPicker(false);
    if (inputRef.current) {
      inputRef.current.focus();
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.style.height = "auto";
          const newHeight = Math.min(inputRef.current.scrollHeight, 150);
          inputRef.current.style.height = `${newHeight}px`;
        }
      }, 50);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCopyMessage = (msgId: string, content: string | null) => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  // Current user info & DP & role
  const [currentUserId, setCurrentUserId] = useState<string | number | null>(null);
  const [myProfilePhoto, setMyProfilePhoto] = useState<string | null>(null);
  const [myUserName, setMyUserName] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<any>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Collapse the main sidebar when chat page mounts, restore on unmount
  useEffect(() => {
    dispatch(setCollapsed({ value: "collapsed" }));
    document.querySelector("html")?.setAttribute("class", "collapsed");
    return () => {
      dispatch(setCollapsed({ value: "expanded" }));
      document.querySelector("html")?.setAttribute("class", "expanded");
    };
  }, [dispatch]);

  // Load current user and fetch DP (profile photo)
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const storedUser = localStorage.getItem("user");
        const token = localStorage.getItem("authToken");
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          if (parsed?.id) setCurrentUserId(parsed.id);
          if (parsed?.role) setUserRole(parsed.role);
          if (parsed?.full_name || parsed?.name || parsed?.username) {
            setMyUserName(parsed.full_name || parsed.name || parsed.username);
          }

          if (token) {
            if (parsed.role === "EMPLOYEE") {
              const res = await fetch(`${process.env.NEXT_PUBLIC_API_ENDPOINT}/api/v1/employees/me/`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.ok) {
                const data = await res.json();
                if (data.profile_photo_url) setMyProfilePhoto(data.profile_photo_url);
              }
            } else {
              const res = await fetch(`${process.env.NEXT_PUBLIC_API_ENDPOINT}/api/v1/accounts/profile/`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.ok) {
                const data = await res.json();
                if (data.avatar) setMyProfilePhoto(data.avatar);
                else if (data.profile_photo_url) setMyProfilePhoto(data.profile_photo_url);
              }
            }
          }
        }
      } catch (e) {
        console.error("Error reading stored user or profile photo:", e);
      }
    };
    loadUserData();
  }, []);

  // TanStack Query: Fetch Conversations
  const {
    data: conversations = [],
    isLoading: loadingConversations,
    refetch: refetchConversations,
  } = useQuery({
    queryKey: ["conversations"],
    queryFn: fetchConversations,
  });

  // Auto-select first conversation if none active
  useEffect(() => {
    if (conversations.length > 0 && !activeConversationId) {
      setActiveConversationId(conversations[0].id);
    }
  }, [conversations, activeConversationId]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) || null,
    [conversations, activeConversationId]
  );

  const filteredMentionMembers = useMemo(() => {
    if (!activeConversation?.members) return [];
    return activeConversation.members
      .map((m) => m.user)
      .filter((u) => {
        const name = (u.name || u.email).toLowerCase();
        return name.includes(mentionQuery);
      });
  }, [activeConversation, mentionQuery]);

  // TanStack Query: Fetch Messages for active conversation
  const {
    data: messagesData,
    isLoading: loadingMessages,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: ["messages", activeConversationId],
    queryFn: async () => {
      if (!activeConversationId) return [];
      const res = await fetchMessages(activeConversationId);
      markConversationAsRead(activeConversationId);
      // Reset unread count locally in query cache
      queryClient.setQueryData<Conversation[]>(["conversations"], (old = []) =>
        old.map((c) => (c.id === activeConversationId ? { ...c, unread_count: 0 } : c))
      );
      return (res.results || []).slice().reverse();
    },
    enabled: !!activeConversationId,
  });

  const messages = useMemo(() => messagesData || [], [messagesData]);

  // Scroll to bottom on new messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUser, scrollToBottom]);

  // WebSocket Connection with query cache mutation
  useEffect(() => {
    if (!activeConversationId) return;

    if (wsRef.current) {
      wsRef.current.close();
    }

    const controller = connectChatWebSocket(activeConversationId, (data) => {
      console.log('Received WebSocket data in chat page:', data);
      if (data.type === "new_message") {
        const newMsg: Message = data.message;
        console.log('Adding new message to cache:', newMsg);

        // Append to current messages query cache
        queryClient.setQueryData<Message[]>(["messages", activeConversationId], (old = []) => {
          if (old.some((m) => m.id === newMsg.id)) return old;
          return [...old, newMsg];
        });

        // Update conversation list last_message
        queryClient.setQueryData<Conversation[]>(["conversations"], (old = []) =>
          old.map((c) =>
            c.id === activeConversationId
              ? { ...c, last_message: newMsg, updated_at: new Date().toISOString() }
              : c
          )
        );
      } else if (data.type === "message_deleted") {
        queryClient.setQueryData<Message[]>(["messages", activeConversationId], (old = []) =>
          old.filter((m) => m.id !== data.message_id)
        );
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      } else if (data.type === "typing") {
        if (data.is_typing) {
          setTypingUser(data.username);
          setTimeout(() => setTypingUser(null), 3000);
        } else {
          setTypingUser(null);
        }
      }
    }, (err) => {
      console.error('WebSocket error in chat page:', err);
    });

    wsRef.current = controller;

    // Cleanup function to close WebSocket when unmounting or conversation changes
    return () => {
      if (wsRef.current) {
        console.log('Cleaning up WebSocket connection');
        wsRef.current.close();
      }
    };
  }, [activeConversationId, queryClient]);

  // Select conversation
  const selectConversation = (conv: Conversation) => {
    setActiveConversationId(conv.id);
    setMobileView("chat");
  };

  // TanStack Mutation: Delete Message
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      if (!activeConversationId) return;
      await deleteMessage(activeConversationId, messageId);
    },
    onSuccess: (_, messageId) => {
      if (!activeConversationId) return;
      queryClient.setQueryData<Message[]>(["messages", activeConversationId], (old = []) =>
        old.filter((m) => m.id !== messageId)
      );
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const handleDeleteMessage = (messageId: string) => {
    if (window.confirm("Are you sure you want to delete this message?")) {
      deleteMessageMutation.mutate(messageId);
    }
  };

  // TanStack Mutation: Forward Message
  const forwardMessageMutation = useMutation({
    mutationFn: async ({ targetConvId, content }: { targetConvId: string; content: string }) => {
      return await sendMessageWithAttachments(targetConvId, content, []);
    },
    onSuccess: (newMsg, variables) => {
      setForwardedConvIds((prev) => [...prev, variables.targetConvId]);
      queryClient.setQueryData<Message[]>(["messages", variables.targetConvId], (old = []) => {
        if (old.some((m) => m.id === newMsg.id)) return old;
        return [...old, newMsg];
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const handleForwardToConv = (convId: string) => {
    if (!forwardMsg) return;
    let contentToForward = forwardMsg.content || "";
    if (forwardMsg.attachments && forwardMsg.attachments.length > 0) {
      const attUrls = forwardMsg.attachments.map((att) => att.file_url).join("\n");
      contentToForward = contentToForward ? `${contentToForward}\n${attUrls}` : attUrls;
    }
    if (!contentToForward.trim()) contentToForward = "[Forwarded attachment]";

    forwardMessageMutation.mutate({ targetConvId: convId, content: contentToForward });
  };

  // TanStack Mutation: Send Message
  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!activeConversationId || (!inputContent.trim() && selectedFiles.length === 0)) return;
      return await sendMessageWithAttachments(
        activeConversationId,
        inputContent.trim(),
        selectedFiles
      );
    },
    onSuccess: (newMsg) => {
      if (!newMsg || !activeConversationId) return;

      setInputContent("");
      setSelectedFiles([]);
      setFilePreviews([]);

      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }

      // Update message cache instantly
      queryClient.setQueryData<Message[]>(["messages", activeConversationId], (old = []) => {
        if (old.some((m) => m.id === newMsg.id)) return old;
        return [...old, newMsg];
      });

      // Update conversations cache
      queryClient.setQueryData<Conversation[]>(["conversations"], (old = []) =>
        old.map((c) =>
          c.id === activeConversationId
            ? { ...c, last_message: newMsg, updated_at: new Date().toISOString() }
            : c
        )
      );
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    setSelectedFiles((prev) => [...prev, ...files]);

    const newPreviews = files.map((file) => ({
      url: URL.createObjectURL(file),
      type: file.type,
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
    }));
    setFilePreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setFilePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!sending) sendMessageMutation.mutate();
  };

  const sending = sendMessageMutation.isPending;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Search users
  const handleSearchUsers = async (q: string) => {
    setUserQuery(q);
    setUserSearchLoading(true);
    try {
      const results = await searchUsers(q);
      setUserSearchResults(results);
    } catch (err) {
      console.error("Search users error:", err);
    } finally {
      setUserSearchLoading(false);
    }
  };

  // Direct chat creation mutation
  const createDirectChatMutation = useMutation({
    mutationFn: (user: UserMinimal) => createDirectChat(user.id),
    onSuccess: (conv) => {
      setShowDirectModal(false);
      refetchConversations();
      selectConversation(conv);
    },
  });

  // Group chat creation mutation
  const createGroupChatMutation = useMutation({
    mutationFn: () => {
      const memberIds = selectedGroupMembers.map((m) => m.id);
      return createGroupChat(groupName.trim(), memberIds);
    },
    onSuccess: (conv) => {
      setShowGroupModal(false);
      setGroupName("");
      setSelectedGroupMembers([]);
      refetchConversations();
      selectConversation(conv);
    },
  });

  const openDirectModal = () => {
    setShowDirectModal(true);
    setUserQuery("");
    handleSearchUsers("");
  };

  const openGroupModal = () => {
    if (userRole === "EMPLOYEE") {
      alert("Only Administrators and HR Managers are authorized to create group chats.");
      return;
    }
    setShowGroupModal(true);
    setGroupName("");
    setSelectedGroupMembers([]);
    setUserQuery("");
    handleSearchUsers("");
  };

  const filteredConversations = useMemo(
    () =>
      conversations.filter((c) => {
        const matchesSearch = (c.display_name || c.name || "").toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;
        if (convFilter === "direct") return c.type === "DIRECT";
        if (convFilter === "group") return c.type === "GROUP";
        return true;
      }),
    [conversations, searchQuery, convFilter]
  );

  // Active members only filter for user search
  const activeUserSearchResults = useMemo(() => {
    return userSearchResults.filter((u) => {
      if (u.is_active === false) return false;
      if (u.status && u.status.toUpperCase() !== "ACTIVE") return false;
      if (u.employment_status && u.employment_status.toUpperCase() !== "ACTIVE") return false;
      return true;
    });
  }, [userSearchResults]);

  // Helper to render text with highlighted @mentions
  const renderTextWithMentions = (content: string) => {
    if (!content) return null;
    const parts = content.split(/(@[A-Za-z0-9._-]+(?:\s+[A-Za-z0-9._-]+)?)/g);
    return parts.map((part, idx) => {
      if (part.startsWith("@")) {
        return (
          <span
            key={idx}
            className="badge bg-primary-subtle text-primary border border-primary-subtle font-monospace fw-bold px-2 py-0.5 me-1 rounded-pill"
            style={{ fontSize: "11px" }}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  // Input change handler supporting @mentions
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputContent(val);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPos);
    const words = textBeforeCursor.split(/\s+/);
    const lastWord = words[words.length - 1];

    if (lastWord.startsWith("@") && activeConversation?.type === "GROUP") {
      setMentionQuery(lastWord.slice(1).toLowerCase());
      setShowMentionSuggestions(true);
    } else {
      setShowMentionSuggestions(false);
    }
  };

  const handleSelectMentionMember = (member: UserMinimal) => {
    const memberName = member.name || member.email;
    const words = inputContent.split(/\s+/);
    words.pop();
    const newText = [...words, `@${memberName}`].join(" ") + " ";
    setInputContent(newText);
    setShowMentionSuggestions(false);
    if (inputRef.current) inputRef.current.focus();
  };

  // Render date separators & message bubbles in clean flex container
  const renderMessagesWithDateSeparators = () => {
    const elements: React.ReactNode[] = [];
    let lastDateLabel = "";

    messages.forEach((msg) => {
      const dateLabel = getDateLabel(msg.created_at);
      if (dateLabel !== lastDateLabel) {
        lastDateLabel = dateLabel;
        elements.push(
          <div key={`date-${dateLabel}-${msg.id}`} className="chat-date-separator">
            <span>{dateLabel}</span>
          </div>
        );
      }

      const isMe = String(msg.sender?.id) === String(currentUserId);
      const timeStr = formatMessageTime(msg.created_at);

      const canDelete = isMe || activeConversation?.members?.some((m) => String(m.user.id) === String(currentUserId) && m.role === "ADMIN");

      const messageActionsMenu = (
        <Dropdown className="chat-msg-actions-dropdown" align="end">
          <Dropdown.Toggle variant="light" size="sm" className="chat-msg-more-btn no-caret border-0">
            <MoreVertical size={13} />
          </Dropdown.Toggle>
          <Dropdown.Menu className="shadow-sm border rounded-3 py-1" style={{ minWidth: "130px" }}>
            {msg.content && (
              <Dropdown.Item
                className="d-flex align-items-center gap-2 text-secondary px-3 py-1.5"
                onClick={() => handleCopyMessage(msg.id, msg.content)}
              >
                <Copy size={14} />
                <span>{copiedMsgId === msg.id ? "Copied!" : "Copy"}</span>
              </Dropdown.Item>
            )}
            <Dropdown.Item
              className="d-flex align-items-center gap-2 text-secondary px-3 py-1.5"
              onClick={() => {
                setForwardMsg(msg);
                setForwardSearch("");
                setForwardedConvIds([]);
              }}
            >
              <CornerUpRight size={14} />
              <span>Forward</span>
            </Dropdown.Item>
            {canDelete && (
              <Dropdown.Item
                className="d-flex align-items-center gap-2 text-danger px-3 py-1.5"
                onClick={() => handleDeleteMessage(msg.id)}
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </Dropdown.Item>
            )}
          </Dropdown.Menu>
        </Dropdown>
      );

      const senderPhoto = (msg.sender as any)?.profile_photo_url || (msg.sender as any)?.avatar || (isMe ? myProfilePhoto : null);

      elements.push(
        <div
          key={msg.id}
          className={`chat-message-row ${isMe ? "sent" : "received"}`}
        >
          {/* Avatar for received messages */}
          {!isMe && (
            <div
              className="chat-msg-avatar"
              style={{
                backgroundColor: getAvatarColor(msg.sender?.name || msg.sender?.email || "U"),
              }}
              title={msg.sender?.name || msg.sender?.email || "User"}
            >
              {senderPhoto ? (
                <BSImage src={senderPhoto} className="w-100 h-100 rounded-circle" style={{ objectFit: "cover" }} />
              ) : (
                (msg.sender?.name || msg.sender?.email || "U")[0].toUpperCase()
              )}
            </div>
          )}

          <div className={`chat-bubble ${isMe ? "bubble-sent" : "bubble-received"}`}>
            {/* Top-right 3-dots action menu */}
            {messageActionsMenu}

            {/* Sender name for group chat */}
            {!isMe && activeConversation?.type === "GROUP" && (
              <span className="chat-sender-name">
                {msg.sender?.name || msg.sender?.email}
              </span>
            )}

            {/* Announcement Banner or Regular Text */}
            {msg.is_announcement ? (
              <div
                className="p-3 mb-1 rounded-3 border w-100"
                style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #e0e7ff 100%)", borderColor: "#a5b4fc" }}
              >
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div className="d-flex align-items-center gap-2">
                    <Megaphone size={16} className="text-primary" />
                    <span className="fw-bold text-dark small text-uppercase" style={{ letterSpacing: "0.05em" }}>
                      Company Announcement
                    </span>
                  </div>
                  {msg.pinned && (
                    <span className="badge bg-primary-subtle text-primary rounded-pill px-2" style={{ fontSize: "10px" }}>
                      Pinned
                    </span>
                  )}
                </div>
                <p className="mb-2 text-dark fw-medium" style={{ fontSize: "14px", lineHeight: "1.5" }}>
                  {renderTextWithMentions(msg.content || "")}
                </p>
                {msg.requires_acknowledgement && (
                  <div className="d-flex align-items-center justify-content-between pt-2 border-top mt-1">
                    <small className="text-muted" style={{ fontSize: "11px" }}>
                      {msg.acknowledged_count || 0} acknowledged
                    </small>
                    {msg.is_acknowledged_by_me ? (
                      <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2 py-1" style={{ fontSize: "11px" }}>
                        Acknowledged
                      </span>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        className="rounded-pill px-3 border-0"
                        style={{ backgroundColor: "#6366f1", fontSize: "12px" }}
                        onClick={() => acknowledgeMutation.mutate(msg.id)}
                        disabled={acknowledgeMutation.isPending}
                      >
                        Acknowledge
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              msg.content && !msg.is_deleted && (
                <p className="chat-text">{renderTextWithMentions(msg.content)}</p>
              )
            )}

            {/* Deleted message placeholder */}
            {msg.is_deleted && (
              <p className="chat-text fst-italic text-muted" style={{ fontSize: "13px" }}>
                This message was deleted
              </p>
            )}

            {/* Attachments */}
            {msg.attachments && msg.attachments.length > 0 && (
              <div className="chat-attachments">
                {msg.attachments.map((att) => {
                  const isImg = att.file_type?.startsWith("image/");
                  const isVid = att.file_type?.startsWith("video/");

                  if (isImg) {
                    return (
                      <div
                        key={att.id}
                        className="chat-att-image"
                        onClick={() => setPreviewMediaUrl(att.file_url)}
                      >
                        <BSImage
                          src={att.file_url}
                          alt="attachment"
                          className="w-100"
                          style={{
                            maxHeight: "220px",
                            objectFit: "contain",
                            borderRadius: "8px",
                            cursor: "pointer",
                            backgroundColor: "rgba(0,0,0,0.03)",
                          }}
                        />
                      </div>
                    );
                  }

                  if (isVid) {
                    return (
                      <div key={att.id} className="chat-att-video">
                        <video
                          controls
                          className="w-100"
                          style={{ maxHeight: "220px", borderRadius: "8px" }}
                        >
                          <source src={att.file_url} type={att.file_type || "video/mp4"} />
                        </video>
                      </div>
                    );
                  }

                  return (
                    <a
                      key={att.id}
                      href={att.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="chat-att-file"
                    >
                      <FileText size={16} />
                      <div className="chat-att-file-info">
                        <span className="chat-att-file-name">Attachment</span>
                        <small>{(att.file_size / (1024 * 1024)).toFixed(2)} MB</small>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}

            {/* Bottom metadata (timestamp + status checks) */}
            <div className="chat-bubble-meta">
              <span className="chat-time">{timeStr}</span>
              {isMe && <CheckCheck size={13} className="chat-read-icon" />}
            </div>
          </div>

          {/* My DP Avatar for sent messages */}
          {isMe && (
            <div
              className="chat-msg-avatar chat-msg-avatar-sent"
              style={{
                backgroundColor: getAvatarColor(msg.sender?.name || myUserName || "Me"),
              }}
              title={myUserName || "You"}
            >
              {myProfilePhoto ? (
                <BSImage src={myProfilePhoto} alt="My DP" className="w-100 h-100 rounded-circle" style={{ objectFit: "cover" }} />
              ) : (
                (msg.sender?.name || myUserName || "M")[0].toUpperCase()
              )}
            </div>
          )}
        </div>
      );
    });

    return elements;
  };

  return (
    <>
      <div className="chat-app-container">
        {/* === LEFT PANEL: Conversation List === */}
        <div className={`chat-sidebar ${mobileView === "list" ? "mobile-show" : "mobile-hide"}`}>
          {/* Sidebar Header */}
          <div className="chat-sidebar-header">
            <div className="chat-sidebar-title-row">
              <div className="chat-sidebar-title d-flex align-items-center gap-2">
                {myProfilePhoto ? (
                  <BSImage
                    src={myProfilePhoto}
                    alt="My DP"
                    className="rounded-circle shadow-sm border border-2 border-white flex-shrink-0"
                    style={{ width: "38px", height: "38px", objectFit: "cover" }}
                  />
                ) : (
                  <div
                    className="rounded-circle shadow-sm border border-2 border-white flex-shrink-0 d-flex align-items-center justify-content-center fw-bold text-white"
                    style={{
                      width: "38px",
                      height: "38px",
                      backgroundColor: getAvatarColor(myUserName || "User"),
                      fontSize: "14px",
                    }}
                  >
                    {(myUserName || "U")[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 className="mb-0 fs-5 fw-bold text-dark">Chats</h2>
                  <span className="chat-count text-muted small">{conversations.length} conversations</span>
                </div>
              </div>
              <div className="chat-sidebar-actions">
                <button className="chat-icon-btn" title="New Direct Message" onClick={openDirectModal}>
                  <PlusCircle size={20} />
                </button>
                {userRole !== "EMPLOYEE" && (
                  <button className="chat-icon-btn text-warning" title="Send Company Announcement" onClick={() => setShowAnnouncementModal(true)}>
                    <Megaphone size={18} />
                  </button>
                )}
                {userRole !== "EMPLOYEE" ? (
                  <button className="chat-icon-btn accent" title="Create Group Chat" onClick={openGroupModal}>
                    <Users size={20} />
                  </button>
                ) : (
                  <button
                    className="chat-icon-btn opacity-50"
                    title="Only Admins can create group chats"
                    onClick={() => alert("Only Administrators and HR Managers are authorized to create group chats.")}
                  >
                    <Users size={20} />
                  </button>
                )}
              </div>
            </div>

            {/* Search */}
            <div className="chat-search-box">
              <Search size={16} className="chat-search-icon" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="chat-search-clear" onClick={() => setSearchQuery("")}>
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Conversation List */}
          <div className="chat-conv-list">
            {loadingConversations ? (
              <div className="chat-empty-state">
                <Spinner animation="border" variant="primary" size="sm" />
                <p>Loading chats...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="chat-empty-state">
                <div className="chat-empty-icon">
                  <MessageSquare size={28} />
                </div>
                <h6>No conversations yet</h6>
                <p>Start a new chat with your team</p>
                <Button variant="outline-primary" size="sm" className="rounded-pill px-3" onClick={openDirectModal}>
                  Start Chat
                </Button>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isActive = activeConversationId === conv.id;
                const avatarBg = getAvatarColor(conv.display_name || "Chat");
                return (
                  <div
                    key={conv.id}
                    onClick={() => selectConversation(conv)}
                    className={`chat-conv-item ${isActive ? "active" : ""}`}
                  >
                    <div className="chat-conv-avatar-wrap">
                      <div
                        className="chat-conv-avatar"
                        style={{ backgroundColor: avatarBg }}
                      >
                        {conv.avatar ? (
                          <BSImage src={conv.avatar} alt="avatar" className="w-100 h-100 rounded-circle" style={{ objectFit: "cover" }} />
                        ) : conv.type === "GROUP" ? (
                          <Users size={18} />
                        ) : (
                          (conv.display_name || "U")[0].toUpperCase()
                        )}
                      </div>
                      {conv.type === "DIRECT" && (
                        <span className="chat-online-dot" />
                      )}
                    </div>

                    <div className="chat-conv-info">
                      <div className="chat-conv-top">
                        <span className="chat-conv-name">{conv.display_name}</span>
                        <span className="chat-conv-time">
                          {conv.last_message ? formatSidebarTime(conv.last_message.created_at) : ""}
                        </span>
                      </div>
                      <div className="chat-conv-bottom">
                        <span className="chat-conv-preview">
                          {conv.last_message ? (
                            conv.last_message.content || `[${conv.last_message.message_type}]`
                          ) : (
                            <em>No messages yet</em>
                          )}
                        </span>
                        {conv.unread_count > 0 && (
                          <span className="chat-unread-badge">{conv.unread_count}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* === RIGHT PANEL: Chat Area === */}
        <div className={`chat-main ${mobileView === "chat" ? "mobile-show" : "mobile-hide"}`}>
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div className="chat-header">
                <div className="chat-header-left">
                  <button
                    className="chat-back-btn"
                    onClick={() => setMobileView("list")}
                  >
                    <ArrowLeft size={20} />
                  </button>

                  <div
                    className="chat-header-avatar"
                    style={{ backgroundColor: getAvatarColor(activeConversation.display_name || "Chat") }}
                  >
                    {activeConversation.avatar ? (
                      <BSImage src={activeConversation.avatar} alt="avatar" className="w-100 h-100 rounded-circle" style={{ objectFit: "cover" }} />
                    ) : activeConversation.type === "GROUP" ? (
                      <Users size={18} />
                    ) : (
                      (activeConversation.display_name || "C")[0].toUpperCase()
                    )}
                  </div>

                  <div className="chat-header-info">
                    <h3>{activeConversation.display_name}</h3>
                    <span className="chat-header-meta">
                      {activeConversation.type === "GROUP"
                        ? `${activeConversation.members.length} members`
                        : "Online"}
                    </span>
                  </div>
                </div>

                <div className="chat-header-right">
                  <Dropdown align="end">
                    <Dropdown.Toggle variant="light" size="sm" className="chat-icon-btn no-caret border-0">
                      <MoreVertical size={18} />
                    </Dropdown.Toggle>
                    <Dropdown.Menu className="shadow-sm border rounded-3">
                      <Dropdown.Item onClick={() => refetchMessages()}>
                        Refresh Messages
                      </Dropdown.Item>
                      {/* {userRole !== "EMPLOYEE" && (
                        <Dropdown.Item onClick={() => setShowAnnouncementModal(true)}>
                          <Megaphone size={14} className="me-2 text-primary" /> Broadcast Announcement
                        </Dropdown.Item>
                      )} */}
                      <Dropdown.Item className="text-danger" onClick={() => setShowClearModal(true)}>
                        Clear Chat History
                      </Dropdown.Item>
                      <Dropdown.Item onClick={() => setMobileView("list")}>
                        Back to Conversations
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                </div>
              </div>

              {/* Messages Flex Scroll Area */}
              <div className="chat-messages-area">
                {loadingMessages ? (
                  <div className="chat-empty-state">
                    <Spinner animation="border" variant="primary" />
                    <p>Loading messages...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="chat-empty-state" style={{ marginTop: "auto", marginBottom: "auto" }}>
                    <div className="chat-empty-icon accent">
                      <Sparkles size={32} />
                    </div>
                    <h6>No messages yet</h6>
                    <p>Send a message to start the conversation with {activeConversation.display_name}</p>
                  </div>
                ) : (
                  <div className="chat-messages-flex">
                    {renderMessagesWithDateSeparators()}
                    <div ref={messagesEndRef} />
                  </div>
                )}

                {/* Typing Indicator */}
                {typingUser && (
                  <div className="chat-typing-indicator">
                    <div className="chat-typing-dots">
                      <span /><span /><span />
                    </div>
                    <span>{typingUser} is typing...</span>
                  </div>
                )}
              </div>

              {/* File Previews */}
              {filePreviews.length > 0 && (
                <div className="chat-file-previews">
                  {filePreviews.map((file, idx) => (
                    <div key={idx} className="chat-file-preview-item">
                      {file.type.startsWith("image/") ? (
                        <BSImage
                          src={file.url}
                          alt="preview"
                          style={{ width: "40px", height: "40px", objectFit: "cover", borderRadius: "6px" }}
                        />
                      ) : file.type.startsWith("video/") ? (
                        <div className="chat-file-preview-icon video">
                          <VideoIcon size={16} />
                        </div>
                      ) : (
                        <div className="chat-file-preview-icon doc">
                          <FileText size={16} />
                        </div>
                      )}
                      <div className="chat-file-preview-info">
                        <span className="chat-file-preview-name">{file.name}</span>
                        <small>{file.size}</small>
                      </div>
                      <button className="chat-file-preview-remove" onClick={() => removeFile(idx)}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Message Input Area */}
              <div className="chat-input-area position-relative">
                {/* Floating Mention Suggestions Overlay */}
                {showMentionSuggestions && filteredMentionMembers.length > 0 && (
                  <div className="mention-suggestions-popup shadow-lg rounded-3 border bg-white p-2 mb-2" style={{ maxHeight: "180px", overflowY: "auto", position: "absolute", bottom: "100%", left: "16px", zIndex: 1050, minWidth: "220px" }}>
                    <small className="text-muted fw-semibold d-block px-2 py-1 border-bottom mb-1" style={{ fontSize: "11px" }}>
                      Mention Group Member:
                    </small>
                    {filteredMentionMembers.map((user) => (
                      <div
                        key={user.id}
                        className="d-flex align-items-center gap-2 p-2 rounded-2 hover-bg-light cursor-pointer"
                        onClick={() => handleSelectMentionMember(user)}
                      >
                        <div
                          className="rounded-circle text-white fw-bold d-flex align-items-center justify-content-center"
                          style={{ width: "24px", height: "24px", fontSize: "11px", backgroundColor: getAvatarColor(user.name || user.email) }}
                        >
                          {(user.name || user.email)[0].toUpperCase()}
                        </div>
                        <span className="small fw-semibold text-dark">{user.name || user.email}</span>
                      </div>
                    ))}
                  </div>
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  className="d-none"
                  multiple
                  accept="image/*,video/*,.pdf,.doc,.docx"
                  onChange={handleFileSelect}
                />

                {/* Attach file button */}
                <button
                  className="chat-input-icon-btn"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach file"
                >
                  <Paperclip size={20} />
                </button>

                {/* Emoji picker button & popover */}
                <div className="chat-emoji-wrapper" ref={emojiPickerRef}>
                  <button
                    className={`chat-input-icon-btn ${showEmojiPicker ? "active" : ""}`}
                    onClick={() => setShowEmojiPicker((prev) => !prev)}
                    title="Add emoji"
                  >
                    <Smile size={20} />
                  </button>

                  {showEmojiPicker && (
                    <div className="chat-emoji-popover">
                      <div className="chat-emoji-header">
                        <span>Select Emoji</span>
                        <button className="chat-emoji-close" onClick={() => setShowEmojiPicker(false)}>
                          <X size={14} />
                        </button>
                      </div>
                      <div className="chat-emoji-grid">
                        {EMOJI_LIST.map((emoji, idx) => (
                          <button
                            key={idx}
                            className="chat-emoji-btn"
                            onClick={() => handleSelectEmoji(emoji)}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Textarea wrapper with auto-expand */}
                <div className="chat-input-wrapper">
                  <textarea
                    ref={inputRef}
                    placeholder="Type a message..."
                    value={inputContent}
                    onChange={(e) => {
                      setInputContent(e.target.value);
                      const textarea = e.target;
                      textarea.style.height = "auto";
                      const newHeight = Math.min(textarea.scrollHeight, 150);
                      textarea.style.height = `${newHeight}px`;
                    }}
                    onKeyDown={handleKeyDown}
                    disabled={sending}
                    rows={1}
                  />
                </div>

                <button
                  className={`chat-send-btn ${(inputContent.trim() || selectedFiles.length > 0) ? "active" : ""}`}
                  onClick={() => handleSendMessage()}
                  disabled={sending || (!inputContent.trim() && selectedFiles.length === 0)}
                >
                  {sending ? <Spinner animation="border" size="sm" /> : <Send size={18} />}
                </button>
              </div>
            </>
          ) : (
            /* No conversation selected placeholder */
            <div className="chat-no-selection">
              <div className="chat-no-selection-content">
                <div className="chat-empty-icon large">
                  <MessageSquare size={48} />
                </div>
                <h4>Welcome to Chat</h4>
                <p>Select a conversation or start a new one to begin messaging your team.</p>
                <Button
                  variant="primary"
                  className="rounded-pill px-4 border-0 mt-2"
                  style={{ backgroundColor: "#6366f1" }}
                  onClick={openDirectModal}
                >
                  <PlusCircle size={18} className="me-2" /> Start New Chat
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* NEW DIRECT CHAT MODAL */}
      <Modal show={showDirectModal} onHide={() => setShowDirectModal(false)} centered>
        <Modal.Header closeButton className="border-bottom-0 pb-0">
          <Modal.Title className="h6 fw-bold text-dark d-flex align-items-center gap-2">
            <UserCheck size={20} className="text-primary" /> New Direct Message
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-3">
          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold text-muted">Search Active Employees</Form.Label>
            <InputGroup className="bg-light rounded-3 border">
              <InputGroup.Text className="bg-transparent border-0">
                <Search size={16} className="text-muted" />
              </InputGroup.Text>
              <Form.Control
                placeholder="Search active members by name or email..."
                className="bg-transparent border-0 shadow-none small"
                value={userQuery}
                onChange={(e) => handleSearchUsers(e.target.value)}
              />
            </InputGroup>
          </Form.Group>

          {userSearchLoading ? (
            <div className="text-center py-4">
              <Spinner animation="border" size="sm" variant="primary" />
              <p className="text-muted small mt-2">Fetching active members...</p>
            </div>
          ) : activeUserSearchResults.length === 0 ? (
            <div className="text-center py-4">
              <User size={32} className="text-muted opacity-50 mb-2" />
              <p className="text-muted mb-0 small">No active employees found.</p>
            </div>
          ) : (
            <div className="list-group" style={{ maxHeight: "280px", overflowY: "auto" }}>
              {activeUserSearchResults.map((user) => (
                <div
                  key={user.id}
                  className="list-group-item list-group-item-action d-flex align-items-center justify-content-between p-3 border-0 rounded-3 mb-1 cursor-pointer"
                  onClick={() => createDirectChatMutation.mutate(user)}
                >
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="rounded-circle text-white fw-bold d-flex align-items-center justify-content-center"
                      style={{
                        width: "38px",
                        height: "38px",
                        fontSize: "14px",
                        backgroundColor: getAvatarColor(user.name || user.email),
                      }}
                    >
                      {(user.name || user.email)[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="d-flex align-items-center gap-2">
                        <h6 className="mb-0 small fw-bold text-dark">{user.name || user.email}</h6>
                        <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2 py-0.5" style={{ fontSize: "9px" }}>
                          Active
                        </span>
                      </div>
                      <small className="text-muted" style={{ fontSize: "11px" }}>
                        {user.email}
                      </small>
                    </div>
                  </div>
                  <Button variant="outline-primary" size="sm" className="rounded-pill px-3">
                    Chat
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Modal.Body>
      </Modal>

      {/* FORWARD MESSAGE MODAL */}
      <Modal show={Boolean(forwardMsg)} onHide={() => setForwardMsg(null)} centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="h6 fw-bold text-dark d-flex align-items-center gap-2">
            <CornerUpRight size={20} className="text-primary" /> Forward Message
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-3">
          {forwardMsg && (
            <div className="p-3 bg-light rounded-3 mb-3 border">
              <small className="text-muted d-block fw-semibold mb-1">Message Preview:</small>
              <p className="mb-0 text-dark small text-truncate">
                {forwardMsg.content || (forwardMsg.attachments?.length ? `[${forwardMsg.attachments.length} attachment(s)]` : "")}
              </p>
            </div>
          )}

          <div className="chat-search-box mb-3">
            <Search size={16} className="chat-search-icon" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={forwardSearch}
              onChange={(e) => setForwardSearch(e.target.value)}
            />
          </div>

          <div style={{ maxHeight: "280px", overflowY: "auto" }}>
            {conversations
              .filter((c) =>
                (c.display_name || c.name || "").toLowerCase().includes(forwardSearch.toLowerCase())
              )
              .map((conv) => {
                const isSent = forwardedConvIds.includes(conv.id);
                return (
                  <div
                    key={conv.id}
                    className="d-flex align-items-center justify-content-between p-2 rounded-3 hover-bg-light"
                  >
                    <div className="d-flex align-items-center gap-2">
                      <div
                        className="chat-conv-avatar"
                        style={{
                          width: "32px",
                          height: "32px",
                          fontSize: "12px",
                          backgroundColor: getAvatarColor(conv.display_name || "C"),
                        }}
                      >
                        {conv.type === "GROUP" ? (
                          <Users size={14} />
                        ) : (
                          (conv.display_name || "C")[0].toUpperCase()
                        )}
                      </div>
                      <span className="fw-semibold text-dark small">{conv.display_name}</span>
                    </div>

                    <Button
                      variant={isSent ? "success" : "primary"}
                      size="sm"
                      disabled={isSent || forwardMessageMutation.isPending}
                      className="rounded-pill px-3"
                      style={{ fontSize: "12px" }}
                      onClick={() => handleForwardToConv(conv.id)}
                    >
                      {isSent ? "Sent ✓" : "Forward"}
                    </Button>
                  </div>
                );
              })}
          </div>
        </Modal.Body>
      </Modal>

      {/* NEW GROUP CHAT MODAL */}
      <Modal show={showGroupModal} onHide={() => setShowGroupModal(false)} centered>
        <Modal.Header closeButton className="border-bottom-0 pb-0">
          <Modal.Title className="h6 fw-bold text-dark d-flex align-items-center gap-2">
            <Users size={20} className="text-primary" /> Create Group Chat
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-3">
          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold text-muted">Group Name</Form.Label>
            <Form.Control
              placeholder="e.g. HR Team, Project Launch..."
              className="rounded-3 shadow-none border"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold text-muted">Add Active Members</Form.Label>
            <InputGroup className="bg-light rounded-3 border">
              <InputGroup.Text className="bg-transparent border-0">
                <Search size={16} className="text-muted" />
              </InputGroup.Text>
              <Form.Control
                placeholder="Search active employees to add..."
                className="bg-transparent border-0 shadow-none small"
                value={userQuery}
                onChange={(e) => handleSearchUsers(e.target.value)}
              />
            </InputGroup>
          </Form.Group>

          {/* Selected Members Badges */}
          {selectedGroupMembers.length > 0 && (
            <div className="d-flex flex-wrap gap-1 mb-3">
              {selectedGroupMembers.map((m) => (
                <Badge
                  key={m.id}
                  bg="primary"
                  className="d-flex align-items-center gap-1 px-3 py-2 rounded-pill"
                  style={{ backgroundColor: "#6366f1" }}
                >
                  {m.name || m.email}
                  <X
                    size={14}
                    className="cursor-pointer ms-1"
                    onClick={() =>
                      setSelectedGroupMembers((prev) => prev.filter((u) => u.id !== m.id))
                    }
                  />
                </Badge>
              ))}
            </div>
          )}

          {userSearchLoading ? (
            <div className="text-center py-4">
              <Spinner animation="border" size="sm" variant="primary" />
            </div>
          ) : activeUserSearchResults.length === 0 ? (
            <p className="text-muted text-center py-3 mb-0 small">No active employees found.</p>
          ) : (
            <div className="list-group" style={{ maxHeight: "220px", overflowY: "auto" }}>
              {activeUserSearchResults.map((user) => {
                const isSelected = selectedGroupMembers.some((m) => m.id === user.id);
                return (
                  <div
                    key={user.id}
                    className={`list-group-item list-group-item-action d-flex align-items-center justify-content-between p-3 border-0 rounded-3 mb-1 cursor-pointer ${isSelected ? "bg-primary-subtle" : ""
                      }`}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedGroupMembers((prev) => prev.filter((m) => m.id !== user.id));
                      } else {
                        setSelectedGroupMembers((prev) => [...prev, user]);
                      }
                    }}
                  >
                    <div className="d-flex align-items-center gap-3">
                      <div
                        className="rounded-circle text-white fw-bold d-flex align-items-center justify-content-center"
                        style={{
                          width: "36px",
                          height: "36px",
                          fontSize: "13px",
                          backgroundColor: getAvatarColor(user.name || user.email),
                        }}
                      >
                        {(user.name || user.email)[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="d-flex align-items-center gap-2">
                          <h6 className="mb-0 small fw-bold text-dark">{user.name || user.email}</h6>
                          <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2 py-0.5" style={{ fontSize: "9px" }}>
                            Active
                          </span>
                        </div>
                        <small className="text-muted" style={{ fontSize: "11px" }}>
                          {user.email}
                        </small>
                      </div>
                    </div>
                    <Form.Check type="checkbox" checked={isSelected} readOnly />
                  </div>
                );
              })}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="border-top-0">
          <Button variant="light" size="sm" className="rounded-pill px-3" onClick={() => setShowGroupModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="rounded-pill px-4 border-0"
            style={{ backgroundColor: "#6366f1" }}
            disabled={!groupName.trim() || selectedGroupMembers.length === 0 || createGroupChatMutation.isPending}
            onClick={() => createGroupChatMutation.mutate()}
          >
            Create Group
          </Button>
        </Modal.Footer>
      </Modal>

      {/* CLEAR CHAT CONFIRMATION MODAL */}
      <Modal show={showClearModal} onHide={() => setShowClearModal(false)} centered size="sm">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="h6 fw-bold text-dark d-flex align-items-center gap-2">
            <Trash2 size={18} className="text-danger" /> Clear Chat History
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-3">
          <p className="small text-muted mb-0">
            Are you sure you want to clear all message history in this chat? Physical media attachments will be deleted from storage.
          </p>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button variant="light" size="sm" className="rounded-pill px-3" onClick={() => setShowClearModal(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            className="rounded-pill px-3"
            disabled={clearChatMutation.isPending}
            onClick={() => clearChatMutation.mutate()}
          >
            {clearChatMutation.isPending ? "Clearing..." : "Clear Chat"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* SEND ANNOUNCEMENT MODAL */}
      <Modal show={showAnnouncementModal} onHide={() => setShowAnnouncementModal(false)} centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="h6 fw-bold text-dark d-flex align-items-center gap-2">
            <Megaphone size={20} className="text-primary" /> Send Company Announcement
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-3">
          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold text-muted">Announcement Content</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="e.g. Office Holiday Announcement: The office will remain closed on 15 August..."
              className="rounded-3 shadow-none border small"
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
            />
          </Form.Group>

          <Row className="g-3 mb-3">
            <Col sm={6}>
              <Form.Group>
                <Form.Label className="small fw-semibold text-muted">Send Target</Form.Label>
                <Form.Select
                  size="sm"
                  className="rounded-3 shadow-none border"
                  value={announcementTarget}
                  onChange={(e) => setAnnouncementTarget(e.target.value)}
                >
                  <option value="EVERYONE">Send to Everyone</option>
                  <option value="DEPARTMENT">Send to Department</option>
                  <option value="SPECIFIC">Specific Employees</option>
                </Form.Select>
              </Form.Group>
            </Col>
            {announcementTarget === "DEPARTMENT" && (
              <Col sm={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold text-muted">Department</Form.Label>
                  <Form.Control
                    size="sm"
                    placeholder="e.g. HR, Engineering..."
                    className="rounded-3 shadow-none border"
                    value={announcementDept}
                    onChange={(e) => setAnnouncementDept(e.target.value)}
                  />
                </Form.Group>
              </Col>
            )}
          </Row>

          <div className="d-flex flex-column gap-2 p-3 bg-light rounded-3 border">
            <Form.Check
              type="checkbox"
              id="ann-pin"
              label={<span className="small fw-semibold text-dark">Pin Announcement to top</span>}
              checked={announcementPinned}
              onChange={(e) => setAnnouncementPinned(e.target.checked)}
            />
            <Form.Check
              type="checkbox"
              id="ann-ack"
              label={<span className="small fw-semibold text-dark">Require Mandatory Employee Acknowledgement</span>}
              checked={announcementRequiresAck}
              onChange={(e) => setAnnouncementRequiresAck(e.target.checked)}
            />
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button variant="light" size="sm" className="rounded-pill px-3" onClick={() => setShowAnnouncementModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="rounded-pill px-4 border-0"
            style={{ backgroundColor: "#6366f1" }}
            disabled={!announcementText.trim() || sendAnnouncementMutation.isPending}
            onClick={() => sendAnnouncementMutation.mutate()}
          >
            {sendAnnouncementMutation.isPending ? "Broadcasting..." : "Broadcast Announcement"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* MEDIA LIGHTBOX MODAL */}
      <Modal show={!!previewMediaUrl} onHide={() => setPreviewMediaUrl(null)} centered size="lg">
        <Modal.Body className="p-0 bg-dark rounded-3 overflow-hidden position-relative">
          <Button
            variant="link"
            className="position-absolute top-0 end-0 text-white p-3 z-index-10 border-0 shadow-none"
            onClick={() => setPreviewMediaUrl(null)}
          >
            <X size={28} />
          </Button>
          {previewMediaUrl && (
            <BSImage src={previewMediaUrl} alt="preview" className="w-100 h-auto" />
          )}
        </Modal.Body>
      </Modal>

      {/* === SCOPED STYLES === */}
      <style jsx global>{`
        /* ===== CHAT APP LAYOUT ===== */
        .chat-app-container {
          display: flex;
          height: 100%;
          width: 100%;
          background: #ffffff;
          border-radius: 0;
          overflow: hidden;
          border: none;
          box-shadow: none;
          margin: 0;
        }

        /* ===== SIDEBAR ===== */
        .chat-sidebar {
          width: 340px;
          min-width: 340px;
          max-width: 340px;
          display: flex;
          flex-direction: column;
          border-right: 1px solid #e5e7eb;
          background: #fff;
          transition: transform 0.25s ease;
        }

        .chat-sidebar-header {
          padding: 16px;
          border-bottom: 1px solid #f1f5f9;
        }

        .chat-sidebar-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .chat-sidebar-title {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .chat-sidebar-title h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          color: #1e293b;
          line-height: 1.2;
        }

        .chat-count {
          font-size: 11px;
          color: #94a3b8;
          font-weight: 500;
        }

        .chat-icon-accent {
          color: #16a34a;
        }

        .chat-sidebar-actions {
          display: flex;
          gap: 6px;
        }

        .chat-icon-btn {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          background: #fff;
          color: #64748b;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }

        .chat-icon-btn:hover {
          background: #f0fdf4;
          color: #16a34a;
          border-color: #86efac;
        }

        .chat-icon-btn.accent {
          background: #16a34a;
          color: white;
          border-color: #16a34a;
        }

        .chat-icon-btn.accent:hover {
          background: #15803d;
        }

        /* Search box */
        .chat-search-box {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 8px 12px;
        }

        .chat-search-box input {
          flex: 1;
          border: none;
          background: transparent;
          outline: none;
          font-size: 13px;
          color: #1e293b;
        }

        .chat-search-box input::placeholder {
          color: #94a3b8;
        }

        .chat-search-icon {
          color: #94a3b8;
          flex-shrink: 0;
        }

        .chat-search-clear {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 0;
          display: flex;
        }

        /* Conversation list */
        .chat-conv-list {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
        }

        .chat-conv-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.15s ease;
          margin-bottom: 2px;
        }

        .chat-conv-item:hover {
          background: #f8fafc;
        }

        .chat-conv-item.active {
          background: #dcfce7;
        }

        .chat-conv-avatar-wrap {
          position: relative;
          flex-shrink: 0;
        }

        .chat-conv-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-weight: 700;
          font-size: 15px;
        }

        .chat-online-dot {
          position: absolute;
          bottom: 1px;
          right: 1px;
          width: 10px;
          height: 10px;
          background: #22c55e;
          border: 2px solid #fff;
          border-radius: 50%;
        }

        .chat-conv-info {
          flex: 1;
          min-width: 0;
        }

        .chat-conv-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 3px;
        }

        .chat-conv-name {
          font-size: 13.5px;
          font-weight: 600;
          color: #1e293b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .chat-conv-item.active .chat-conv-name {
          color: #15803d;
        }

        .chat-conv-time {
          font-size: 10.5px;
          color: #94a3b8;
          white-space: nowrap;
          margin-left: 8px;
          flex-shrink: 0;
        }

        .chat-conv-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .chat-conv-preview {
          font-size: 12px;
          color: #94a3b8;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .chat-unread-badge {
          background: #ef4444;
          color: white;
          font-size: 10px;
          font-weight: 700;
          min-width: 18px;
          height: 18px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 5px;
          flex-shrink: 0;
          margin-left: 6px;
        }

        /* ===== CHAT MAIN AREA ===== */
        .chat-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          background: #fff;
        }

        /* Chat header */
        .chat-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid #f1f5f9;
          background: #fff;
          min-height: 64px;
        }

        .chat-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .chat-back-btn {
          display: none;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1px solid #e5e7eb;
          background: #fff;
          color: #475569;
          cursor: pointer;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .chat-header-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-weight: 700;
          font-size: 15px;
          flex-shrink: 0;
        }

        .chat-header-info h3 {
          margin: 0;
          font-size: 15px;
          font-weight: 700;
          color: #1e293b;
          line-height: 1.3;
        }

        .chat-header-meta {
          font-size: 11.5px;
          color: #94a3b8;
          font-weight: 500;
        }

        .chat-header-right {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* Messages scroll area */
        .chat-messages-area {
          flex: 1;
          overflow-y: auto;
          padding: 16px 20px;
          background: #f8fafc;
          display: flex;
          flex-direction: column;
        }

        .chat-messages-flex {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        /* Date separator */
        .chat-date-separator {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px 0;
        }

        .chat-date-separator span {
          background: #e2e8f0;
          color: #64748b;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 12px;
          border-radius: 12px;
          letter-spacing: 0.02em;
        }

        /* Message rows */
        .chat-message-row {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          margin-bottom: 2px;
          width: 100%;
        }

        .chat-message-row.sent {
          justify-content: flex-end;
        }

        .chat-message-row.received {
          justify-content: flex-start;
        }

        .chat-msg-actions-dropdown {
          position: absolute;
          top: 4px;
          right: 4px;
          opacity: 0;
          transition: opacity 0.15s ease;
          z-index: 5;
        }

        .chat-bubble:hover .chat-msg-actions-dropdown,
        .chat-msg-actions-dropdown.show {
          opacity: 1;
        }

        .bubble-sent .chat-msg-more-btn {
          color: rgba(255, 255, 255, 0.8) !important;
          background: transparent !important;
          padding: 2px 4px !important;
          border-radius: 4px !important;
          box-shadow: none !important;
        }

        .bubble-sent .chat-msg-more-btn:hover {
          color: #ffffff !important;
          background: rgba(255, 255, 255, 0.22) !important;
        }

        .bubble-received .chat-msg-more-btn {
          color: #94a3b8 !important;
          background: transparent !important;
          padding: 2px 4px !important;
          border-radius: 4px !important;
          box-shadow: none !important;
        }

        .bubble-received .chat-msg-more-btn:hover {
          color: #475569 !important;
          background: rgba(148, 163, 184, 0.18) !important;
        }

        /* Avatar for received / sent */
        .chat-msg-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 11px;
          flex-shrink: 0;
          margin-bottom: 2px;
          overflow: hidden;
        }

        .chat-msg-avatar-sent {
          margin-left: 2px;
          margin-right: 0;
        }

        /* Clean message bubble */
        .chat-bubble {
          max-width: 65%;
          min-width: 90px;
          padding: 8px 12px;
          border-radius: 14px;
          position: relative;
          word-wrap: break-word;
          display: flex;
          flex-direction: column;
        }

        .bubble-sent {
          background: #16a34a;
          color: #fff;
          border-bottom-right-radius: 4px;
        }

        .bubble-received {
          background: #fff;
          color: #1e293b;
          border: 1px solid #e2e8f0;
          border-bottom-left-radius: 4px;
        }

        .chat-sender-name {
          font-size: 11px;
          font-weight: 700;
          color: #16a34a;
          margin-bottom: 2px;
          line-height: 1.2;
        }

        .chat-text {
          margin: 0;
          font-size: 13.5px;
          line-height: 1.45;
          white-space: pre-wrap;
          word-break: break-word;
        }

        /* Bubble meta (time + checkmarks) */
        .chat-bubble-meta {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 4px;
          margin-top: 4px;
          align-self: flex-end;
        }

        .chat-time {
          font-size: 10px;
          opacity: 0.7;
          line-height: 1;
        }

        .bubble-sent .chat-read-icon {
          color: #bbf7d0;
        }

        .bubble-received .chat-read-icon {
          color: #94a3b8;
        }

        /* Attachments */
        .chat-attachments {
          margin-top: 6px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .chat-att-image {
          border-radius: 8px;
          overflow: hidden;
        }

        .chat-att-file {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          border-radius: 8px;
          text-decoration: none;
          font-size: 12px;
          transition: opacity 0.15s;
        }

        .bubble-sent .chat-att-file {
          background: rgba(255,255,255,0.15);
          color: #fff;
        }

        .bubble-received .chat-att-file {
          background: #f1f5f9;
          color: #1e293b;
        }

        .chat-att-file-info {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .chat-att-file-name {
          font-weight: 600;
          font-size: 12px;
        }

        /* Typing indicator */
        .chat-typing-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #94a3b8;
          font-style: italic;
          padding: 6px 0;
        }

        .chat-typing-dots {
          display: flex;
          gap: 3px;
        }

        .chat-typing-dots span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #16a34a;
          animation: typingBounce 1.4s infinite both;
        }

        .chat-typing-dots span:nth-child(2) { animation-delay: 0.16s; }
        .chat-typing-dots span:nth-child(3) { animation-delay: 0.32s; }

        @keyframes typingBounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }

        /* File previews bar */
        .chat-file-previews {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          padding: 10px 16px;
          background: #f8fafc;
          border-top: 1px solid #f1f5f9;
        }

        .chat-file-preview-item {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 6px 10px;
        }

        .chat-file-preview-icon {
          width: 36px;
          height: 36px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .chat-file-preview-icon.video {
          background: #1e293b;
          color: #fff;
        }

        .chat-file-preview-icon.doc {
          background: #eff6ff;
          color: #3b82f6;
        }

        .chat-file-preview-info {
          display: flex;
          flex-direction: column;
          max-width: 100px;
        }

        .chat-file-preview-name {
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: #1e293b;
        }

        .chat-file-preview-info small {
          font-size: 9px;
          color: #94a3b8;
        }

        .chat-file-preview-remove {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: none;
          background: #fee2e2;
          color: #ef4444;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-left: 4px;
        }

        /* Input area */
        .chat-input-area {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          border-top: 1px solid #f1f5f9;
          background: #fff;
          position: relative;
        }

        .chat-input-icon-btn {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: none;
          background: #f1f5f9;
          color: #64748b;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.15s;
        }

        .chat-input-icon-btn:hover,
        .chat-input-icon-btn.active {
          background: #dcfce7;
          color: #16a34a;
        }

        .chat-emoji-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .chat-emoji-popover {
          position: absolute;
          bottom: 48px;
          left: 0;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
          width: 260px;
          padding: 10px;
          z-index: 100;
          animation: popoverFadeIn 0.15s ease-out;
        }

        @keyframes popoverFadeIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .chat-emoji-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 6px;
          margin-bottom: 6px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 11px;
          font-weight: 600;
          color: #64748b;
        }

        .chat-emoji-close {
          border: none;
          background: transparent;
          color: #94a3b8;
          cursor: pointer;
          padding: 2px;
          border-radius: 4px;
          display: flex;
          align-items: center;
        }

        .chat-emoji-close:hover {
          color: #ef4444;
          background: #fee2e2;
        }

        .chat-emoji-grid {
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          gap: 4px;
          max-height: 160px;
          overflow-y: auto;
        }

        .chat-emoji-btn {
          border: none;
          background: transparent;
          font-size: 18px;
          padding: 4px;
          border-radius: 6px;
          cursor: pointer;
          transition: transform 0.1s, background-color 0.1s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .chat-emoji-btn:hover {
          background: #f1f5f9;
          transform: scale(1.2);
        }

        .chat-input-wrapper {
          flex: 1;
          min-width: 0;
          display: flex;
          align-items: center;
        }

        .chat-input-wrapper textarea {
          width: 100%;
          border: 1px solid #e5e7eb;
          border-radius: 20px;
          padding: 9px 16px;
          font-size: 13.5px;
          line-height: 1.4;
          resize: none;
          outline: none;
          background: #f8fafc;
          color: #1e293b;
          min-height: 38px;
          max-height: 150px;
          overflow-y: auto;
          transition: border-color 0.15s, background 0.15s;
        }

        .chat-input-wrapper textarea:focus {
          border-color: #86efac;
          background: #fff;
        }

        .chat-input-wrapper textarea::placeholder {
          color: #94a3b8;
        }

        .chat-send-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: none;
          background: #e2e8f0;
          color: #94a3b8;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.2s ease;
        }

        .chat-send-btn.active {
          background: #16a34a;
          color: #fff;
          box-shadow: 0 2px 8px rgba(22, 163, 74, 0.3);
        }

        .chat-send-btn:disabled {
          cursor: not-allowed;
          opacity: 0.7;
        }

        /* No conversation selected */
        .chat-no-selection {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
        }

        .chat-no-selection-content {
          text-align: center;
          max-width: 320px;
        }

        .chat-no-selection-content h4 {
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 8px;
        }

        .chat-no-selection-content p {
          color: #94a3b8;
          font-size: 13px;
        }

        /* Empty state */
        .chat-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          text-align: center;
        }

        .chat-empty-state h6 {
          font-weight: 700;
          color: #1e293b;
          margin-top: 12px;
          margin-bottom: 4px;
        }

        .chat-empty-state p {
          color: #94a3b8;
          font-size: 12.5px;
          margin-bottom: 0;
        }

        .chat-empty-icon {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #94a3b8;
        }

        .chat-empty-icon.accent {
          background: #eef2ff;
          color: #6366f1;
        }

        .chat-empty-icon.large {
          width: 72px;
          height: 72px;
        }

        /* Dropdown caret fix */
        .no-caret::after {
          display: none !important;
        }

        /* ===== MOBILE RESPONSIVE ===== */
        @media (max-width: 768px) {
          .chat-app-container {
            height: calc(100vh - 80px);
            min-height: 0;
            border-radius: 0;
            border: none;
            box-shadow: none;
          }

          .chat-sidebar {
            width: 100%;
            min-width: 100%;
            max-width: 100%;
            border-right: none;
            position: absolute;
            inset: 0;
            z-index: 10;
          }

          .chat-main {
            position: absolute;
            inset: 0;
            z-index: 10;
          }

          /* Toggle visibility on mobile */
          .mobile-hide {
            display: none !important;
          }

          .mobile-show {
            display: flex !important;
          }

          .chat-back-btn {
            display: flex;
          }

          .chat-bubble {
            max-width: 82%;
          }

          .chat-messages-area {
            padding: 12px 12px;
          }

          .chat-input-area {
            padding: 10px 12px;
          }

          .chat-header {
            padding: 10px 12px;
          }
        }

        /* Tablet */
        @media (min-width: 769px) and (max-width: 1024px) {
          .chat-sidebar {
            width: 280px;
            min-width: 280px;
            max-width: 280px;
          }

          .chat-bubble {
            max-width: 72%;
          }
        }

        /* Fix scrollbar styling */
        .chat-conv-list::-webkit-scrollbar,
        .chat-messages-area::-webkit-scrollbar {
          width: 4px;
        }

        .chat-conv-list::-webkit-scrollbar-track,
        .chat-messages-area::-webkit-scrollbar-track {
          background: transparent;
        }

        .chat-conv-list::-webkit-scrollbar-thumb,
        .chat-messages-area::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }

        .chat-conv-list::-webkit-scrollbar-thumb:hover,
        .chat-messages-area::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        /* Make chat container relative for mobile abs positioning */
        @media (max-width: 768px) {
          .chat-app-container {
            position: relative;
          }
        }
      `}</style>
    </>
  );
}