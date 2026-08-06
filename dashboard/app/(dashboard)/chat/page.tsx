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
  Image as ImageIcon,
  Video as VideoIcon,
  CheckCheck,
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

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConversations, setLoadingConversations] = useState<boolean>(true);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);

  // Message input state
  const [inputContent, setInputContent] = useState<string>("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<{ url: string; type: string; name: string }[]>([]);

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

  // Media preview modal
  const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null);

  // Typing indicator state
  const [typingUser, setTypingUser] = useState<string | null>(null);

  // User current ID
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
    setLoadingMessages(true);
    setMessages([]);
    try {
      const res = await fetchMessages(conv.id);
      // Reverse messages to show chronological order (oldest at top, newest at bottom)
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

  // Scroll message container to bottom
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

  // User Search for Modal
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
    <Container fluid className="p-3" style={{ height: "calc(100vh - 90px)" }}>
      <Card className="h-100 shadow-sm border-0 rounded-4 overflow-hidden">
        <Row className="g-0 h-100">
          {/* LEFT SIDEBAR: Conversations List */}
          <Col md={4} lg={3} className="border-end bg-light d-flex flex-column h-100">
            {/* Sidebar Header */}
            <div className="p-3 bg-white border-bottom">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold mb-0 text-primary d-flex align-items-center gap-2">
                  <MessageSquare size={22} /> Messages
                </h5>
                <div className="d-flex gap-1">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    className="rounded-circle p-2 d-flex align-items-center justify-content-center"
                    title="New Direct Chat"
                    onClick={openDirectModal}
                  >
                    <PlusCircle size={18} />
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    className="rounded-circle p-2 d-flex align-items-center justify-content-center"
                    title="Create Group Chat"
                    onClick={openGroupModal}
                  >
                    <Users size={18} />
                  </Button>
                </div>
              </div>

              {/* Search Box */}
              <InputGroup size="sm" className="bg-light rounded-3">
                <InputGroup.Text className="bg-transparent border-0 pe-1">
                  <Search size={16} className="text-muted" />
                </InputGroup.Text>
                <Form.Control
                  placeholder="Search chats..."
                  className="bg-transparent border-0 shadow-none text-dark"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </InputGroup>
            </div>

            {/* Conversation Items List */}
            <div className="flex-grow-1 overflow-auto p-2">
              {loadingConversations ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" size="sm" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <MessageSquare size={32} className="mb-2 opacity-50" />
                  <p className="small mb-0">No conversations found.</p>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isActive = activeConversation?.id === conv.id;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => selectConversation(conv)}
                      className={`p-3 mb-1 rounded-3 cursor-pointer transition-all d-flex align-items-center gap-3 ${
                        isActive
                          ? "bg-primary text-white shadow-sm"
                          : "bg-white text-dark hover-bg-light border border-light"
                      }`}
                      style={{ cursor: "pointer" }}
                    >
                      <div className="position-relative">
                        <div
                          className={`rounded-circle d-flex align-items-center justify-content-center text-white fw-bold ${
                            isActive ? "bg-white text-primary" : "bg-primary text-white"
                          }`}
                          style={{ width: "42px", height: "42px", fontSize: "16px" }}
                        >
                          {conv.type === "GROUP" ? (
                            <Users size={20} />
                          ) : (
                            (conv.display_name || "U")[0].toUpperCase()
                          )}
                        </div>
                      </div>

                      <div className="flex-grow-1 min-w-0">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <h6
                            className={`mb-0 text-truncate fw-semibold ${
                              isActive ? "text-white" : "text-dark"
                            }`}
                            style={{ fontSize: "14px" }}
                          >
                            {conv.display_name}
                          </h6>
                          <Badge
                            bg={conv.type === "GROUP" ? "info" : "secondary"}
                            style={{ fontSize: "10px" }}
                          >
                            {conv.type}
                          </Badge>
                        </div>
                        <p
                          className={`mb-0 text-truncate small ${
                            isActive ? "text-white-50" : "text-muted"
                          }`}
                          style={{ fontSize: "12px" }}
                        >
                          {conv.last_message ? (
                            conv.last_message.content || `[${conv.last_message.message_type}]`
                          ) : (
                            <em>No messages yet</em>
                          )}
                        </p>
                      </div>

                      {conv.unread_count > 0 && (
                        <Badge bg="danger" pill>
                          {conv.unread_count}
                        </Badge>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </Col>

          {/* RIGHT VIEW: Chat Conversation Area */}
          <Col md={8} lg={9} className="d-flex flex-column h-100 bg-white">
            {activeConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-3 border-bottom d-flex align-items-center justify-content-between bg-white">
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="rounded-circle bg-primary text-white fw-bold d-flex align-items-center justify-content-center"
                      style={{ width: "40px", height: "40px" }}
                    >
                      {activeConversation.type === "GROUP" ? (
                        <Users size={20} />
                      ) : (
                        (activeConversation.display_name || "C")[0].toUpperCase()
                      )}
                    </div>
                    <div>
                      <h6 className="fw-bold mb-0">{activeConversation.display_name}</h6>
                      <small className="text-muted">
                        {activeConversation.type === "GROUP"
                          ? `${activeConversation.members.length} members`
                          : "Direct Chat"}
                      </small>
                    </div>
                  </div>
                </div>

                {/* Messages Feed */}
                <div className="flex-grow-1 overflow-auto p-4 bg-light">
                  {loadingMessages ? (
                    <div className="text-center py-5">
                      <Spinner animation="border" variant="primary" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-5 text-muted">
                      <MessageSquare size={40} className="mb-2 opacity-50" />
                      <p>No messages in this chat yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.sender?.id === currentUserId;
                      return (
                        <div
                          key={msg.id}
                          className={`d-flex mb-3 ${isMe ? "justify-content-end" : "justify-content-start"}`}
                        >
                          <div
                            className={`p-3 rounded-4 shadow-sm style-msg ${
                              isMe
                                ? "bg-primary text-white rounded-bottom-end-0"
                                : "bg-white text-dark border rounded-bottom-start-0"
                            }`}
                            style={{ maxWidth: "70%", minWidth: "120px" }}
                          >
                            {!isMe && (
                              <small className="fw-bold text-primary d-block mb-1">
                                {msg.sender?.name || msg.sender?.username}
                              </small>
                            )}

                            {/* Text Content */}
                            {msg.content && <p className="mb-1 text-break">{msg.content}</p>}

                            {/* Attachments (Images / Videos / Files) */}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="mt-2 d-flex flex-column gap-2">
                                {msg.attachments.map((att) => {
                                  const isImg = att.file_type?.startsWith("image/");
                                  const isVid = att.file_type?.startsWith("video/");

                                  if (isImg) {
                                    return (
                                      <BSImage
                                        key={att.id}
                                        src={att.file_url}
                                        alt="attachment"
                                        className="rounded-3 cursor-pointer hover-opacity"
                                        style={{ maxHeight: "220px", objectFit: "cover" }}
                                        onClick={() => setPreviewMediaUrl(att.file_url)}
                                      />
                                    );
                                  }

                                  if (isVid) {
                                    return (
                                      <video
                                        key={att.id}
                                        controls
                                        className="rounded-3 w-100"
                                        style={{ maxHeight: "250px" }}
                                      >
                                        <source src={att.file_url} type={att.file_type || "video/mp4"} />
                                      </video>
                                    );
                                  }

                                  return (
                                    <a
                                      key={att.id}
                                      href={att.file_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className={`d-flex align-items-center gap-2 p-2 rounded ${
                                        isMe ? "bg-white-20 text-white" : "bg-light text-dark"
                                      }`}
                                    >
                                      <FileText size={18} />
                                      <span className="small text-truncate">Download Attachment</span>
                                    </a>
                                  );
                                })}
                              </div>
                            )}

                            <div className="d-flex justify-content-end align-items-center gap-1 mt-1">
                              <span
                                className={`small ${isMe ? "text-white-50" : "text-muted"}`}
                                style={{ fontSize: "10px" }}
                              >
                                {new Date(msg.created_at).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
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
                    <div className="d-flex align-items-center gap-2 text-muted small fst-italic py-2">
                      <Spinner animation="grow" size="sm" />
                      <span>{typingUser} is typing...</span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* File Previews Bar */}
                {filePreviews.length > 0 && (
                  <div className="px-3 pt-2 bg-light border-top d-flex gap-2 flex-wrap">
                    {filePreviews.map((file, idx) => (
                      <div key={idx} className="position-relative bg-white p-1 rounded border shadow-sm">
                        {file.type.startsWith("image/") ? (
                          <BSImage
                            src={file.url}
                            alt="preview"
                            style={{ width: "50px", height: "50px", objectFit: "cover" }}
                            className="rounded"
                          />
                        ) : file.type.startsWith("video/") ? (
                          <div className="d-flex align-items-center justify-content-center bg-dark text-white rounded" style={{ width: "50px", height: "50px" }}>
                            <VideoIcon size={20} />
                          </div>
                        ) : (
                          <div className="d-flex align-items-center justify-content-center bg-secondary text-white rounded" style={{ width: "50px", height: "50px" }}>
                            <FileText size={20} />
                          </div>
                        )}
                        <Button
                          variant="danger"
                          size="sm"
                          className="position-absolute top-0 end-0 rounded-circle p-0 d-flex align-items-center justify-content-center"
                          style={{ width: "18px", height: "18px", transform: "translate(30%, -30%)" }}
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
                    <InputGroup>
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="d-none"
                        multiple
                        accept="image/*,video/*,.pdf,.doc,.docx"
                        onChange={handleFileSelect}
                      />
                      <Button
                        variant="outline-secondary"
                        onClick={() => fileInputRef.current?.click()}
                        title="Attach Media or File"
                      >
                        <Paperclip size={18} />
                      </Button>

                      <Form.Control
                        placeholder="Type a message..."
                        className="shadow-none"
                        value={inputContent}
                        onChange={(e) => setInputContent(e.target.value)}
                        disabled={sending}
                      />

                      <Button
                        variant="primary"
                        type="submit"
                        disabled={sending || (!inputContent.trim() && selectedFiles.length === 0)}
                        className="d-flex align-items-center gap-1"
                      >
                        {sending ? <Spinner animation="border" size="sm" /> : <Send size={18} />}
                      </Button>
                    </InputGroup>
                  </Form>
                </div>
              </>
            ) : (
              <div className="d-flex flex-column align-items-center justify-content-center h-100 text-muted">
                <MessageSquare size={64} className="mb-3 opacity-25" />
                <h5>Select a conversation or start a new chat</h5>
              </div>
            )}
          </Col>
        </Row>
      </Card>

      {/* NEW DIRECT CHAT MODAL */}
      <Modal show={showDirectModal} onHide={() => setShowDirectModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6 fw-bold">New Direct Message</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold">Search User</Form.Label>
            <Form.Control
              placeholder="Search by name, email, or employee ID..."
              value={userQuery}
              onChange={(e) => handleSearchUsers(e.target.value)}
            />
          </Form.Group>

          {userSearchLoading ? (
            <div className="text-center py-3">
              <Spinner animation="border" size="sm" />
            </div>
          ) : userSearchResults.length === 0 ? (
            <p className="text-muted text-center py-3 mb-0 small">No employees or users found.</p>
          ) : (
            <div className="list-group">
              {userSearchResults.map((user) => (
                <button
                  key={user.id}
                  className="list-group-item list-group-item-action d-flex align-items-center justify-content-between"
                  onClick={() => startDirectChatWithUser(user)}
                >
                  <div>
                    <h6 className="mb-0 small fw-semibold">{user.name || user.email}</h6>
                    <small className="text-muted">{user.email}</small>
                  </div>
                  <Button variant="outline-primary" size="sm">
                    Chat
                  </Button>
                </button>
              ))}
            </div>
          )}
        </Modal.Body>
      </Modal>

      {/* NEW GROUP CHAT MODAL */}
      <Modal show={showGroupModal} onHide={() => setShowGroupModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6 fw-bold">Create Group Chat</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold">Group Name</Form.Label>
            <Form.Control
              placeholder="Enter group name..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold">Add Members</Form.Label>
            <Form.Control
              placeholder="Search users to add..."
              value={userQuery}
              onChange={(e) => handleSearchUsers(e.target.value)}
            />
          </Form.Group>

          {/* Selected Members Badges */}
          {selectedGroupMembers.length > 0 && (
            <div className="d-flex flex-wrap gap-1 mb-3">
              {selectedGroupMembers.map((m) => (
                <Badge key={m.id} bg="primary" className="d-flex align-items-center gap-1 p-2">
                  {m.name || m.username}
                  <X
                    size={12}
                    className="cursor-pointer"
                    onClick={() =>
                      setSelectedGroupMembers((prev) => prev.filter((u) => u.id !== m.id))
                    }
                  />
                </Badge>
              ))}
            </div>
          )}

          {userSearchLoading ? (
            <div className="text-center py-3">
              <Spinner animation="border" size="sm" />
            </div>
          ) : userSearchResults.length === 0 ? (
            <p className="text-muted text-center py-3 mb-0 small">No employees or users found.</p>
          ) : (
            <div className="list-group" style={{ maxHeight: "200px", overflowY: "auto" }}>
              {userSearchResults.map((user) => {
                const isSelected = selectedGroupMembers.some((m) => m.id === user.id);
                return (
                  <button
                    key={user.id}
                    className={`list-group-item list-group-item-action d-flex align-items-center justify-content-between ${
                      isSelected ? "bg-light" : ""
                    }`}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedGroupMembers((prev) => prev.filter((m) => m.id !== user.id));
                      } else {
                        setSelectedGroupMembers((prev) => [...prev, user]);
                      }
                    }}
                  >
                    <div>
                      <h6 className="mb-0 small fw-semibold">{user.name || user.username}</h6>
                      <small className="text-muted">{user.email}</small>
                    </div>
                    <Form.Check type="checkbox" checked={isSelected} readOnly />
                  </button>
                );
              })}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" size="sm" onClick={() => setShowGroupModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!groupName.trim() || selectedGroupMembers.length === 0}
            onClick={handleCreateGroup}
          >
            Create Group
          </Button>
        </Modal.Footer>
      </Modal>

      {/* MEDIA LIGHTBOX MODAL */}
      <Modal show={!!previewMediaUrl} onHide={() => setPreviewMediaUrl(null)} centered size="lg">
        <Modal.Body className="p-0 bg-dark rounded overflow-hidden position-relative">
          <Button
            variant="link"
            className="position-absolute top-0 end-0 text-white p-2 z-index-10"
            onClick={() => setPreviewMediaUrl(null)}
          >
            <X size={24} />
          </Button>
          {previewMediaUrl && (
            <BSImage src={previewMediaUrl} alt="preview" className="w-100 h-auto" />
          )}
        </Modal.Body>
      </Modal>
    </Container>
  );
}
