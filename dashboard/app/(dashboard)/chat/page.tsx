"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Container,
  Row,
  Col,
  Card,
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

// Solid, clean standard colors (NO gradients)
const getAvatarColor = (name: string) => {
  const solidColors = [
    "#4f46e5", // Indigo
    "#2563eb", // Royal Blue
    "#0d9488", // Teal
    "#d97706", // Amber
    "#db2777", // Pink
    "#7c3aed", // Purple
    "#059669", // Emerald
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return solidColors[Math.abs(hash) % solidColors.length];
};

// Helper function for formatting timestamps nicely
const formatMessageTime = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConversations, setLoadingConversations] = useState<boolean>(true);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);

  // Mobile navigation view state
  const [showMobileSidebar, setShowMobileSidebar] = useState<boolean>(true);

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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<any>(null);

  // Load current user from stored user object or JWT token
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
    loadConversations();
  }, []);

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

  const loadConversations = async () => {
    setLoadingConversations(true);
    try {
      const list = await fetchConversations();
      setConversations(list);
      if (list.length > 0 && !activeConversation) {
        selectConversation(list[0]);
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setLoadingConversations(false);
    }
  };

  const selectConversation = async (conv: Conversation) => {
    setActiveConversation(conv);
    setShowMobileSidebar(false); // Hide sidebar on mobile when conversation selected
    setLoadingMessages(true);
    setMessages([]);
    try {
      const res = await fetchMessages(conv.id);
      const sorted = (res.results || []).slice().reverse();
      setMessages(sorted);
      markConversationAsRead(conv.id);

      // Reset unread count locally
      setConversations((prev) =>
        prev.map((c) => (c.id === conv.id ? { ...c, unread_count: 0 } : c))
      );
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUser]);

  // Handle WebSocket connection when active conversation changes
  useEffect(() => {
    if (!activeConversation) return;

    if (wsRef.current) {
      wsRef.current.close();
    }

    const controller = connectChatWebSocket(activeConversation.id, (data) => {
      if (data.type === "new_message") {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });

        // Update conversation list last_message
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConversation.id
              ? { ...c, last_message: data.message, updated_at: new Date().toISOString() }
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
  }, [activeConversation?.id]);

  // Handle File Selection
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

  // Handle Sending Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeConversation || (!inputContent.trim() && selectedFiles.length === 0)) return;

    setSending(true);
    try {
      const newMsg = await sendMessageWithAttachments(
        activeConversation.id,
        inputContent.trim(),
        selectedFiles
      );

      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });

      setInputContent("");
      setSelectedFiles([]);
      setFilePreviews([]);

      // Update conversations list
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversation.id
            ? { ...c, last_message: newMsg, updated_at: new Date().toISOString() }
            : c
        )
      );
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

  // Search users for Modal
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

  const startDirectChatWithUser = async (user: UserMinimal) => {
    try {
      const conv = await createDirectChat(user.id);
      setShowDirectModal(false);
      await loadConversations();
      selectConversation(conv);
    } catch (err) {
      console.error("Error creating direct chat:", err);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedGroupMembers.length === 0) return;
    try {
      const memberIds = selectedGroupMembers.map((m) => m.id);
      const conv = await createGroupChat(groupName.trim(), memberIds);
      setShowGroupModal(false);
      setGroupName("");
      setSelectedGroupMembers([]);
      await loadConversations();
      selectConversation(conv);
    } catch (err) {
      console.error("Error creating group chat:", err);
    }
  };

  const filteredConversations = conversations.filter((c) =>
    (c.display_name || c.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Container fluid className="p-2 p-md-3" style={{ height: "calc(100vh - 110px)", minHeight: "600px" }}>
      <Card className="h-100 border-0 shadow-sm rounded-3 overflow-hidden" style={{ backgroundColor: "#f8fafc" }}>
        <Row className="g-0 h-100">
          
          {/* LEFT SIDEBAR: Conversations List */}
          <Col
            md={4}
            lg={3.5}
            className={`border-end bg-white flex-column h-100 ${
              showMobileSidebar ? "d-flex col-12" : "d-none d-md-flex"
            }`}
          >
            {/* Sidebar Header */}
            <div className="p-3 border-bottom bg-white">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="d-flex align-items-center gap-2">
                  <div
                    className="rounded-3 p-2 d-flex align-items-center justify-content-center text-white"
                    style={{ backgroundColor: "#4f46e5", width: "36px", height: "36px" }}
                  >
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: "17px" }}>
                      Messages
                    </h5>
                    <small className="text-muted" style={{ fontSize: "11px" }}>
                      {conversations.length} Conversations
                    </small>
                  </div>
                </div>

                <div className="d-flex gap-2">
                  <Button
                    variant="light"
                    size="sm"
                    className="rounded-circle p-2 border"
                    title="New Direct Message"
                    onClick={openDirectModal}
                  >
                    <PlusCircle size={18} className="text-primary" />
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    className="rounded-circle p-2 d-flex align-items-center justify-content-center border-0"
                    style={{ backgroundColor: "#4f46e5" }}
                    title="Create Group Chat"
                    onClick={openGroupModal}
                  >
                    <Users size={18} />
                  </Button>
                </div>
              </div>

              {/* Search Box */}
              <InputGroup className="bg-light rounded-3 border">
                <InputGroup.Text className="bg-transparent border-0 pe-1">
                  <Search size={15} className="text-muted" />
                </InputGroup.Text>
                <Form.Control
                  placeholder="Search chats..."
                  className="bg-transparent border-0 shadow-none text-dark"
                  style={{ fontSize: "13px" }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <Button variant="link" className="text-muted p-1 border-0 pe-2" onClick={() => setSearchQuery("")}>
                    <X size={14} />
                  </Button>
                )}
              </InputGroup>
            </div>

            {/* Conversation List */}
            <div className="flex-grow-1 overflow-auto p-2">
              {loadingConversations ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" size="sm" />
                  <p className="text-muted small mt-2">Loading chats...</p>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-center py-5 px-3">
                  <div className="rounded-circle bg-light d-inline-flex p-3 mb-2 text-muted">
                    <MessageSquare size={26} />
                  </div>
                  <p className="fw-semibold text-dark mb-1">No chats found</p>
                  <p className="text-muted small mb-3">Start messaging employees or team members!</p>
                  <Button variant="outline-primary" size="sm" className="rounded-pill px-3" onClick={openDirectModal}>
                    Start Chat
                  </Button>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isActive = activeConversation?.id === conv.id;
                  const avatarBg = getAvatarColor(conv.display_name || "Chat");
                  return (
                    <div
                      key={conv.id}
                      onClick={() => selectConversation(conv)}
                      className={`p-3 mb-2 rounded-3 d-flex align-items-center gap-3 border ${
                        isActive
                          ? "bg-primary-subtle border-primary text-primary"
                          : "bg-white border-light text-dark"
                      }`}
                      style={{
                        cursor: "pointer",
                        borderLeft: isActive ? "4px solid #4f46e5" : "1px solid #e2e8f0",
                      }}
                    >
                      {/* Avatar Icon */}
                      <div className="position-relative">
                        <div
                          className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                          style={{
                            width: "42px",
                            height: "42px",
                            fontSize: "15px",
                            backgroundColor: avatarBg,
                          }}
                        >
                          {conv.type === "GROUP" ? (
                            <Users size={20} />
                          ) : (
                            (conv.display_name || "U")[0].toUpperCase()
                          )}
                        </div>
                        {conv.type === "DIRECT" && (
                          <span
                            className="position-absolute bottom-0 end-0 rounded-circle border border-white"
                            style={{ width: "10px", height: "10px", backgroundColor: "#22c55e" }}
                          />
                        )}
                      </div>

                      {/* Content Info */}
                      <div className="flex-grow-1 min-w-0">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <h6
                            className={`mb-0 text-truncate fw-bold ${isActive ? "text-primary" : "text-dark"}`}
                            style={{ fontSize: "14px" }}
                          >
                            {conv.display_name}
                          </h6>
                          <small className="text-muted ms-2" style={{ fontSize: "10px" }}>
                            {conv.last_message ? formatMessageTime(conv.last_message.created_at) : ""}
                          </small>
                        </div>
                        <div className="d-flex justify-content-between align-items-center">
                          <p className="mb-0 text-truncate text-muted small" style={{ fontSize: "12px", maxWidth: "160px" }}>
                            {conv.last_message ? (
                              conv.last_message.content || `[${conv.last_message.message_type}]`
                            ) : (
                              <em className="text-muted">No messages yet</em>
                            )}
                          </p>
                          {conv.unread_count > 0 && (
                            <Badge
                              bg="danger"
                              pill
                              className="px-2 py-1"
                              style={{ fontSize: "10px" }}
                            >
                              {conv.unread_count}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Col>

          {/* RIGHT VIEW: Chat Conversation Area */}
          <Col
            md={8}
            lg={8.5}
            className={`d-flex flex-column h-100 bg-white ${
              !showMobileSidebar ? "d-flex col-12" : "d-none d-md-flex"
            }`}
          >
            {activeConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-3 border-bottom d-flex align-items-center justify-content-between bg-white">
                  <div className="d-flex align-items-center gap-3">
                    {/* Mobile Back Button */}
                    <Button
                      variant="light"
                      size="sm"
                      className="d-md-none rounded-circle p-2 me-1 border"
                      onClick={() => setShowMobileSidebar(true)}
                    >
                      <ArrowLeft size={18} />
                    </Button>

                    <div
                      className="rounded-circle text-white fw-bold d-flex align-items-center justify-content-center"
                      style={{
                        width: "40px",
                        height: "40px",
                        backgroundColor: getAvatarColor(activeConversation.display_name || "Chat"),
                      }}
                    >
                      {activeConversation.type === "GROUP" ? (
                        <Users size={20} />
                      ) : (
                        (activeConversation.display_name || "C")[0].toUpperCase()
                      )}
                    </div>
                    <div>
                      <h6 className="fw-bold mb-0 text-dark" style={{ fontSize: "15px" }}>
                        {activeConversation.display_name}
                      </h6>
                      <div className="d-flex align-items-center gap-2">
                        <Badge bg={activeConversation.type === "GROUP" ? "info" : "secondary"} style={{ fontSize: "10px" }}>
                          {activeConversation.type === "GROUP" ? "Group Chat" : "Direct Message"}
                        </Badge>
                        <span className="text-muted small" style={{ fontSize: "11px" }}>
                          {activeConversation.type === "GROUP"
                            ? `${activeConversation.members.length} Members`
                            : "Online"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-2">
                    <Dropdown align="end">
                      <Dropdown.Toggle variant="light" size="sm" className="rounded-circle p-2 border-0 no-caret">
                        <MoreVertical size={18} className="text-muted" />
                      </Dropdown.Toggle>
                      <Dropdown.Menu className="shadow-sm border rounded-3">
                        <Dropdown.Item onClick={() => selectConversation(activeConversation)}>
                          Refresh Messages
                        </Dropdown.Item>
                        <Dropdown.Item onClick={() => setShowMobileSidebar(true)}>
                          Back to Conversations
                        </Dropdown.Item>
                      </Dropdown.Menu>
                    </Dropdown>
                  </div>
                </div>

                {/* Messages Feed */}
                <div
                  className="flex-grow-1 overflow-auto p-3 p-md-4"
                  style={{ backgroundColor: "#f8fafc" }}
                >
                  {loadingMessages ? (
                    <div className="text-center py-5">
                      <Spinner animation="border" variant="primary" />
                      <p className="text-muted small mt-2">Loading messages...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-5 my-5">
                      <div className="rounded-circle bg-white shadow-sm p-3 d-inline-flex mb-3 text-primary border">
                        <Sparkles size={32} />
                      </div>
                      <h6 className="fw-bold text-dark mb-1">No messages yet</h6>
                      <p className="text-muted small max-w-sm mx-auto">
                        Type a message below to start chatting with {activeConversation.display_name}!
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = String(msg.sender?.id) === String(currentUserId);
                      return (
                        <div
                          key={msg.id}
                          className={`d-flex mb-3 ${isMe ? "justify-content-end" : "justify-content-start"}`}
                        >
                          <div
                            className="p-3 rounded-3 shadow-xs"
                            style={{
                              maxWidth: "75%",
                              minWidth: "130px",
                              backgroundColor: isMe ? "#4f46e5" : "#ffffff",
                              color: isMe ? "#ffffff" : "#1e293b",
                              border: isMe ? "none" : "1px solid #e2e8f0",
                            }}
                          >
                            {!isMe && (
                              <div className="mb-1 pb-1 border-bottom">
                                <small className="fw-bold text-primary" style={{ fontSize: "11px" }}>
                                  {msg.sender?.name || msg.sender?.email}
                                </small>
                              </div>
                            )}

                            {/* Text Content */}
                            {msg.content && (
                              <p
                                className="mb-1 text-break"
                                style={{ fontSize: "14px", lineHeight: "1.45", whiteSpace: "pre-wrap" }}
                              >
                                {msg.content}
                              </p>
                            )}

                            {/* Attachments */}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="mt-2 d-flex flex-column gap-2">
                                {msg.attachments.map((att) => {
                                  const isImg = att.file_type?.startsWith("image/");
                                  const isVid = att.file_type?.startsWith("video/");

                                  if (isImg) {
                                    return (
                                      <div key={att.id} className="rounded-2 overflow-hidden border">
                                        <BSImage
                                          src={att.file_url}
                                          alt="attachment"
                                          className="w-100 cursor-pointer"
                                          style={{ maxHeight: "240px", objectFit: "cover" }}
                                          onClick={() => setPreviewMediaUrl(att.file_url)}
                                        />
                                      </div>
                                    );
                                  }

                                  if (isVid) {
                                    return (
                                      <div key={att.id} className="rounded-2 overflow-hidden border">
                                        <video controls className="w-100" style={{ maxHeight: "260px" }}>
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
                                      className={`d-flex align-items-center gap-2 p-2 rounded-2 text-decoration-none ${
                                        isMe ? "bg-white text-dark" : "bg-light text-dark border"
                                      }`}
                                    >
                                      <FileText size={18} />
                                      <div className="flex-grow-1 min-w-0">
                                        <span className="small d-block text-truncate fw-semibold">
                                          Attachment File
                                        </span>
                                        <small className="text-muted" style={{ fontSize: "10px" }}>
                                          {(att.file_size / (1024 * 1024)).toFixed(2)} MB
                                        </small>
                                      </div>
                                    </a>
                                  );
                                })}
                              </div>
                            )}

                            {/* Timestamp */}
                            <div className="d-flex justify-content-end align-items-center gap-1 mt-1">
                              <span
                                className={`small ${isMe ? "text-white-50" : "text-muted"}`}
                                style={{ fontSize: "10px" }}
                              >
                                {formatMessageTime(msg.created_at)}
                              </span>
                              {isMe && <CheckCheck size={14} className="text-white-50" />}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Typing Indicator */}
                  {typingUser && (
                    <div className="d-flex align-items-center gap-2 text-muted small fst-italic py-1 px-3 bg-white rounded-pill border d-inline-flex mb-2">
                      <Spinner animation="grow" size="sm" variant="primary" />
                      <span>{typingUser} is typing...</span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* File Previews Bar */}
                {filePreviews.length > 0 && (
                  <div className="px-3 pt-2 pb-2 bg-light border-top d-flex gap-2 flex-wrap">
                    {filePreviews.map((file, idx) => (
                      <div key={idx} className="position-relative bg-white p-2 rounded-3 border d-flex align-items-center gap-2">
                        {file.type.startsWith("image/") ? (
                          <BSImage
                            src={file.url}
                            alt="preview"
                            style={{ width: "40px", height: "40px", objectFit: "cover" }}
                            className="rounded-2"
                          />
                        ) : file.type.startsWith("video/") ? (
                          <div className="d-flex align-items-center justify-content-center bg-dark text-white rounded-2" style={{ width: "40px", height: "40px" }}>
                            <VideoIcon size={18} />
                          </div>
                        ) : (
                          <div className="d-flex align-items-center justify-content-center bg-light text-primary rounded-2 border" style={{ width: "40px", height: "40px" }}>
                            <FileText size={18} />
                          </div>
                        )}

                        <div className="min-w-0" style={{ maxWidth: "120px" }}>
                          <p className="mb-0 small fw-semibold text-truncate" style={{ fontSize: "11px" }}>
                            {file.name}
                          </p>
                          <small className="text-muted" style={{ fontSize: "9px" }}>
                            {file.size}
                          </small>
                        </div>

                        <Button
                          variant="danger"
                          size="sm"
                          className="rounded-circle p-0 ms-1 d-flex align-items-center justify-content-center"
                          style={{ width: "18px", height: "18px" }}
                          onClick={() => removeFile(idx)}
                        >
                          <X size={12} />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Message Input Box */}
                <div className="p-3 border-top bg-white">
                  <Form onSubmit={handleSendMessage}>
                    <InputGroup className="bg-light rounded-pill p-1 border">
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="d-none"
                        multiple
                        accept="image/*,video/*,.pdf,.doc,.docx"
                        onChange={handleFileSelect}
                      />
                      <Button
                        variant="light"
                        className="rounded-circle border-0 p-2 text-muted"
                        onClick={() => fileInputRef.current?.click()}
                        title="Attach Image, Video, or File"
                      >
                        <Paperclip size={19} />
                      </Button>

                      <Form.Control
                        placeholder="Type a message..."
                        className="bg-transparent border-0 shadow-none text-dark px-2"
                        style={{ fontSize: "14px" }}
                        value={inputContent}
                        onChange={(e) => setInputContent(e.target.value)}
                        disabled={sending}
                      />

                      <Button
                        variant="primary"
                        type="submit"
                        disabled={sending || (!inputContent.trim() && selectedFiles.length === 0)}
                        className="rounded-circle p-2 d-flex align-items-center justify-content-center border-0"
                        style={{
                          width: "38px",
                          height: "38px",
                          backgroundColor: "#4f46e5",
                        }}
                      >
                        {sending ? <Spinner animation="border" size="sm" /> : <Send size={17} />}
                      </Button>
                    </InputGroup>
                  </Form>
                </div>
              </>
            ) : (
              <div className="d-flex flex-column align-items-center justify-content-center h-100 text-muted p-4">
                <div
                  className="rounded-circle p-4 mb-3 d-flex align-items-center justify-content-center text-primary border bg-light"
                >
                  <MessageSquare size={44} />
                </div>
                <h5 className="fw-bold text-dark mb-1">Your Chat Space</h5>
                <p className="text-muted small text-center max-w-sm mb-4">
                  Select a conversation from the sidebar or start a new chat with your team.
                </p>
                <Button
                  variant="primary"
                  className="rounded-pill px-4 border-0"
                  style={{ backgroundColor: "#4f46e5" }}
                  onClick={openDirectModal}
                >
                  <PlusCircle size={18} className="me-2" /> Start New Chat
                </Button>
              </div>
            )}
          </Col>
        </Row>
      </Card>

      {/* NEW DIRECT CHAT MODAL */}
      <Modal show={showDirectModal} onHide={() => setShowDirectModal(false)} centered className="rounded-3">
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
                  onClick={() => startDirectChatWithUser(user)}
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
      <Modal show={showGroupModal} onHide={() => setShowGroupModal(false)} centered className="rounded-3">
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
                  style={{ backgroundColor: "#4f46e5" }}
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
            style={{ backgroundColor: "#4f46e5" }}
            disabled={!groupName.trim() || selectedGroupMembers.length === 0}
            onClick={handleCreateGroup}
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
    </Container>
  );
}
