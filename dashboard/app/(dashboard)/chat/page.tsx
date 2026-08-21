"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense } from "react";
import Swal from "sweetalert2";
import PlanFeatureLockedPaywall from "components/PlanFeatureLockedPaywall";
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
  Tooltip,
  OverlayTrigger,
} from "react-bootstrap";
import { useSearchParams } from "next/navigation";
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
  Trash2,
  CornerUpRight,
  CornerUpLeft,
  Reply,
  Copy,
  Smile,
  Megaphone,
  Pin,
  UploadCloud,
  Image as ImageIcon,
  Download,
  Maximize2,
  ExternalLink,
  ChevronDown,
  Check,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendBrowserChatNotification,
  registerChatServiceWorker,
} from "../../../helper/browserNotification";
import {
  playMessageChime,
  preloadNotificationSound,
  isChatSoundMuted,
  setChatSoundMuted,
} from "../../../helper/notificationSound";

import {
  Conversation,
  Message,
  UserMinimal,
  ReactionSummary,
  fetchConversations,
  fetchMessages,
  sendMessageWithAttachments,
  createDirectChat,
  createGroupChat,
  searchUsers,
  markConversationAsRead,
  connectChatWebSocket,
  deleteMessage,
  deleteConversation,
  clearChatHistory,
  sendAnnouncement,
  acknowledgeAnnouncement,
  reactToMessage,
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

// Safe Avatar Component with graceful fallback
interface SafeAvatarProps {
  src?: string | null;
  name?: string;
  size?: number;
  fontSize?: number;
  className?: string;
  style?: React.CSSProperties;
  isGroup?: boolean;
  showOnlineDot?: boolean;
}

const SafeAvatar: React.FC<SafeAvatarProps> = ({
  src,
  name = "User",
  size = 40,
  fontSize = 14,
  className = "",
  style = {},
  isGroup = false,
  showOnlineDot = false,
}) => {
  const [imgError, setImgError] = useState(false);
  const initial = (name || "U")[0]?.toUpperCase() || "U";
  const bg = getAvatarColor(name || "U");

  useEffect(() => {
    setImgError(false);
  }, [src]);

  const hasValidImg = Boolean(src && !imgError && src.trim() !== "");

  return (
    <div
      className={`position-relative d-inline-flex align-items-center justify-content-center flex-shrink-0 rounded-circle user-select-none ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: hasValidImg ? "#e2e8f0" : bg,
        color: "#ffffff",
        fontWeight: 700,
        fontSize: `${fontSize}px`,
        overflow: "visible",
        ...style,
      }}
    >
      <div
        className="w-100 h-100 rounded-circle d-flex align-items-center justify-content-center overflow-hidden position-relative"
        style={{ backgroundColor: hasValidImg ? "#e2e8f0" : bg }}
      >
        {hasValidImg ? (
          <img
            src={src!}
            alt=""
            className="w-100 h-100 rounded-circle"
            style={{ objectFit: "cover", display: "block" }}
            onError={() => setImgError(true)}
          />
        ) : isGroup ? (
          <Users size={Math.max(14, Math.round(size * 0.44))} />
        ) : (
          <span>{initial}</span>
        )}
      </div>
      {showOnlineDot && <span className="chat-online-dot" />}
    </div>
  );
};

// File type and badge color helper
const getFileMeta = (fileName: string) => {
  const ext = (fileName.split(".").pop() || "FILE").toUpperCase();
  if (["PDF"].includes(ext)) return { ext, color: "#ef4444", bg: "#fef2f2", label: "PDF" };
  if (["DOC", "DOCX"].includes(ext)) return { ext, color: "#2563eb", bg: "#eff6ff", label: "DOC" };
  if (["XLS", "XLSX", "CSV"].includes(ext)) return { ext, color: "#16a34a", bg: "#f0fdf4", label: "XLS" };
  if (["PPT", "PPTX"].includes(ext)) return { ext, color: "#ea580c", bg: "#fff7ed", label: "PPT" };
  if (["ZIP", "RAR", "7Z", "TAR", "GZ"].includes(ext)) return { ext, color: "#9333ea", bg: "#faf5ff", label: "ZIP" };
  if (["TXT", "LOG", "MD"].includes(ext)) return { ext, color: "#475569", bg: "#f8fafc", label: "TXT" };
  return { ext, color: "#6366f1", bg: "#eef2ff", label: ext.slice(0, 4) };
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

// Strictly Corporate & Workplace Emoji Reactions
const CORPORATE_REACTIONS = ["👍", "👏", "✅", "🚀", "🎯", "💡", "🤝", "👀"];

// Curated workplace emojis for message input bar
const WORKPLACE_INPUT_EMOJIS = [
  "👍", "👏", "✅", "🚀", "🎯", "💡", "🤝", "👀",
  "😊", "🎉", "🔥", "💯", "🙌", "✨", "📌", "💬",
  "⭐", "🙏", "👌", "💪", "⚡", "☕", "📊", "📁"
];

function ChatPageContent() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  const [organization, setOrganization] = useState<any>(null);

  useEffect(() => {
    const orgData = localStorage.getItem("organization");
    if (orgData) {
      try {
        setOrganization(JSON.parse(orgData));
      } catch {}
    }
  }, []);

  const isFeatureLocked =
    organization?.plan_features && organization.plan_features.allows_chat === false;

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // View state: which panel is visible on mobile
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  // Message input state
  const [inputContent, setInputContent] = useState<string>("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<{ url: string; type: string; name: string; size: string }[]>([]);

  // Click-to-show reaction & action bar state (WhatsApp style)
  const [activeActionBarMsgId, setActiveActionBarMsgId] = useState<string | null>(null);

  // Close reaction action bar when clicking anywhere outside
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".chat-quick-reactions-bar") && !target.closest(".chat-bubble")) {
        setActiveActionBarMsgId(null);
      }
    };
    document.addEventListener("click", handleDocumentClick);
    return () => document.removeEventListener("click", handleDocumentClick);
  }, []);

  // WhatsApp-style Reply To message state
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);

  // Swipe-to-reply gesture state
  const [swipingMsgId, setSwipingMsgId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);
  const isSwipingRef = useRef<boolean>(false);

  // Search, Filter and Modal states
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [convFilter, setConvFilter] = useState<"all" | "direct" | "group">("all");
  const [showDirectModal, setShowDirectModal] = useState<boolean>(false);
  const [showGroupModal, setShowGroupModal] = useState<boolean>(false);
  const [userSearchResults, setUserSearchResults] = useState<UserMinimal[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState<boolean>(false);
  const [userQuery, setUserQuery] = useState<string>("");

  // In-chat message search state
  const [showInChatSearch, setShowInChatSearch] = useState<boolean>(false);
  const [inChatMessageQuery, setInChatMessageQuery] = useState<string>("");

  // Group creation state
  const [groupName, setGroupName] = useState<string>("");
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<UserMinimal[]>([]);

  // Media preview lightbox
  const [previewMedia, setPreviewMedia] = useState<{
    url: string;
    type: "image" | "video" | "file";
    name?: string;
    size?: string;
  } | null>(null);

  // Typing indicator state
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Forward message state
  const [forwardMsg, setForwardMsg] = useState<Message | null>(null);
  const [forwardSearch, setForwardSearch] = useState<string>("");
  const [forwardedConvIds, setForwardedConvIds] = useState<string[]>([]);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  // Input bar emoji picker state
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
      Swal.fire({
        title: "Chat Cleared",
        text: "The chat history has been cleared.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
        customClass: {
          popup: "rounded-4 shadow",
        },
      });
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
      Swal.fire({
        title: "Announcement Sent",
        text: "Company announcement broadcast successfully!",
        icon: "success",
        timer: 1800,
        showConfirmButton: false,
        customClass: { popup: "rounded-4 shadow" },
      });
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

  // Scroll to quoted message on quote click
  const scrollToQuotedMessage = (messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMsgId(messageId);
      setTimeout(() => setHighlightedMsgId(null), 1800);
    }
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
  const chatMessagesAreaRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState<boolean>(false);

  // Collapse the main sidebar when chat page mounts, restore on unmount
  useEffect(() => {
    dispatch(setCollapsed({ value: "collapsed" }));
    document.querySelector("html")?.setAttribute("class", "collapsed");
    return () => {
      dispatch(setCollapsed({ value: "expanded" }));
      document.querySelector("html")?.setAttribute("class", "expanded");
    };
  }, [dispatch]);

  // Load current user and fetch profile photo
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

  const searchParams = useSearchParams();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(false);

  useEffect(() => {
    setNotificationPermission(getNotificationPermission());
    setIsSoundMuted(isChatSoundMuted());
    registerChatServiceWorker();
    preloadNotificationSound();
  }, []);

  const handleToggleSound = () => {
    const next = !isSoundMuted;
    setIsSoundMuted(next);
    setChatSoundMuted(next);
    if (!next) {
      playMessageChime();
    }
  };

  const handleEnableNotifications = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      Swal.fire({
        icon: "info",
        title: "Not Supported",
        text: "Your browser does not support Web Notifications.",
        confirmButtonColor: "#4f46e5",
      });
      return;
    }

    const currentPerm = Notification.permission;
    if (currentPerm === "denied") {
      Swal.fire({
        icon: "warning",
        title: "Notifications Blocked",
        html: `<div class="text-start small">
          <p>Browser notifications are currently <strong>Blocked</strong> for this site in your browser settings.</p>
          <p class="mb-1"><strong>To enable them:</strong></p>
          <ol class="ps-3 mb-2">
            <li>Click the <strong>Tune / Padlock</strong> icon in your browser's address bar.</li>
            <li>Change <strong>Notifications</strong> from Block to <strong>Allow</strong>.</li>
            <li>Refresh this page.</li>
          </ol>
        </div>`,
        confirmButtonColor: "#4f46e5",
        confirmButtonText: "Got it",
      });
      return;
    }

    try {
      const res = await requestNotificationPermission();
      setNotificationPermission(res);
      if (res === "granted") {
        playMessageChime();
        await sendBrowserChatNotification({
          title: "AttendStack Notifications Active! 🎉",
          body: "You will now receive instant desktop and background chat alerts.",
          playSound: false,
        });
        Swal.fire({
          icon: "success",
          title: "Notifications Enabled!",
          text: "You will now receive instant alerts whenever teammates message you.",
          timer: 2500,
          showConfirmButton: false,
        });
      } else if (res === "denied") {
        Swal.fire({
          icon: "warning",
          title: "Permission Denied",
          text: "Notifications were blocked. You can enable them anytime from your browser address bar settings.",
          confirmButtonColor: "#4f46e5",
        });
      }
    } catch (err) {
      console.error("Error enabling notifications:", err);
    }
  };

  // TanStack Query: Fetch Conversations
  const {
    data: conversations = [],
    isLoading: loadingConversations,
    refetch: refetchConversations,
  } = useQuery({
    queryKey: ["conversations"],
    queryFn: fetchConversations,
  });

  // Deep linking: Open specific conversation from URL query parameter (?convId=...)
  useEffect(() => {
    const targetConvId = searchParams.get("convId");
    if (targetConvId) {
      setActiveConversationId(targetConvId);
      setMobileView("chat");
    }
  }, [searchParams]);

  // Auto-select first conversation if none active and no deep link
  useEffect(() => {
    const targetConvId = searchParams.get("convId");
    if (!targetConvId && conversations.length > 0 && !activeConversationId) {
      setActiveConversationId(conversations[0].id);
    }
  }, [conversations, activeConversationId, searchParams]);

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
      queryClient.setQueryData<Conversation[]>(["conversations"], (old = []) =>
        old.map((c) => (c.id === activeConversationId ? { ...c, unread_count: 0 } : c))
      );
      return (res.results || []).slice().reverse();
    },
    enabled: !!activeConversationId,
  });

  const messages = useMemo(() => messagesData || [], [messagesData]);

  // Track pinned announcement in active conversation
  const pinnedAnnouncement = useMemo(() => {
    return messages.slice().reverse().find((m) => m.is_announcement && m.pinned && !m.is_deleted);
  }, [messages]);

  // Filter messages by in-chat search query
  const displayedMessages = useMemo(() => {
    if (!inChatMessageQuery.trim()) return messages;
    const query = inChatMessageQuery.toLowerCase();
    return messages.filter((m) => {
      const matchText = (m.content || "").toLowerCase().includes(query);
      const matchSender = (m.sender?.name || m.sender?.email || "").toLowerCase().includes(query);
      return matchText || matchSender;
    });
  }, [messages, inChatMessageQuery]);

  // Scroll to bottom on new messages
  const scrollToBottom = useCallback((smooth = true) => {
    if (chatMessagesAreaRef.current) {
      chatMessagesAreaRef.current.scrollTo({
        top: chatMessagesAreaRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
    }
  }, []);

  useEffect(() => {
    scrollToBottom(false);
  }, [activeConversationId, scrollToBottom]);

  useEffect(() => {
    scrollToBottom(true);
  }, [messages.length, typingUser, scrollToBottom]);

  const handleScrollArea = () => {
    if (!chatMessagesAreaRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatMessagesAreaRef.current;
    const isUp = scrollHeight - scrollTop - clientHeight > 180;
    setShowScrollBottom(isUp);
  };

  // WebSocket Connection with real-time query cache synchronization
  useEffect(() => {
    if (!activeConversationId) return;

    if (wsRef.current) {
      wsRef.current.close();
    }

    const controller = connectChatWebSocket(
      activeConversationId,
      (data) => {
        if (data.type === "new_message") {
          const newMsg: Message = data.message;
          queryClient.setQueryData<Message[]>(["messages", activeConversationId], (old = []) => {
            if (old.some((m) => m.id === newMsg.id)) return old;
            return [...old, newMsg];
          });

          queryClient.setQueryData<Conversation[]>(["conversations"], (old = []) =>
            old.map((c) =>
              c.id === activeConversationId
                ? { ...c, last_message: newMsg, updated_at: new Date().toISOString() }
                : c
            )
          );

          // Play sound and trigger browser notification if message is from another user
          const isFromMe = String(newMsg.sender?.id) === String(currentUserId);
          if (!isFromMe) {
            playMessageChime();
            const isDocHidden = typeof document !== "undefined" && document.hidden;
            if (isDocHidden) {
              const senderName = newMsg.sender?.name || newMsg.sender?.email || "New Message";
              const bodyText =
                newMsg.content ||
                (newMsg.attachments?.length
                  ? `[${newMsg.attachments.length} attachment(s)]`
                  : "Sent a message");
              sendBrowserChatNotification({
                title: senderName,
                body: bodyText,
                conversationId: activeConversationId,
                avatar: newMsg.sender?.avatar || newMsg.sender?.profile_photo_url,
                playSound: false, // Already played above
              });
            }
          }
        } else if (data.type === "message_deleted") {
          queryClient.setQueryData<Message[]>(["messages", activeConversationId], (old = []) =>
            old.filter((m) => m.id !== data.message_id)
          );
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
        } else if (data.type === "message_reaction") {
          queryClient.setQueryData<Message[]>(["messages", activeConversationId], (old = []) => {
            return old.map((m) => {
              if (m.id === data.message_id) {
                const updatedReactions: ReactionSummary[] = (data.reactions || []).map((r: any) => ({
                  emoji: r.emoji,
                  count: r.count,
                  users: r.users || [],
                  reacted_by_me: (r.users || []).some((u: any) => String(u.id) === String(currentUserId)),
                }));
                return { ...m, reactions: updatedReactions };
              }
              return m;
            });
          });
        } else if (data.type === "typing") {
          if (data.is_typing) {
            setTypingUser(data.username);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 3000);
          } else {
            setTypingUser(null);
          }
        }
      },
      (err) => {
        console.warn("WebSocket error in chat page:", err);
      }
    );

    wsRef.current = controller;

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [activeConversationId, currentUserId, queryClient]);

  // Select conversation
  const selectConversation = (conv: Conversation) => {
    if (!conv || !conv.id) return;
    setActiveConversationId(conv.id);
    setMobileView("chat");
    setShowDirectModal(false);
    setShowGroupModal(false);
    setShowInChatSearch(false);
    setInChatMessageQuery("");
    setReplyingTo(null);
    markConversationAsRead(conv.id);
    queryClient.setQueryData<Conversation[]>(["conversations"], (old = []) =>
      old.map((c) => (c.id === conv.id ? { ...c, unread_count: 0 } : c))
    );
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
      Swal.fire({
        title: "Message Deleted",
        text: "The message was deleted successfully.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
        customClass: {
          popup: "rounded-4 shadow",
        },
      });
    },
  });

  const handleDeleteMessage = (messageId: string) => {
    Swal.fire({
      title: "Delete Message?",
      text: "Are you sure you want to delete this message?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
      reverseButtons: true,
      customClass: {
        popup: "rounded-4 shadow-lg",
        confirmButton: "btn btn-danger px-4 py-2 rounded-pill fw-bold",
        cancelButton: "btn btn-secondary px-4 py-2 rounded-pill fw-bold me-2",
      },
      buttonsStyling: false,
    }).then((result) => {
      if (result.isConfirmed) {
        deleteMessageMutation.mutate(messageId);
      }
    });
  };

  // TanStack Mutation: React to message with emoji
  const reactMutation = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      if (!activeConversationId) return;
      return await reactToMessage(activeConversationId, messageId, emoji);
    },
    onSuccess: (updatedMsg) => {
      if (!activeConversationId || !updatedMsg) return;
      queryClient.setQueryData<Message[]>(["messages", activeConversationId], (old = []) =>
        old.map((m) => {
          if (m.id === updatedMsg.id) {
            const recomputedReactions = (updatedMsg.reactions || []).map((r: any) => ({
              ...r,
              reacted_by_me: (r.users || []).some((u: any) => String(u.id) === String(currentUserId)),
            }));
            return { ...m, reactions: recomputedReactions };
          }
          return m;
        })
      );
    },
  });

  // Strict 1-emoji per user per message toggle / swap logic with instant optimistic feedback
  const handleToggleReaction = (messageId: string, emoji: string) => {
    if (!activeConversationId) return;

    queryClient.setQueryData<Message[]>(["messages", activeConversationId], (old = []) => {
      return old.map((m) => {
        if (m.id !== messageId) return m;

        const currentReactions: ReactionSummary[] = m.reactions
          ? m.reactions.map((r) => ({
              ...r,
              users: [...r.users],
            }))
          : [];

        const previousReactionIdx = currentReactions.findIndex(
          (r) => r.reacted_by_me || r.users.some((u) => String(u.id) === String(currentUserId))
        );

        let newReactions = [...currentReactions];

        if (previousReactionIdx > -1) {
          const prev = newReactions[previousReactionIdx];

          if (prev.emoji === emoji) {
            if (prev.count <= 1) {
              newReactions.splice(previousReactionIdx, 1);
            } else {
              newReactions[previousReactionIdx] = {
                ...prev,
                count: prev.count - 1,
                reacted_by_me: false,
                users: prev.users.filter((u) => String(u.id) !== String(currentUserId)),
              };
            }
          } else {
            if (prev.count <= 1) {
              newReactions.splice(previousReactionIdx, 1);
            } else {
              newReactions[previousReactionIdx] = {
                ...prev,
                count: prev.count - 1,
                reacted_by_me: false,
                users: prev.users.filter((u) => String(u.id) !== String(currentUserId)),
              };
            }

            const targetIdx = newReactions.findIndex((r) => r.emoji === emoji);
            if (targetIdx > -1) {
              newReactions[targetIdx] = {
                ...newReactions[targetIdx],
                count: newReactions[targetIdx].count + 1,
                reacted_by_me: true,
                users: [
                  ...newReactions[targetIdx].users,
                  { id: String(currentUserId), name: myUserName || "You" },
                ],
              };
            } else {
              newReactions.push({
                emoji,
                count: 1,
                reacted_by_me: true,
                users: [{ id: String(currentUserId), name: myUserName || "You" }],
              });
            }
          }
        } else {
          const targetIdx = newReactions.findIndex((r) => r.emoji === emoji);
          if (targetIdx > -1) {
            newReactions[targetIdx] = {
              ...newReactions[targetIdx],
              count: newReactions[targetIdx].count + 1,
              reacted_by_me: true,
              users: [
                ...newReactions[targetIdx].users,
                { id: String(currentUserId), name: myUserName || "You" },
              ],
            };
          } else {
            newReactions.push({
              emoji,
              count: 1,
              reacted_by_me: true,
              users: [{ id: String(currentUserId), name: myUserName || "You" }],
            });
          }
        }

        return { ...m, reactions: newReactions };
      });
    });

    reactMutation.mutate({ messageId, emoji });
  };

  // TanStack Mutation: Delete Conversation from Sidebar
  const deleteConversationMutation = useMutation({
    mutationFn: async (convId: string) => {
      await deleteConversation(convId);
    },
    onSuccess: (_, convId) => {
      queryClient.setQueryData<Conversation[]>(["conversations"], (old = []) =>
        old.filter((c) => c.id !== convId)
      );
      if (activeConversationId === convId) {
        const remaining = conversations.filter((c) => c.id !== convId);
        setActiveConversationId(remaining[0]?.id || null);
      }
      refetchConversations();
      Swal.fire({
        title: "Deleted!",
        text: "The conversation has been deleted successfully.",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
        customClass: {
          popup: "rounded-4 shadow",
        },
      });
    },
  });

  const handleDeleteConversation = (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    Swal.fire({
      title: "Delete Conversation?",
      text: "Are you sure you want to delete this conversation? This will remove the chat history from your view.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, delete it",
      cancelButtonText: "Cancel",
      reverseButtons: true,
      customClass: {
        popup: "rounded-4 shadow-lg",
        confirmButton: "btn btn-danger px-4 py-2 rounded-pill fw-bold",
        cancelButton: "btn btn-secondary px-4 py-2 rounded-pill fw-bold me-2",
      },
      buttonsStyling: false,
    }).then((result) => {
      if (result.isConfirmed) {
        deleteConversationMutation.mutate(convId);
      }
    });
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

  // Trigger reply on a message
  const handleInitiateReply = (msg: Message) => {
    setReplyingTo(msg);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Swipe-to-reply Touch Handlers (WhatsApp mobile & touch gestures)
  const handleTouchStart = (e: React.TouchEvent, msgId: string) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    isSwipingRef.current = false;
    setSwipingMsgId(msgId);
  };

  const handleTouchMove = (e: React.TouchEvent, msg: Message) => {
    const deltaX = e.touches[0].clientX - touchStartXRef.current;
    const deltaY = Math.abs(e.touches[0].clientY - touchStartYRef.current);

    if (deltaY > 30 && !isSwipingRef.current) {
      return;
    }

    if (deltaX > 8) {
      isSwipingRef.current = true;
      const offset = Math.min(deltaX * 0.6, 68);
      setSwipeOffset(offset);
    }
  };

  const handleTouchEnd = (msg: Message) => {
    if (swipeOffset >= 40) {
      handleInitiateReply(msg);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate(25);
        } catch {}
      }
    }
    setSwipingMsgId(null);
    setSwipeOffset(0);
    isSwipingRef.current = false;
  };

  // TanStack Mutation: Send Message (supports reply_to)
  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!activeConversationId || (!inputContent.trim() && selectedFiles.length === 0)) return;
      return await sendMessageWithAttachments(
        activeConversationId,
        inputContent.trim(),
        selectedFiles,
        replyingTo?.id || null
      );
    },
    onSuccess: (newMsg) => {
      if (!newMsg || !activeConversationId) return;

      setInputContent("");
      setSelectedFiles([]);
      setFilePreviews([]);
      setReplyingTo(null);

      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }

      queryClient.setQueryData<Message[]>(["messages", activeConversationId], (old = []) => {
        if (old.some((m) => m.id === newMsg.id)) return old;
        return [...old, newMsg];
      });

      queryClient.setQueryData<Conversation[]>(["conversations"], (old = []) =>
        old.map((c) =>
          c.id === activeConversationId
            ? { ...c, last_message: newMsg, updated_at: new Date().toISOString() }
            : c
        )
      );

      scrollToBottom(true);
    },
  });

  // Drag and Drop state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragCounter = useRef<number>(0);

  // Dedicated file & media download handler
  // Dedicated one-click file & media & PDF download handler
  const [downloadingFileUrl, setDownloadingFileUrl] = useState<string | null>(null);

  const handleDownloadFile = async (
    e: React.MouseEvent,
    fileUrl: string,
    fileName?: string
  ) => {
    e.stopPropagation();
    e.preventDefault();

    if (!fileUrl) return;

    const safeName =
      fileName ||
      fileUrl.split("/").pop()?.split("?")[0] ||
      `attendstack-doc-${Date.now()}`;

    setDownloadingFileUrl(fileUrl);

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // 1. Try Blob fetch
      const response = await fetch(fileUrl, {
        headers,
        mode: "cors",
      }).catch(() => fetch(fileUrl));

      if (response && response.ok) {
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = safeName;
        link.setAttribute("download", safeName);
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 3000);
      } else {
        // 2. Direct anchor click fallback
        const link = document.createElement("a");
        link.href = fileUrl;
        link.target = "_blank";
        link.download = safeName;
        link.setAttribute("download", safeName);
        link.rel = "noopener noreferrer";
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.warn("Direct download fallback to window.open:", err);
      window.open(fileUrl, "_blank", "noopener,noreferrer");
    } finally {
      setTimeout(() => setDownloadingFileUrl(null), 600);
    }
  };

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB limit

  // Helper to add files
  const addFiles = useCallback((newFiles: File[]) => {
    if (!newFiles || newFiles.length === 0) return;

    const oversizedFiles: { name: string; sizeMB: string }[] = [];
    const validFiles: File[] = [];

    newFiles.forEach((file, idx) => {
      if (file.size > MAX_FILE_SIZE) {
        oversizedFiles.push({
          name: file.name || `Attachment ${idx + 1}`,
          sizeMB: (file.size / (1024 * 1024)).toFixed(1),
        });
      } else {
        if (file.name === "image.png" || !file.name || file.name === "blob") {
          const ext = file.type.split("/")[1]?.replace("+xml", "") || "png";
          const newName = `pasted-image-${Date.now()}-${idx + 1}.${ext}`;
          validFiles.push(new File([file], newName, { type: file.type || "image/png" }));
        } else {
          validFiles.push(file);
        }
      }
    });

    if (oversizedFiles.length > 0) {
      const fileListHtml = oversizedFiles
        .map(
          (f) =>
            `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; font-size:13px; background:#fff; border:1px solid #fee2e2; border-radius:6px; padding:6px 10px;">
              <span style="font-weight:600; color:#1e293b; max-width:210px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${f.name}</span>
              <span style="color:#ef4444; font-weight:700; background:#fef2f2; padding:2px 8px; border-radius:12px; font-size:11.5px;">${f.sizeMB} MB</span>
            </div>`
        )
        .join("");

      Swal.fire({
        icon: "warning",
        title: "File Exceeds 10 MB Limit",
        html: `
          <p style="font-size:13.5px; color:#64748b; margin-bottom:12px; line-height:1.5;">
            Only files up to <strong>10 MB</strong> are allowed in chat. The following file(s) exceed the size limit:
          </p>
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px; text-align:left; margin-bottom:12px;">
            ${fileListHtml}
          </div>
        `,
        confirmButtonText: "Got it",
        customClass: {
          popup: "rounded-4 shadow-lg",
          confirmButton: "btn btn-primary px-4 py-2 rounded-pill fw-bold",
        },
        buttonsStyling: false,
      });
    }

    if (validFiles.length === 0) return;

    setSelectedFiles((prev) => [...prev, ...validFiles]);

    const newPreviews = validFiles.map((file) => ({
      url: URL.createObjectURL(file),
      type: file.type,
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
    }));
    setFilePreviews((prev) => [...prev, ...newPreviews]);

    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    addFiles(files);
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setFilePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Clipboard Paste Handler (Ctrl+V image / screenshot paste)
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (e.clipboardData) {
      const items = Array.from(e.clipboardData.items || []);
      const fileItems = items.filter((item) => item.kind === "file");
      if (fileItems.length > 0) {
        e.preventDefault();
        const files: File[] = [];
        fileItems.forEach((item) => {
          const file = item.getAsFile();
          if (file) files.push(file);
        });
        if (files.length > 0) {
          addFiles(files);
        }
      }
    }
  };

  // Global window paste listener
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      if (!activeConversationId) return;
      const target = e.target as HTMLElement;
      if (target === inputRef.current) return;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;

      if (e.clipboardData && e.clipboardData.items) {
        const items = Array.from(e.clipboardData.items);
        const fileItems = items.filter((item) => item.kind === "file");
        if (fileItems.length > 0) {
          e.preventDefault();
          const files: File[] = [];
          fileItems.forEach((item) => {
            const file = item.getAsFile();
            if (file) files.push(file);
          });
          if (files.length > 0) {
            addFiles(files);
          }
        }
      }
    };

    window.addEventListener("paste", handleGlobalPaste);
    return () => window.removeEventListener("paste", handleGlobalPaste);
  }, [activeConversationId, addFiles]);

  // Drag and drop event handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      setIsDragging(false);
      dragCounter.current = 0;
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      addFiles(droppedFiles);
    }
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
    } else if (e.key === "Escape" && replyingTo) {
      setReplyingTo(null);
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

  const handleStartDirectChat = (user: UserMinimal) => {
    const existingConv = conversations.find((c) => {
      if (c.type !== "DIRECT") return false;
      if (c.other_user) {
        if (String(c.other_user.id) === String(user.id)) return true;
        if (c.other_user.email && user.email && c.other_user.email.toLowerCase() === user.email.toLowerCase()) return true;
      }
      if (c.members && c.members.length > 0) {
        const otherMember = c.members.find(
          (m) => String(m.user?.id) !== String(currentUserId)
        );
        if (otherMember) {
          if (String(otherMember.user?.id) === String(user.id)) return true;
          if (otherMember.user?.email && user.email && otherMember.user?.email?.toLowerCase() === user.email?.toLowerCase()) return true;
        }
      }
      return false;
    });

    if (existingConv) {
      selectConversation(existingConv);
      setShowDirectModal(false);
      return;
    }

    createDirectChatMutation.mutate(user);
  };

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
    setShowGroupModal(true);
    setGroupName("");
    setSelectedGroupMembers([]);
    setUserQuery("");
    handleSearchUsers("");
  };

  // Filter conversations
  const filteredConversations = useMemo(() => {
    const seenDirectUserIds = new Set<string>();

    return conversations.filter((c) => {
      if (c.type === "DIRECT" && c.members && currentUserId) {
        const otherUserId = c.members.some((m) => String(m.user.id) !== String(currentUserId))
          ? String(c.members.find((m) => String(m.user.id) !== String(currentUserId))!.user.id)
          : null;

        if (otherUserId) {
          if (seenDirectUserIds.has(otherUserId)) {
            return false;
          }
          seenDirectUserIds.add(otherUserId);
        }
      }

      const matchesSearch = (c.display_name || c.name || "").toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (convFilter === "direct") return c.type === "DIRECT";
      if (convFilter === "group") return c.type === "GROUP";
      return true;
    });
  }, [conversations, searchQuery, convFilter, currentUserId]);

  // Active members filter for user search
  const activeUserSearchResults = useMemo(() => {
    return userSearchResults.filter((u) => {
      if (u.is_active === false) return false;
      if (u.status && u.status.toUpperCase() !== "ACTIVE") return false;
      if (u.employment_status && u.employment_status.toUpperCase() !== "ACTIVE") return false;
      if (u.role === "SUPER_ADMIN" || u.role === "ADMIN") return false;
      return true;
    });
  }, [userSearchResults]);

  // Render text with highlighted @mentions & search highlights
  const renderTextWithMentionsAndHighlights = (content: string) => {
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

      if (inChatMessageQuery.trim()) {
        const q = inChatMessageQuery.trim();
        const searchRegex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
        const subParts = part.split(searchRegex);
        return (
          <React.Fragment key={idx}>
            {subParts.map((sub, sIdx) =>
              sub.toLowerCase() === q.toLowerCase() ? (
                <mark key={sIdx} className="bg-warning bg-opacity-75 text-dark rounded px-0.5">
                  {sub}
                </mark>
              ) : (
                sub
              )
            )}
          </React.Fragment>
        );
      }

      return part;
    });
  };

  // Input change handler supporting @mentions
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputContent(val);

    const textarea = e.target;
    textarea.style.height = "auto";
    const newHeight = Math.min(textarea.scrollHeight, 150);
    textarea.style.height = `${newHeight}px`;

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

    if (wsRef.current?.ws && wsRef.current.ws.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.ws.send(
          JSON.stringify({
            action: "typing",
            is_typing: val.trim().length > 0,
          })
        );
      } catch {}
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

  // Render date separators & message bubbles
  const renderMessagesWithDateSeparators = () => {
    const elements: React.ReactNode[] = [];
    let lastDateLabel = "";

    displayedMessages.forEach((msg) => {
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

      const senderPhoto = (msg.sender as any)?.profile_photo_url || (msg.sender as any)?.avatar || (isMe ? myProfilePhoto : null);
      const senderName = msg.sender?.name || msg.sender?.email || (isMe ? myUserName || "You" : "User");
      const hasReactions = msg.reactions && msg.reactions.length > 0;
      const isHighlighted = highlightedMsgId === msg.id;

      const isBeingSwiped = swipingMsgId === msg.id;
      const currentSwipeX = isBeingSwiped ? swipeOffset : 0;

      elements.push(
        <div
          key={msg.id}
          id={`msg-${msg.id}`}
          className={`chat-message-row ${isMe ? "sent" : "received"} ${hasReactions ? "has-reactions" : ""} ${isHighlighted ? "highlight-flash" : ""} position-relative`}
          onTouchStart={(e) => handleTouchStart(e, msg.id)}
          onTouchMove={(e) => handleTouchMove(e, msg)}
          onTouchEnd={() => handleTouchEnd(msg)}
        >
          {/* Swipe-to-Reply curved icon indicator behind the bubble */}
          {isBeingSwiped && currentSwipeX > 8 && (
            <div
              className="chat-swipe-reply-icon-wrap"
              style={{
                opacity: Math.min(currentSwipeX / 40, 1),
                transform: `scale(${Math.min(currentSwipeX / 40, 1)})`,
              }}
            >
              <div className="chat-swipe-reply-icon-circle">
                <Reply size={16} />
              </div>
            </div>
          )}

          {/* Avatar for received messages */}
          {!isMe && (
            <SafeAvatar
              src={senderPhoto}
              name={senderName}
              size={30}
              fontSize={11}
              className="chat-msg-avatar mb-1 me-1"
            />
          )}

          <div
            className={`chat-bubble ${isMe ? "bubble-sent" : "bubble-received"} ${activeActionBarMsgId === msg.id ? "active-bubble-focused" : ""}`}
            style={{
              transform: currentSwipeX > 0 ? `translateX(${currentSwipeX}px)` : undefined,
              transition: isBeingSwiped ? "none" : "transform 0.2s cubic-bezier(0.18, 0.89, 0.32, 1.28)",
              cursor: "pointer",
            }}
            onClick={(e) => {
              e.stopPropagation();
              setActiveActionBarMsgId((prev) => (prev === msg.id ? null : msg.id));
            }}
          >
            {/* WhatsApp-Style Click-to-Show Reaction & Action Bar */}
            {activeActionBarMsgId === msg.id && (
              <div className="chat-quick-reactions-bar shadow-sm" onClick={(e) => e.stopPropagation()}>
                {CORPORATE_REACTIONS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    className="quick-reaction-btn"
                    title={`React ${em}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleReaction(msg.id, em);
                      setActiveActionBarMsgId(null);
                    }}
                  >
                    {em}
                  </button>
                ))}

                {/* Quick Reply Button on Action Bar */}
                <button
                  type="button"
                  className="quick-reaction-btn reply-quick-btn"
                  title="Reply to message"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleInitiateReply(msg);
                    setActiveActionBarMsgId(null);
                  }}
                >
                  <CornerUpLeft size={14} />
                </button>

                {/* Message 3-dots Dropdown Actions */}
                <Dropdown align="end" className="d-inline-block">
                  <Dropdown.Toggle
                    variant="light"
                    size="sm"
                    className="quick-reaction-btn no-caret border-0 bg-transparent p-0 d-flex align-items-center justify-content-center"
                  >
                    <MoreVertical size={13} />
                  </Dropdown.Toggle>
                  <Dropdown.Menu className="shadow-lg border rounded-3 py-1 dropdown-menu-end" style={{ minWidth: "150px", zIndex: 1060 }}>
                    <Dropdown.Item
                      className="d-flex align-items-center gap-2 text-secondary px-3 py-1.5 small"
                      onClick={() => {
                        handleInitiateReply(msg);
                        setActiveActionBarMsgId(null);
                      }}
                    >
                      <Reply size={13} />
                      <span>Reply</span>
                    </Dropdown.Item>
                    {msg.content && (
                      <Dropdown.Item
                        className="d-flex align-items-center gap-2 text-secondary px-3 py-1.5 small"
                        onClick={() => {
                          handleCopyMessage(msg.id, msg.content);
                          setActiveActionBarMsgId(null);
                        }}
                      >
                        <Copy size={13} />
                        <span>{copiedMsgId === msg.id ? "Copied!" : "Copy Text"}</span>
                      </Dropdown.Item>
                    )}
                    <Dropdown.Item
                      className="d-flex align-items-center gap-2 text-secondary px-3 py-1.5 small"
                      onClick={() => {
                        setForwardMsg(msg);
                        setForwardSearch("");
                        setForwardedConvIds([]);
                        setActiveActionBarMsgId(null);
                      }}
                    >
                      <CornerUpRight size={13} />
                      <span>Forward</span>
                    </Dropdown.Item>
                    {canDelete && (
                      <>
                        <Dropdown.Divider className="my-1" />
                        <Dropdown.Item
                          className="d-flex align-items-center gap-2 text-danger px-3 py-1.5 small"
                          onClick={() => {
                            handleDeleteMessage(msg.id);
                            setActiveActionBarMsgId(null);
                          }}
                        >
                          <Trash2 size={13} />
                          <span>Delete</span>
                        </Dropdown.Item>
                      </>
                    )}
                  </Dropdown.Menu>
                </Dropdown>
              </div>
            )}

            {/* Sender name for group chat */}
            {!isMe && activeConversation?.type === "GROUP" && (
              <span className="chat-sender-name">
                {msg.sender?.name || msg.sender?.email}
              </span>
            )}

            {/* Quoted Message Snippet (If this message is a reply) */}
            {msg.reply_to && (
              <div
                className="chat-quoted-bubble-card mb-1.5 p-2 rounded-2 cursor-pointer"
                onClick={() => scrollToQuotedMessage(msg.reply_to!.id)}
                title="Click to jump to quoted message"
              >
                <span
                  className="chat-quoted-sender fw-bold d-block mb-0.5"
                  style={{
                    color: getAvatarColor(msg.reply_to.sender?.name || msg.reply_to.sender?.email || "User"),
                    fontSize: "11.5px",
                  }}
                >
                  {msg.reply_to.sender?.name || msg.reply_to.sender?.email || "User"}
                </span>
                <span className="chat-quoted-snippet text-truncate d-block small" style={{ fontSize: "12px", color: "#475569" }}>
                  {msg.reply_to.is_deleted ? (
                    <em className="text-muted">This message was deleted</em>
                  ) : (
                    msg.reply_to.content || `[${msg.reply_to.message_type || "Attachment"}]`
                  )}
                </span>
              </div>
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
                  {renderTextWithMentionsAndHighlights(msg.content || "")}
                </p>
                {msg.requires_acknowledgement && (
                  <div
                    className="d-flex align-items-center justify-content-between pt-2 border-top mt-1"
                    style={{ borderColor: "rgba(165, 180, 252, 0.6)" }}
                  >
                    <small className="fw-semibold" style={{ fontSize: "11.5px", color: "#475569" }}>
                      {msg.acknowledged_count || 0} acknowledged
                    </small>
                    {msg.is_acknowledged_by_me ? (
                      <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2.5 py-1" style={{ fontSize: "11px", fontWeight: 600 }}>
                        <Check size={12} className="me-1" /> Acknowledged
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
                <p className="chat-text">{renderTextWithMentionsAndHighlights(msg.content)}</p>
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
              <div className="chat-attachments mt-1">
                {msg.attachments.map((att) => {
                  const isImg = att.file_type?.startsWith("image/") || (att.file && /\.(png|jpe?g|gif|webp|svg)$/i.test(att.file));
                  const isVid = att.file_type?.startsWith("video/") || (att.file && /\.(mp4|webm|mov|ogg|mkv)$/i.test(att.file));
                  const fileName = att.file ? att.file.split("/").pop()?.split("?")[0] || "Attachment" : "Attachment";
                  const fileSizeStr = att.file_size ? (
                    att.file_size < 1024 * 1024 
                      ? `${Math.round(att.file_size / 1024)} kB`
                      : `${(att.file_size / (1024 * 1024)).toFixed(1)} MB`
                  ) : "";

                  if (isImg) {
                    return (
                      <div
                        key={att.id}
                        className="whatsapp-media-card position-relative overflow-hidden rounded-2"
                        style={{ cursor: "pointer", maxWidth: "330px" }}
                        onClick={() =>
                          setPreviewMedia({
                            url: att.file_url,
                            type: "image",
                            name: fileName,
                            size: fileSizeStr,
                          })
                        }
                      >
                        <BSImage
                          src={att.file_url}
                          alt={fileName}
                          className="w-100"
                          style={{ maxHeight: "280px", objectFit: "cover", borderRadius: "6px", display: "block" }}
                        />
                        <div className="whatsapp-media-overlay position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center">
                          <button
                            className="btn btn-dark bg-opacity-75 text-white rounded-circle p-2 border-0 shadow"
                            title="Download Image"
                            onClick={(e) => handleDownloadFile(e, att.file_url, fileName)}
                          >
                            <Download size={18} />
                          </button>
                        </div>
                      </div>
                    );
                  }

                  if (isVid) {
                    return (
                      <div key={att.id} className="whatsapp-video-card rounded-2 overflow-hidden bg-black position-relative" style={{ maxWidth: "330px" }}>
                        <div className="d-flex align-items-center justify-content-between p-2 bg-dark bg-opacity-80 text-white small">
                          <div className="d-flex align-items-center gap-1.5 overflow-hidden text-truncate me-2">
                            <VideoIcon size={14} className="text-primary flex-shrink-0" />
                            <span className="text-truncate fw-semibold" style={{ fontSize: "12px" }}>{fileName}</span>
                            {fileSizeStr && <span className="badge bg-secondary py-0.5 px-1.5" style={{ fontSize: "10px" }}>{fileSizeStr}</span>}
                          </div>
                          <div className="d-flex align-items-center gap-1">
                            <button
                              className="btn btn-sm btn-dark text-white p-1 rounded border-0"
                              title="Full Preview"
                              onClick={() =>
                                setPreviewMedia({
                                  url: att.file_url,
                                  type: "video",
                                  name: fileName,
                                  size: fileSizeStr,
                                })
                              }
                            >
                              <Maximize2 size={13} />
                            </button>
                            <button
                              className="btn btn-sm btn-primary text-white p-1 rounded border-0 d-flex align-items-center gap-1"
                              title="Download Video"
                              onClick={(e) => handleDownloadFile(e, att.file_url, fileName)}
                            >
                              <Download size={13} />
                            </button>
                          </div>
                        </div>
                        <video
                          controls
                          preload="metadata"
                          playsInline
                          className="w-100"
                          style={{ maxHeight: "260px", display: "block" }}
                        >
                          <source src={att.file_url} type={att.file_type || "video/mp4"} />
                          Your browser does not support playing this video format.
                        </video>
                      </div>
                    );
                  }

                  const fileMeta = getFileMeta(fileName);

                  return (
                    <div
                      key={att.id}
                      className="whatsapp-file-card d-flex align-items-center justify-content-between p-2 rounded-2"
                      onClick={(e) => handleDownloadFile(e, att.file_url, fileName)}
                    >
                      <div className="d-flex align-items-center gap-2.5 overflow-hidden me-2">
                        <div
                          className="whatsapp-doc-badge d-flex flex-column align-items-center justify-content-center flex-shrink-0 rounded-1"
                          style={{
                            width: "36px",
                            height: "44px",
                            backgroundColor: fileMeta.color,
                            color: "#ffffff",
                          }}
                        >
                          <FileText size={18} strokeWidth={2.2} />
                          <span style={{ fontSize: "8.5px", fontWeight: 800, marginTop: "1px", letterSpacing: "0.03em" }}>
                            {fileMeta.label}
                          </span>
                        </div>
                        <div className="d-flex flex-column overflow-hidden text-start">
                          <span
                            className="fw-semibold text-truncate"
                            title={fileName}
                            style={{
                              color: "#111b21",
                              fontSize: "13.5px",
                              lineHeight: "1.35",
                            }}
                          >
                            {fileName}
                          </span>
                          <span
                            style={{
                              color: "#667781",
                              fontSize: "11px",
                              marginTop: "2px",
                              fontWeight: 400,
                            }}
                          >
                            {fileMeta.label} • {fileSizeStr || "Document"}
                          </span>
                        </div>
                      </div>
                      <button
                        className="whatsapp-download-btn btn p-1.5 rounded-circle border-0 d-flex align-items-center justify-content-center flex-shrink-0"
                        title={`Download ${fileName}`}
                        disabled={downloadingFileUrl === att.file_url}
                        onClick={(e) => handleDownloadFile(e, att.file_url, fileName)}
                      >
                        {downloadingFileUrl === att.file_url ? (
                          <Spinner animation="border" size="sm" style={{ width: "16px", height: "16px" }} />
                        ) : (
                          <Download size={19} strokeWidth={2} />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottom metadata (timestamp + status checks) */}
            <div className="chat-bubble-meta">
              <span className="chat-time">{timeStr}</span>
              {isMe && <CheckCheck size={13} className="chat-read-icon" />}
            </div>

            {/* WhatsApp-style Overlapping Reaction Badges (Transparent background) */}
            {hasReactions && (
              <div className="chat-msg-reactions-container">
                {msg.reactions!.map((r) => {
                  const userNames = r.users.map((u) => (String(u.id) === String(currentUserId) ? "You" : u.name)).join(", ");
                  const tooltipText = `${userNames} reacted with ${r.emoji}`;

                  return (
                    <OverlayTrigger
                      key={r.emoji}
                      placement="top"
                      overlay={<Tooltip id={`tooltip-reaction-${msg.id}-${r.emoji}`}>{tooltipText}</Tooltip>}
                    >
                      <button
                        type="button"
                        className={`chat-reaction-badge ${r.reacted_by_me ? "active-reaction" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleReaction(msg.id, r.emoji);
                        }}
                      >
                        <span className="reaction-emoji">{r.emoji}</span>
                        {r.count > 1 && (
                          <span className="reaction-count">{r.count}</span>
                        )}
                      </button>
                    </OverlayTrigger>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      );
    });

    return elements;
  };

  if (isFeatureLocked) {
    return (
      <PlanFeatureLockedPaywall
        featureTitle="Team Chat & Direct Messaging"
        featureDescription="Internal 1-on-1 team chat, group channels, file attachments, and broadcast announcements are locked under your current plan."
        benefits={[
          "Real-time instant direct messaging across all employees",
          "Department & project-specific group channels",
          "File attachments, images, and document sharing",
          "Priority company-wide announcement broadcasts",
        ]}
        requiredTier="Growth Pro or Enterprise"
      />
    );
  }

  return (
    <>
      <div className="chat-app-container">
        {/* === LEFT PANEL: Conversation List === */}
        <div className={`chat-sidebar ${mobileView === "list" ? "mobile-show" : "mobile-hide"}`}>
          {/* Sidebar Header */}
          <div className="chat-sidebar-header">
            <div className="chat-sidebar-title-row">
              <div className="chat-sidebar-title d-flex align-items-center gap-2.5 min-w-0">
                <SafeAvatar
                  src={myProfilePhoto}
                  name={myUserName || "User"}
                  size={38}
                  fontSize={14}
                  className="shadow-xs border border-2 border-white flex-shrink-0"
                />
                <div className="text-truncate">
                  <h2 className="mb-0 text-dark fw-bold" style={{ fontSize: "16px", whiteSpace: "nowrap" }}>Team Chat</h2>
                  <span className="chat-count text-muted small">{conversations.length} conversations</span>
                </div>
              </div>
              <div className="chat-sidebar-actions d-flex align-items-center gap-1.5 flex-shrink-0">
                {/* Audio Chime Mute/Unmute */}
                <button
                  className={`chat-icon-btn ${isSoundMuted ? "text-muted opacity-60" : "text-success"}`}
                  title={isSoundMuted ? "Audio Chime Muted (Click to Unmute)" : "Audio Chime Active (Click to Mute)"}
                  onClick={handleToggleSound}
                >
                  {isSoundMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>

                {/* Notification Enable / Test Button */}
                <button
                  className={`chat-icon-btn ${notificationPermission === "granted" ? "text-primary" : "text-warning border-warning-subtle"}`}
                  title={
                    notificationPermission === "granted"
                      ? "Browser Notifications Active (Click to Test)"
                      : "Click to Enable Browser Notifications"
                  }
                  onClick={handleEnableNotifications}
                >
                  {notificationPermission === "granted" ? <Bell size={16} /> : <BellOff size={16} />}
                </button>

                {/* New Chat Actions Dropdown */}
                <Dropdown align="end" className="d-inline-block">
                  <Dropdown.Toggle
                    as="button"
                    className="chat-icon-btn accent no-caret border-0 d-flex align-items-center justify-content-center"
                    title="New Chat Actions"
                  >
                    <PlusCircle size={18} />
                  </Dropdown.Toggle>
                  <Dropdown.Menu className="shadow-lg border rounded-3 py-1 dropdown-menu-end" style={{ minWidth: "190px", zIndex: 1060 }}>
                    <Dropdown.Item
                      className="d-flex align-items-center gap-2 text-dark px-3 py-2 small fw-semibold"
                      onClick={openDirectModal}
                    >
                      <User size={15} className="text-primary" />
                      <span>Direct Message</span>
                    </Dropdown.Item>

                    {userRole !== "EMPLOYEE" && (
                      <Dropdown.Item
                        className="d-flex align-items-center gap-2 text-dark px-3 py-2 small fw-semibold"
                        onClick={openGroupModal}
                      >
                        <Users size={15} className="text-primary" />
                        <span>Create Group Chat</span>
                      </Dropdown.Item>
                    )}

                    {userRole !== "EMPLOYEE" && (
                      <Dropdown.Item
                        className="d-flex align-items-center gap-2 text-dark px-3 py-2 small fw-semibold"
                        onClick={() => setShowAnnouncementModal(true)}
                      >
                        <Megaphone size={15} className="text-warning" />
                        <span>Broadcast Announcement</span>
                      </Dropdown.Item>
                    )}
                  </Dropdown.Menu>
                </Dropdown>
              </div>
            </div>

            {/* Notification Permission Banner */}
            {notificationPermission !== "granted" && (
              <div className="d-flex align-items-center justify-content-between p-2 mb-2.5 bg-primary-subtle border border-primary-subtle rounded-3">
                <div className="d-flex align-items-center gap-2 overflow-hidden">
                  <Bell size={15} className="text-primary flex-shrink-0" />
                  <span className="small text-primary fw-semibold text-truncate" style={{ fontSize: "11.5px" }}>
                    Enable background alerts
                  </span>
                </div>
                <button
                  className="btn btn-primary btn-sm rounded-pill px-2.5 py-0.5 fw-semibold shadow-xs"
                  style={{ fontSize: "11px" }}
                  onClick={handleEnableNotifications}
                >
                  Turn On
                </button>
              </div>
            )}

            {/* Conversation Filter Tabs */}
            <div className="d-flex gap-1 mb-2 bg-light p-1 rounded-3">
              <button
                type="button"
                className={`btn btn-sm flex-fill rounded-2 fw-semibold py-1 ${convFilter === "all" ? "bg-white text-primary shadow-xs" : "text-muted border-0"}`}
                style={{ fontSize: "12px" }}
                onClick={() => setConvFilter("all")}
              >
                All
              </button>
              <button
                type="button"
                className={`btn btn-sm flex-fill rounded-2 fw-semibold py-1 ${convFilter === "direct" ? "bg-white text-primary shadow-xs" : "text-muted border-0"}`}
                style={{ fontSize: "12px" }}
                onClick={() => setConvFilter("direct")}
              >
                Direct
              </button>
              <button
                type="button"
                className={`btn btn-sm flex-fill rounded-2 fw-semibold py-1 ${convFilter === "group" ? "bg-white text-primary shadow-xs" : "text-muted border-0"}`}
                style={{ fontSize: "12px" }}
                onClick={() => setConvFilter("group")}
              >
                Groups
              </button>
            </div>

            {/* Search */}
            <div className="chat-search-box">
              <Search size={15} className="chat-search-icon" />
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
                <p className="mt-2">Loading chats...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="chat-empty-state">
                <div className="chat-empty-icon">
                  <MessageSquare size={28} />
                </div>
                <h6>No conversations yet</h6>
                <p>Start a new chat with your team members</p>
                <Button variant="outline-primary" size="sm" className="rounded-pill px-3 mt-2" onClick={openDirectModal}>
                  Start Chat
                </Button>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isActive = activeConversationId === conv.id;
                return (
                  <div
                    key={conv.id}
                    onClick={() => selectConversation(conv)}
                    className={`chat-conv-item ${isActive ? "active" : ""}`}
                  >
                    <SafeAvatar
                      src={conv.avatar}
                      name={conv.display_name || "Chat"}
                      size={42}
                      fontSize={15}
                      isGroup={conv.type === "GROUP"}
                      showOnlineDot={conv.type === "DIRECT"}
                      className="flex-shrink-0"
                    />

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

                    <div className="chat-conv-delete-wrap ms-1">
                      <Button
                        variant="link"
                        size="sm"
                        className="p-1 text-danger border-0 opacity-75"
                        title="Delete conversation"
                        onClick={(e) => handleDeleteConversation(e, conv.id)}
                      >
                        <Trash2 size={15} />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* === RIGHT PANEL: Chat Area === */}
        <div
          className={`chat-main position-relative ${mobileView === "chat" ? "mobile-show" : "mobile-hide"}`}
          onDragEnter={activeConversation ? handleDragEnter : undefined}
          onDragLeave={activeConversation ? handleDragLeave : undefined}
          onDragOver={activeConversation ? handleDragOver : undefined}
          onDrop={activeConversation ? handleDrop : undefined}
        >
          {/* Drag & Drop Visual Overlay */}
          {isDragging && activeConversation && (
            <div className="chat-dropzone-overlay">
              <div className="chat-dropzone-box">
                <div className="chat-dropzone-icon-pulse">
                  <UploadCloud size={44} className="text-primary" />
                </div>
                <h5 className="fw-bold text-dark mt-3 mb-1">Drop files here to send</h5>
                <p className="text-muted small mb-0">Images, videos, documents, or screenshots</p>
              </div>
            </div>
          )}

          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div className="chat-header">
                <div className="chat-header-left">
                  <button
                    className="chat-back-btn"
                    onClick={() => setMobileView("list")}
                    title="Back to conversation list"
                  >
                    <ArrowLeft size={18} />
                  </button>

                  <SafeAvatar
                    src={activeConversation.avatar}
                    name={activeConversation.display_name || "Chat"}
                    size={40}
                    fontSize={15}
                    isGroup={activeConversation.type === "GROUP"}
                    className="flex-shrink-0 shadow-xs"
                  />

                  <div className="chat-header-info">
                    <h3>{activeConversation.display_name}</h3>
                    <span className="chat-header-meta">
                      {activeConversation.type === "GROUP"
                        ? `${activeConversation.members?.length || 0} members`
                        : "Active Now"}
                    </span>
                  </div>
                </div>

                <div className="chat-header-right d-flex align-items-center gap-1">
                  <button
                    className={`chat-icon-btn ${showInChatSearch ? "active" : ""}`}
                    title="Search in conversation"
                    onClick={() => {
                      setShowInChatSearch((prev) => !prev);
                      if (showInChatSearch) setInChatMessageQuery("");
                    }}
                  >
                    <Search size={16} />
                  </button>

                  <Dropdown align="end">
                    <Dropdown.Toggle variant="light" size="sm" className="chat-icon-btn no-caret border-0">
                      <MoreVertical size={16} />
                    </Dropdown.Toggle>
                    <Dropdown.Menu className="shadow-lg border rounded-3 py-1 dropdown-menu-end">
                      <Dropdown.Item onClick={() => refetchMessages()} className="small px-3 py-1.5">
                        Refresh Messages
                      </Dropdown.Item>
                      {userRole !== "EMPLOYEE" && (
                        <Dropdown.Item onClick={() => setShowAnnouncementModal(true)} className="small px-3 py-1.5">
                          <Megaphone size={13} className="me-2 text-primary" /> Broadcast Announcement
                        </Dropdown.Item>
                      )}
                      <Dropdown.Divider className="my-1" />
                      <Dropdown.Item className="text-danger small px-3 py-1.5" onClick={() => setShowClearModal(true)}>
                        <Trash2 size={13} className="me-2" /> Clear Chat History
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                </div>
              </div>

              {/* In-Chat Message Search Bar */}
              {showInChatSearch && (
                <div className="chat-in-chat-search-bar d-flex align-items-center justify-content-between p-2 px-3 bg-light border-bottom">
                  <div className="d-flex align-items-center gap-2 flex-grow-1">
                    <Search size={15} className="text-muted flex-shrink-0" />
                    <input
                      type="text"
                      className="form-control form-control-sm bg-white border shadow-none"
                      placeholder="Search messages in this conversation..."
                      value={inChatMessageQuery}
                      onChange={(e) => setInChatMessageQuery(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="d-flex align-items-center gap-2 ms-2">
                    {inChatMessageQuery && (
                      <span className="badge bg-secondary-subtle text-secondary small">
                        {displayedMessages.length} found
                      </span>
                    )}
                    <button
                      className="btn btn-sm btn-link text-muted p-1"
                      onClick={() => {
                        setShowInChatSearch(false);
                        setInChatMessageQuery("");
                      }}
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
              )}

              {/* Pinned Company Announcement Banner */}
              {pinnedAnnouncement && (
                <div className="chat-pinned-announcement-banner d-flex align-items-center justify-content-between p-2.5 px-3 border-bottom shadow-xs">
                  <div className="d-flex align-items-center gap-2 overflow-hidden me-2">
                    <Pin size={15} className="text-primary flex-shrink-0" />
                    <span className="fw-bold text-dark small flex-shrink-0">Announcement:</span>
                    <span className="text-truncate text-secondary small">{pinnedAnnouncement.content}</span>
                  </div>
                  {pinnedAnnouncement.requires_acknowledgement && !pinnedAnnouncement.is_acknowledged_by_me && (
                    <Button
                      variant="primary"
                      size="sm"
                      className="rounded-pill px-2.5 py-0.5 border-0 flex-shrink-0 fw-semibold"
                      style={{ backgroundColor: "#6366f1", fontSize: "11px" }}
                      onClick={() => acknowledgeMutation.mutate(pinnedAnnouncement.id)}
                    >
                      Acknowledge
                    </Button>
                  )}
                </div>
              )}

              {/* Messages Flex Scroll Area */}
              <div
                className="chat-messages-area"
                ref={chatMessagesAreaRef}
                onScroll={handleScrollArea}
              >
                {loadingMessages ? (
                  <div className="chat-empty-state">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-2">Loading messages...</p>
                  </div>
                ) : displayedMessages.length === 0 ? (
                  <div className="chat-empty-state" style={{ marginTop: "auto", marginBottom: "auto" }}>
                    <div
                      className="chat-mascot-wrapper"
                      style={{
                        width: "120px",
                        height: "120px",
                        margin: "0 auto 12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <img
                        src="/images/chat/smiling-mascot.svg"
                        alt="Chat Mascot"
                        style={{ width: "100%", height: "100%", objectFit: "contain" }}
                        onError={(e) => {
                          // Fallback to /smiling-mascot.svg or icon if path fails
                          const target = e.currentTarget;
                          if (target.src.indexOf("/images/chat/smiling-mascot.svg") !== -1) {
                            target.src = "/smiling-mascot.svg";
                          } else {
                            target.style.display = "none";
                            const fallback = target.parentElement?.querySelector(".chat-mascot-fallback") as HTMLElement | null;
                            if (fallback) fallback.style.display = "flex";
                          }
                        }}
                      />
                      <div className="chat-mascot-fallback" style={{ display: "none", alignItems: "center", justifyContent: "center" }}>
                        <MessageSquare size={48} className="text-primary opacity-50" />
                      </div>
                    </div>
                    <h6>{inChatMessageQuery ? "No matching messages" : "No messages yet"}</h6>
                    <p>{inChatMessageQuery ? "Try a different search keyword" : `Send a message to start conversation with ${activeConversation.display_name}`}</p>
                  </div>
                ) : (
                  <div className="chat-messages-flex">
                    {renderMessagesWithDateSeparators()}
                    <div ref={messagesEndRef} />
                  </div>
                )}

                {/* Floating Scroll to Bottom Button */}
                {showScrollBottom && (
                  <button
                    type="button"
                    className="chat-scroll-bottom-btn shadow-lg"
                    onClick={() => scrollToBottom(true)}
                    title="Scroll to bottom"
                  >
                    <ChevronDown size={18} />
                  </button>
                )}

                {/* Real-time Typing Indicator */}
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

              {/* Quoted Reply Preview Bar above Input */}
              {replyingTo && (
                <div className="chat-reply-preview-bar d-flex align-items-center justify-content-between px-3 py-2 bg-light border-top">
                  <div className="d-flex align-items-center overflow-hidden me-2">
                    <div className="d-flex flex-column overflow-hidden text-start">
                      <span
                        className="fw-bold text-truncate small"
                        style={{
                          color: getAvatarColor(replyingTo.sender?.name || replyingTo.sender?.email || "User"),
                          fontSize: "12px",
                        }}
                      >
                        Replying to {replyingTo.sender?.name || replyingTo.sender?.email || "User"}
                      </span>
                      <span className="text-truncate text-muted small" style={{ fontSize: "12px" }}>
                        {replyingTo.content || (replyingTo.attachments?.length ? `[${replyingTo.attachments.length} attachment(s)]` : "Quoted message")}
                      </span>
                    </div>
                  </div>
                  <button
                    className="btn btn-sm btn-link text-muted p-1 border-0"
                    title="Cancel reply (Esc)"
                    onClick={() => setReplyingTo(null)}
                  >
                    <X size={16} />
                  </button>
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
                  accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt"
                  onChange={handleFileSelect}
                />

                {/* Attach file button */}
                <button
                  className="chat-input-icon-btn"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach images, videos, documents"
                >
                  <Paperclip size={18} />
                </button>

                {/* Workplace Emoji picker button & popover */}
                <div className="chat-emoji-wrapper" ref={emojiPickerRef}>
                  <button
                    className={`chat-input-icon-btn ${showEmojiPicker ? "active" : ""}`}
                    onClick={() => setShowEmojiPicker((prev) => !prev)}
                    title="Insert emoji"
                  >
                    <Smile size={18} />
                  </button>

                  {showEmojiPicker && (
                    <div className="chat-emoji-popover shadow-xl rounded-3 border bg-white p-2">
                      <div className="chat-emoji-header d-flex align-items-center justify-content-between pb-1 mb-2 border-bottom">
                        <span className="fw-bold text-dark small" style={{ fontSize: "12px" }}>Workplace Emojis</span>
                        <button className="chat-emoji-close btn btn-sm btn-link text-muted p-0" onClick={() => setShowEmojiPicker(false)}>
                          <X size={14} />
                        </button>
                      </div>
                      <div className="chat-emoji-grid">
                        {WORKPLACE_INPUT_EMOJIS.map((emoji, idx) => (
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

                {/* Textarea wrapper with auto-expand & paste support */}
                <div className="chat-input-wrapper">
                  <textarea
                    ref={inputRef}
                    placeholder={replyingTo ? "Type your reply..." : "Type a message or paste images (Ctrl+V)..."}
                    value={inputContent}
                    onPaste={handlePaste}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    disabled={sending}
                    rows={1}
                  />
                </div>

                <button
                  className={`chat-send-btn ${(inputContent.trim() || selectedFiles.length > 0) ? "active" : ""}`}
                  onClick={() => handleSendMessage()}
                  disabled={sending || (!inputContent.trim() && selectedFiles.length === 0)}
                  title="Send message (Enter)"
                >
                  {sending ? <Spinner animation="border" size="sm" /> : <Send size={17} />}
                </button>
              </div>
            </>
          ) : (
            /* No conversation selected placeholder */
            <div className="chat-no-selection">
              <div className="chat-no-selection-content text-center">
                <div
                  className="chat-empty-icon accent large mx-auto mb-3"
                  style={{ width: "70px", height: "70px", borderRadius: "50%", background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <MessageSquare size={32} className="text-primary" />
                </div>
                <h4 className="fw-bold text-dark mb-2">Welcome to Team Chat</h4>
                <p className="text-muted small mb-4">Select a conversation or start a new direct or group chat with your team.</p>
                <Button
                  variant="primary"
                  className="rounded-pill px-4 border-0 shadow-sm"
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
            <Form.Label className="small fw-semibold text-muted">Search Active Team Members</Form.Label>
            <InputGroup className="bg-light rounded-3 border">
              <InputGroup.Text className="bg-transparent border-0">
                <Search size={16} className="text-muted" />
              </InputGroup.Text>
              <Form.Control
                placeholder="Search by name or email..."
                className="bg-transparent border-0 shadow-none small"
                value={userQuery}
                onChange={(e) => handleSearchUsers(e.target.value)}
              />
            </InputGroup>
          </Form.Group>

          {userSearchLoading ? (
            <div className="text-center py-4">
              <Spinner animation="border" size="sm" variant="primary" />
              <p className="text-muted small mt-2">Fetching members...</p>
            </div>
          ) : activeUserSearchResults.length === 0 ? (
            <div className="text-center py-4">
              <User size={32} className="text-muted opacity-50 mb-2" />
              <p className="text-muted mb-0 small">No team members found.</p>
            </div>
          ) : (
            <div className="list-group" style={{ maxHeight: "280px", overflowY: "auto" }}>
              {activeUserSearchResults.map((user) => (
                <div
                  key={user.id}
                  className="list-group-item list-group-item-action d-flex align-items-center justify-content-between p-3 border-0 rounded-3 mb-1 cursor-pointer"
                  onClick={() => handleStartDirectChat(user)}
                >
                  <div className="d-flex align-items-center gap-3">
                    <SafeAvatar
                      src={user.avatar || user.profile_photo_url}
                      name={user.name || user.email}
                      size={38}
                      fontSize={14}
                      className="flex-shrink-0"
                    />
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
                      <SafeAvatar
                        src={conv.avatar}
                        name={conv.display_name || "Chat"}
                        size={32}
                        fontSize={12}
                        isGroup={conv.type === "GROUP"}
                        className="flex-shrink-0"
                      />
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
              placeholder="e.g. Engineering, Sales Team, Project Delta..."
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
                placeholder="Search team members to add..."
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
            <p className="text-muted text-center py-3 mb-0 small">No active team members found.</p>
          ) : (
            <div className="list-group" style={{ maxHeight: "220px", overflowY: "auto" }}>
              {activeUserSearchResults.map((user) => {
                const isSelected = selectedGroupMembers.some((m) => m.id === user.id);
                return (
                  <div
                    key={user.id}
                    className={`list-group-item list-group-item-action d-flex align-items-center justify-content-between p-3 border-0 rounded-3 mb-1 cursor-pointer ${
                      isSelected ? "bg-primary-subtle" : ""
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
                      <SafeAvatar
                        src={user.avatar || user.profile_photo_url}
                        name={user.name || user.email}
                        size={36}
                        fontSize={13}
                        className="flex-shrink-0"
                      />
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
            Are you sure you want to clear all message history in this chat? Media attachments will also be cleaned up.
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
              placeholder="e.g. Office Holiday Announcement: Office will remain closed on Friday for festival celebrations..."
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
              label={<span className="small fw-semibold text-dark">Pin Announcement to top of chat</span>}
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

      {/* MEDIA LIGHTBOX PREVIEW MODAL */}
      <Modal
        show={!!previewMedia}
        onHide={() => setPreviewMedia(null)}
        centered
        size="xl"
        contentClassName="bg-dark text-white border-0 rounded-4 overflow-hidden shadow-2xl"
      >
        <Modal.Header className="border-secondary border-opacity-25 bg-black bg-opacity-50 py-2.5 px-4 d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2 overflow-hidden me-3">
            {previewMedia?.type === "video" ? (
              <VideoIcon size={18} className="text-primary flex-shrink-0" />
            ) : (
              <ImageIcon size={18} className="text-info flex-shrink-0" />
            )}
            <span className="fw-semibold text-truncate small text-white" title={previewMedia?.name}>
              {previewMedia?.name || "Media Preview"}
            </span>
            {previewMedia?.size && (
              <Badge bg="secondary" className="bg-opacity-50 text-white fw-normal py-0.5 px-2 small">
                {previewMedia.size}
              </Badge>
            )}
          </div>
          <div className="d-flex align-items-center gap-2 flex-shrink-0">
            {previewMedia?.url && (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  className="d-flex align-items-center gap-1.5 px-3 rounded-pill fw-semibold border-0 shadow-sm"
                  onClick={(e) => handleDownloadFile(e, previewMedia.url, previewMedia.name)}
                >
                  <Download size={14} />
                  <span>Download</span>
                </Button>
                <Button
                  variant="outline-light"
                  size="sm"
                  className="d-flex align-items-center gap-1.5 px-2.5 rounded-pill border-opacity-50"
                  onClick={() => window.open(previewMedia.url, "_blank")}
                  title="Open in new tab"
                >
                  <ExternalLink size={14} />
                </Button>
              </>
            )}
            <Button
              variant="link"
              className="text-white p-1 rounded-circle border-0 shadow-none"
              onClick={() => setPreviewMedia(null)}
              title="Close Preview (Esc)"
            >
              <X size={22} />
            </Button>
          </div>
        </Modal.Header>
        <Modal.Body className="p-0 bg-black d-flex align-items-center justify-content-center position-relative" style={{ minHeight: "360px", maxHeight: "82vh" }}>
          {previewMedia?.type === "video" ? (
            <video
              controls
              autoPlay
              playsInline
              className="w-100 h-auto"
              style={{ maxHeight: "80vh", objectFit: "contain", background: "#000" }}
            >
              <source src={previewMedia.url} />
              Your browser does not support this video format.
            </video>
          ) : (
            <BSImage
              src={previewMedia?.url}
              alt={previewMedia?.name || "Preview"}
              className="img-fluid"
              style={{
                maxHeight: "80vh",
                maxWidth: "100%",
                objectFit: "contain",
                userSelect: "none",
              }}
            />
          )}
        </Modal.Body>
      </Modal>

      {/* === PRODUCTION-READY RESPONSIVE SCOPED STYLES === */}
      <style jsx global>{`
        /* ===== CHAT APP CONTAINER ===== */
        .chat-app-container {
          display: flex;
          height: 100%;
          max-height: 100%;
          min-height: 0;
          width: 100%;
          background: #ffffff;
          border-radius: 0;
          overflow: hidden;
          margin: 0;
          position: relative;
        }

        /* ===== SIDEBAR ===== */
        .chat-sidebar {
          width: 360px;
          min-width: 360px;
          max-width: 360px;
          display: flex;
          flex-direction: column;
          border-right: 1px solid #e2e8f0;
          background: #ffffff;
          transition: all 0.2s ease;
          height: 100%;
          max-height: 100%;
          min-height: 0;
          overflow: hidden;
        }

        .chat-sidebar-header {
          padding: 14px 16px;
          border-bottom: 1px solid #f1f5f9;
          background: #ffffff;
          flex-shrink: 0;
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
          font-size: 17px;
          font-weight: 700;
          color: #0f172a;
          line-height: 1.2;
        }

        .chat-count {
          font-size: 11px;
          color: #64748b;
          font-weight: 500;
        }

        .chat-sidebar-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .chat-icon-btn {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #475569;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }

        .chat-icon-btn:hover,
        .chat-icon-btn.active {
          background: #eef2ff;
          color: #4f46e5;
          border-color: #c7d2fe;
        }

        .chat-icon-btn.accent {
          background: #4f46e5;
          color: #ffffff;
          border-color: #4f46e5;
        }

        .chat-icon-btn.accent:hover {
          background: #4338ca;
        }

        /* Search box */
        .chat-search-box {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 7px 12px;
          transition: border-color 0.15s;
        }

        .chat-search-box:focus-within {
          border-color: #818cf8;
          background: #ffffff;
        }

        .chat-search-box input {
          flex: 1;
          border: none;
          background: transparent;
          outline: none;
          font-size: 13px;
          color: #0f172a;
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

        .chat-search-clear:hover {
          color: #ef4444;
        }

        /* Conversation list */
        .chat-conv-list {
          flex: 1 1 0%;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 8px;
        }

        .chat-conv-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.15s ease;
          margin-bottom: 3px;
          position: relative;
        }

        .chat-conv-item:hover {
          background: #f8fafc;
        }

        .chat-conv-item.active {
          background: #eef2ff;
        }

        .chat-online-dot {
          position: absolute;
          bottom: 0px;
          right: 0px;
          width: 11px;
          height: 11px;
          background: #10b981;
          border: 2px solid #ffffff;
          border-radius: 50%;
          z-index: 2;
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
          color: #4f46e5;
          font-weight: 700;
        }

        .chat-conv-time {
          font-size: 10.5px;
          color: #64748b;
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
          color: #64748b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .chat-conv-item.active .chat-conv-preview {
          color: #4338ca;
        }

        .chat-unread-badge {
          background: #4f46e5;
          color: #ffffff;
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

        .chat-conv-delete-wrap {
          opacity: 0;
          transition: opacity 0.15s ease;
        }

        .chat-conv-item:hover .chat-conv-delete-wrap {
          opacity: 1;
        }

        /* ===== CHAT MAIN AREA ===== */
        .chat-main {
          flex: 1 1 0%;
          display: flex;
          flex-direction: column;
          min-width: 0;
          min-height: 0;
          height: 100%;
          max-height: 100%;
          background: #f8fafc;
          overflow: hidden;
        }

        /* Chat header */
        .chat-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 18px;
          border-bottom: 1px solid #e2e8f0;
          background: #ffffff;
          min-height: 60px;
          height: 60px;
          flex-shrink: 0;
          z-index: 10;
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
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #475569;
          cursor: pointer;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.15s ease;
        }

        .chat-back-btn:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        .chat-header-info {
          min-width: 0;
        }

        .chat-header-info h3 {
          margin: 0;
          font-size: 15px;
          font-weight: 700;
          color: #0f172a;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .chat-header-meta {
          font-size: 11.5px;
          color: #10b981;
          font-weight: 600;
        }

        .chat-header-right {
          flex-shrink: 0;
        }

        /* Pinned announcement banner */
        .chat-pinned-announcement-banner {
          background: #eff6ff;
          border-bottom: 1px solid #dbeafe;
          flex-shrink: 0;
        }

        /* Message scroll area */
        .chat-messages-area {
          flex: 1 1 0%;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          position: relative;
          background-color: #f8fafc;
          background-image: radial-gradient(#e2e8f0 1px, transparent 1px);
          background-size: 20px 20px;
        }

        .chat-messages-flex {
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
          margin-top: auto;
        }

        /* Date separator */
        .chat-date-separator {
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 14px 0 8px;
        }

        .chat-date-separator span {
          background: #ffffff;
          color: #64748b;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 14px;
          border-radius: 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          border: 1px solid #e2e8f0;
        }

        /* Message row */
        .chat-message-row {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          position: relative;
          transition: background-color 0.25s ease;
        }

        .chat-message-row.has-reactions {
          margin-bottom: 12px;
        }

        .chat-message-row.highlight-flash {
          animation: highlightMsgFlash 1.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes highlightMsgFlash {
          0% {
            background-color: rgba(99, 102, 241, 0.25);
            border-radius: 12px;
          }
          70% {
            background-color: rgba(99, 102, 241, 0.08);
          }
          100% {
            background-color: transparent;
          }
        }

        .chat-message-row.sent {
          justify-content: flex-end;
        }

        .chat-message-row.received {
          justify-content: flex-start;
        }

        /* Swipe-to-reply spring icon indicator */
        .chat-swipe-reply-icon-wrap {
          position: absolute;
          left: 4px;
          top: 50%;
          transform-origin: center;
          margin-top: -16px;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }

        .chat-swipe-reply-icon-circle {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #4f46e5;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(79, 70, 229, 0.35);
        }

        /* Chat Bubbles */
        .chat-bubble {
          max-width: 68%;
          min-width: 90px;
          padding: 9px 13px;
          border-radius: 16px;
          position: relative;
          overflow: visible;
          word-wrap: break-word;
          display: flex;
          flex-direction: column;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          transition: box-shadow 0.15s ease, transform 0.15s ease;
          touch-action: pan-y;
        }

        .bubble-sent {
          background: #4f46e5;
          color: #ffffff;
          border-bottom-right-radius: 3px;
          border: 1px solid #4338ca;
          box-shadow: 0 1px 3px rgba(79, 70, 229, 0.2);
        }

        .bubble-sent .chat-text {
          color: #ffffff;
        }

        .bubble-sent .chat-time {
          color: rgba(255, 255, 255, 0.75);
        }

        .bubble-sent .chat-read-icon {
          color: #c7d2fe;
        }

        .bubble-sent .chat-quoted-bubble-card {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .bubble-sent .chat-quoted-sender {
          color: #e0e7ff !important;
        }

        .bubble-sent .chat-quoted-snippet {
          color: rgba(255, 255, 255, 0.85) !important;
        }

        .bubble-received {
          background: #ffffff;
          color: #1e293b;
          border-bottom-left-radius: 3px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
        }

        .bubble-received .chat-text {
          color: #1e293b;
        }

        .bubble-received .chat-time {
          color: #94a3b8;
        }

        .chat-sender-name {
          font-size: 11.5px;
          font-weight: 700;
          color: #4f46e5;
          margin-bottom: 2px;
          line-height: 1.2;
        }

        /* Quoted Snippet inside Message Bubble */
        .chat-quoted-bubble-card {
          background: rgba(0, 0, 0, 0.04);
          border-radius: 8px;
          border: 1px solid rgba(0, 0, 0, 0.06);
          transition: background-color 0.15s ease;
          cursor: pointer;
        }

        .chat-quoted-bubble-card:hover {
          background: rgba(0, 0, 0, 0.08);
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
          font-size: 10.5px;
          line-height: 1;
        }

        /* Click-to-Show Action & Reaction Bar */
        .chat-quick-reactions-bar {
          position: absolute;
          top: -28px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          padding: 2px 6px;
          display: flex;
          align-items: center;
          gap: 2px;
          z-index: 30;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
          animation: popoverFadeIn 0.15s ease-out;
        }

        .bubble-sent .chat-quick-reactions-bar {
          right: 6px;
        }

        .bubble-received .chat-quick-reactions-bar {
          left: 6px;
        }

        .chat-bubble.active-bubble-focused {
          box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.35), 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .quick-reaction-btn {
          border: none;
          background: transparent;
          font-size: 15px;
          line-height: 1;
          padding: 3px 5px;
          border-radius: 12px;
          cursor: pointer;
          transition: transform 0.12s ease, background 0.12s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
        }

        .quick-reaction-btn:hover {
          background: #f1f5f9;
          transform: scale(1.25);
        }

        .quick-reaction-btn.reply-quick-btn {
          color: #4f46e5;
          font-size: 13px;
        }

        /* Reaction Badges */
        .chat-msg-reactions-container {
          position: absolute;
          bottom: -11px;
          display: flex;
          align-items: center;
          gap: 3px;
          z-index: 10;
          pointer-events: auto;
        }

        .bubble-sent .chat-msg-reactions-container {
          right: 8px;
        }

        .bubble-received .chat-msg-reactions-container {
          left: 8px;
        }

        .chat-reaction-badge {
          border: none;
          outline: none;
          background: #ffffff;
          color: #334155;
          padding: 1px 5px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 3px;
          line-height: 1;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
          transition: transform 0.15s ease;
        }

        .chat-reaction-badge:hover {
          transform: scale(1.15);
          background: #f8fafc;
        }

        .chat-reaction-badge.active-reaction {
          background: #eef2ff;
          border-color: #c7d2fe;
          color: #4f46e5;
        }

        .chat-reaction-badge .reaction-emoji {
          font-size: 13px;
          line-height: 1;
        }

        .chat-reaction-badge .reaction-count {
          font-size: 10px;
          font-weight: 700;
          color: #475569;
        }

        /* Floating Scroll to bottom button */
        .chat-scroll-bottom-btn {
          position: absolute;
          bottom: 16px;
          right: 24px;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          color: #475569;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 30;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
          transition: all 0.2s ease;
        }

        .chat-scroll-bottom-btn:hover {
          background: #4f46e5;
          color: #ffffff;
          border-color: #4f46e5;
          transform: translateY(-2px);
        }

        /* Reply preview bar */
        .chat-reply-preview-bar {
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          animation: slideUpReply 0.18s cubic-bezier(0.16, 1, 0.3, 1);
          flex-shrink: 0;
        }

        @keyframes slideUpReply {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Attachments */
        .chat-attachments {
          display: flex;
          flex-direction: column;
          gap: 6px;
          max-width: 100%;
        }

        .whatsapp-file-card {
          background: rgba(0, 0, 0, 0.04);
          border-radius: 8px;
          min-width: 240px;
          max-width: 320px;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }

        .bubble-sent .whatsapp-file-card {
          background: rgba(0, 0, 0, 0.18);
        }

        .bubble-sent .whatsapp-file-card:hover {
          background: rgba(0, 0, 0, 0.26);
        }

        .whatsapp-file-card:hover {
          background: rgba(0, 0, 0, 0.08);
        }

        .bubble-sent .whatsapp-file-card span {
          color: #ffffff !important;
        }

        .bubble-sent .whatsapp-download-btn {
          color: #ffffff !important;
        }

        .whatsapp-media-card {
          background: #000000;
          border-radius: 8px;
        }

        .whatsapp-media-overlay {
          background: rgba(0, 0, 0, 0.3);
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .whatsapp-media-card:hover .whatsapp-media-overlay {
          opacity: 1;
        }

        /* Typing indicator */
        .chat-typing-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #64748b;
          font-style: italic;
          padding: 6px 4px;
        }

        .chat-typing-dots {
          display: flex;
          gap: 3px;
        }

        .chat-typing-dots span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #4f46e5;
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
          border-top: 1px solid #e2e8f0;
          flex-shrink: 0;
        }

        .chat-file-preview-item {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 6px 10px;
        }

        .chat-file-preview-icon {
          width: 34px;
          height: 34px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .chat-file-preview-icon.video {
          background: #1e293b;
          color: #ffffff;
        }

        .chat-file-preview-icon.doc {
          background: #eff6ff;
          color: #3b82f6;
        }

        .chat-file-preview-info {
          display: flex;
          flex-direction: column;
          max-width: 120px;
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
          padding: 10px 16px;
          border-top: 1px solid #e2e8f0;
          background: #ffffff;
          position: relative;
          flex-shrink: 0;
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
          background: #eef2ff;
          color: #4f46e5;
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
          width: 270px;
          padding: 10px;
          z-index: 100;
          animation: popoverFadeIn 0.15s ease-out;
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
          transition: transform 0.1s;
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
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 9px 16px;
          font-size: 13.5px;
          line-height: 1.4;
          resize: none;
          outline: none;
          background: #f8fafc;
          color: #0f172a;
          min-height: 38px;
          max-height: 150px;
          overflow-y: auto;
          transition: border-color 0.15s, background 0.15s;
        }

        .chat-input-wrapper textarea:focus {
          border-color: #818cf8;
          background: #ffffff;
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
          background: #4f46e5;
          color: #ffffff;
          box-shadow: 0 2px 8px rgba(79, 70, 229, 0.35);
        }

        .chat-send-btn:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        /* No conversation selected */
        .chat-no-selection {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
          padding: 24px;
        }

        .chat-no-selection-content {
          max-width: 340px;
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
          color: #64748b;
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
          color: #4f46e5;
        }

        /* Drag and Drop Overlay */
        .chat-dropzone-overlay {
          position: absolute;
          inset: 0;
          z-index: 999;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px dashed #4f46e5;
          border-radius: 0;
          margin: 0;
          pointer-events: none;
          animation: dropzoneFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes dropzoneFadeIn {
          from {
            opacity: 0;
            transform: scale(0.98);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .chat-dropzone-box {
          text-align: center;
          padding: 32px 48px;
          background: #ffffff;
          border-radius: 20px;
          box-shadow: 0 20px 40px -10px rgba(79, 70, 229, 0.25);
          border: 1px solid #e0e7ff;
        }

        .chat-dropzone-icon-pulse {
          width: 76px;
          height: 76px;
          border-radius: 50%;
          background: #eef2ff;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
          animation: pulseDropzone 1.5s infinite;
        }

        @keyframes pulseDropzone {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.4);
          }
          70% {
            transform: scale(1.05);
            box-shadow: 0 0 0 16px rgba(79, 70, 229, 0);
          }
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(79, 70, 229, 0);
          }
        }

        .no-caret::after {
          display: none !important;
        }

        /* ===== RESPONSIVENESS: TABLET & MOBILE ===== */

        /* Tablet (768px - 1024px) */
        @media (min-width: 768px) and (max-width: 1024px) {
          .chat-sidebar {
            width: 290px;
            min-width: 290px;
            max-width: 290px;
          }

          .chat-bubble {
            max-width: 76%;
          }
        }

        /* Mobile (< 768px) */
        @media (max-width: 767.98px) {
          .chat-app-container {
            height: calc(100vh - 60px);
            width: 100vw;
          }

          .chat-sidebar {
            width: 100% !important;
            min-width: 100% !important;
            max-width: 100% !important;
            border-right: none;
          }

          .chat-main {
            width: 100% !important;
            min-width: 100% !important;
            max-width: 100% !important;
          }

          .mobile-hide {
            display: none !important;
          }

          .mobile-show {
            display: flex !important;
          }

          .chat-back-btn {
            display: flex !important;
          }

          .chat-bubble {
            max-width: 86%;
          }

          .chat-messages-area {
            padding: 12px 10px;
          }

          .chat-input-area {
            padding: 8px 10px;
          }

          .chat-header {
            padding: 8px 12px;
          }

          .chat-emoji-popover {
            width: calc(100vw - 32px);
            left: -8px;
          }
        }

        /* Custom Slim Scrollbar */
        .chat-conv-list::-webkit-scrollbar,
        .chat-messages-area::-webkit-scrollbar {
          width: 5px;
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
      `}</style>
    </>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="d-flex align-items-center justify-content-center vh-100" style={{ backgroundColor: "#f8fafc" }}>
          <div className="text-center">
            <Spinner animation="border" variant="primary" style={{ width: "2.5rem", height: "2.5rem" }} />
            <p className="mt-3 text-muted fw-semibold small">Loading Workspace Chat...</p>
          </div>
        </div>
      }
    >
      <ChatPageContent />
    </Suspense>
  );
}