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

  // Search and Modal states
  const [searchQuery, setSearchQuery] = useState<string>("");
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

  // Current user ID
  const [currentUserId, setCurrentUserId] = useState<string | number | null>(null);

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

  // Load current user
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed?.id) setCurrentUserId(parsed.id);
      }
    } catch (e) {
      console.error("Error reading stored user:", e);
    }
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
      if (data.type === "new_message") {
        const newMsg: Message = data.message;

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
      } else if (data.type === "typing") {
        if (data.is_typing) {
          setTypingUser(data.username);
          setTimeout(() => setTypingUser(null), 3000);
        } else {
          setTypingUser(null);
        }
      }
    });

    wsRef.current = controller;

    return () => {
      if (controller) controller.close();
    };
  }, [activeConversationId, queryClient]);

  // Select conversation
  const selectConversation = (conv: Conversation) => {
    setActiveConversationId(conv.id);
    setMobileView("chat");
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
    setShowGroupModal(true);
    setGroupName("");
    setSelectedGroupMembers([]);
    setUserQuery("");
    handleSearchUsers("");
  };

  const filteredConversations = useMemo(
    () =>
      conversations.filter((c) =>
        (c.display_name || c.name || "").toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [conversations, searchQuery]
  );

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
            >
              {(msg.sender?.name || msg.sender?.email || "U")[0].toUpperCase()}
            </div>
          )}

          <div className={`chat-bubble ${isMe ? "bubble-sent" : "bubble-received"}`}>
            {/* Sender name for group chat */}
            {!isMe && activeConversation?.type === "GROUP" && (
              <span className="chat-sender-name">
                {msg.sender?.name || msg.sender?.email}
              </span>
            )}

            {/* Text message content */}
            {msg.content && (
              <p className="chat-text">{msg.content}</p>
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
              <div className="chat-sidebar-title">
                <MessageSquare size={22} className="chat-icon-accent" />
                <div>
                  <h2>Chats</h2>
                  <span className="chat-count">{conversations.length} conversations</span>
                </div>
              </div>
              <div className="chat-sidebar-actions">
                <button className="chat-icon-btn" title="New Direct Message" onClick={openDirectModal}>
                  <PlusCircle size={20} />
                </button>
                <button className="chat-icon-btn accent" title="Create Group Chat" onClick={openGroupModal}>
                  <Users size={20} />
                </button>
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
                        {conv.type === "GROUP" ? (
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
                    {activeConversation.type === "GROUP" ? (
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

              {/* Message Input */}
              <div className="chat-input-area">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="d-none"
                  multiple
                  accept="image/*,video/*,.pdf,.doc,.docx"
                  onChange={handleFileSelect}
                />

                <button
                  className="chat-input-icon-btn"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach file"
                >
                  <Paperclip size={20} />
                </button>

                <div className="chat-input-wrapper">
                  <textarea
                    ref={inputRef}
                    placeholder="Type a message..."
                    value={inputContent}
                    onChange={(e) => setInputContent(e.target.value)}
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
            <Form.Label className="small fw-semibold text-muted">Search Employee / User</Form.Label>
            <InputGroup className="bg-light rounded-3 border">
              <InputGroup.Text className="bg-transparent border-0">
                <Search size={16} className="text-muted" />
              </InputGroup.Text>
              <Form.Control
                placeholder="Search by name, email, or employee ID..."
                className="bg-transparent border-0 shadow-none small"
                value={userQuery}
                onChange={(e) => handleSearchUsers(e.target.value)}
              />
            </InputGroup>
          </Form.Group>

          {userSearchLoading ? (
            <div className="text-center py-4">
              <Spinner animation="border" size="sm" variant="primary" />
              <p className="text-muted small mt-2">Fetching employees...</p>
            </div>
          ) : userSearchResults.length === 0 ? (
            <div className="text-center py-4">
              <User size={32} className="text-muted opacity-50 mb-2" />
              <p className="text-muted mb-0 small">No employees found.</p>
            </div>
          ) : (
            <div className="list-group" style={{ maxHeight: "280px", overflowY: "auto" }}>
              {userSearchResults.map((user) => (
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
                      <h6 className="mb-0 small fw-bold text-dark">{user.name || user.email}</h6>
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
            <Form.Label className="small fw-semibold text-muted">Add Members</Form.Label>
            <InputGroup className="bg-light rounded-3 border">
              <InputGroup.Text className="bg-transparent border-0">
                <Search size={16} className="text-muted" />
              </InputGroup.Text>
              <Form.Control
                placeholder="Search employees to add..."
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
          ) : userSearchResults.length === 0 ? (
            <p className="text-muted text-center py-3 mb-0 small">No employees found.</p>
          ) : (
            <div className="list-group" style={{ maxHeight: "220px", overflowY: "auto" }}>
              {userSearchResults.map((user) => {
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
                        <h6 className="mb-0 small fw-bold text-dark">{user.name || user.email}</h6>
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
          height: calc(100vh - 110px);
          min-height: 500px;
          background: #fff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 6px 16px rgba(0,0,0,0.04);
          border: 1px solid #e5e7eb;
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
          color: #6366f1;
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
          background: #f1f5f9;
          color: #6366f1;
          border-color: #c7d2fe;
        }

        .chat-icon-btn.accent {
          background: #6366f1;
          color: white;
          border-color: #6366f1;
        }

        .chat-icon-btn.accent:hover {
          background: #4f46e5;
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
          background: #eef2ff;
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
          color: #4338ca;
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

        /* Avatar for received */
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
          background: #6366f1;
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
          color: #6366f1;
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
          color: #c7d2fe;
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
          background: #6366f1;
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
          align-items: flex-end;
          gap: 8px;
          padding: 12px 16px;
          border-top: 1px solid #f1f5f9;
          background: #fff;
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

        .chat-input-icon-btn:hover {
          background: #e2e8f0;
          color: #6366f1;
        }

        .chat-input-wrapper {
          flex: 1;
          min-width: 0;
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
          max-height: 120px;
          transition: border-color 0.15s, background 0.15s;
        }

        .chat-input-wrapper textarea:focus {
          border-color: #a5b4fc;
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
          background: #6366f1;
          color: #fff;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
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
