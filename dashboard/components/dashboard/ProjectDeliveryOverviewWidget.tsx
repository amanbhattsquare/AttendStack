"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { Card, Row, Col, Badge, Spinner, Button } from "react-bootstrap";
import {
  IconListDetails,
  IconFlag,
  IconClock,
  IconAlertTriangle,
  IconCircleCheck,
  IconPlayerPause,
  IconFlame,
  IconBolt,
  IconArrowRight,
  IconFolder,
  IconCalendarTime,
  IconAlertCircle,
  IconSparkles,
  IconUser,
} from "@tabler/icons-react";

export type TaskRecord = {
  id: string;
  title: string;
  project_key?: string | null;
  project_name?: string | null;
  project_color?: string | null;
  subtask_count?: number;
  assignee_name?: string;
  assignee_department?: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  priority_label?: string;
  status: "PENDING" | "TODO" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETED" | "CLOSED" | "CANCELLED";
  status_label?: string;
  due_date?: string | null;
  is_overdue?: boolean;
  updated_at?: string;
  created_at?: string;
};

const BASE_URL = `${process.env.NEXT_PUBLIC_API_ENDPOINT}/api/v1`;

const authHeaders = (): HeadersInit => {
  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const formatDate = (value?: string | null) => {
  if (!value) return "No due date";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "No due date";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const daysUntil = (value?: string | null) => {
  if (!value) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(value);
  if (isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / 86400000);
};

const getDueBadge = (dueDate?: string | null, isOverdue?: boolean) => {
  if (!dueDate) return null;
  const days = daysUntil(dueDate);
  if (days === null) return null;

  if (isOverdue || days < 0) {
    const overdueDays = Math.abs(days);
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          background: "#fef2f2",
          color: "#dc2626",
          border: "1px solid #fecaca",
          borderRadius: "6px",
          fontSize: "11px",
          fontWeight: 700,
          padding: "3px 8px",
        }}
      >
        <IconAlertCircle size={12} />
        {overdueDays === 0 ? "Overdue today" : `Overdue by ${overdueDays}d`}
      </span>
    );
  }

  if (days === 0) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          background: "#fffbeb",
          color: "#d97706",
          border: "1px solid #fde68a",
          borderRadius: "6px",
          fontSize: "11px",
          fontWeight: 700,
          padding: "3px 8px",
        }}
      >
        <IconClock size={12} />
        Due Today
      </span>
    );
  }

  if (days <= 3) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          background: "#fff7ed",
          color: "#ea580c",
          border: "1px solid #fed7aa",
          borderRadius: "6px",
          fontSize: "11px",
          fontWeight: 700,
          padding: "3px 8px",
        }}
      >
        <IconCalendarTime size={12} />
        Due in {days}d
      </span>
    );
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        background: "#f8fafc",
        color: "#475569",
        border: "1px solid #e2e8f0",
        borderRadius: "6px",
        fontSize: "11px",
        fontWeight: 600,
        padding: "3px 8px",
      }}
    >
      <IconCalendarTime size={12} />
      {formatDate(dueDate)}
    </span>
  );
};

const getStatusBadgeStyle = (status: TaskRecord["status"]) => {
  switch (status) {
    case "IN_PROGRESS":
      return {
        background: "#eff6ff",
        color: "#1d4ed8",
        border: "1px solid #bfdbfe",
      };
    case "TODO":
      return {
        background: "#f8fafc",
        color: "#334155",
        border: "1px solid #cbd5e1",
      };
    case "PENDING":
      return {
        background: "#f0f9ff",
        color: "#0369a1",
        border: "1px solid #bae6fd",
      };
    case "ON_HOLD":
      return {
        background: "#fffbeb",
        color: "#b45309",
        border: "1px solid #fde68a",
      };
    case "COMPLETED":
      return {
        background: "#f0fdf4",
        color: "#15803d",
        border: "1px solid #bbf7d0",
      };
    case "CLOSED":
      return {
        background: "#faf5ff",
        color: "#7e22ce",
        border: "1px solid #e9d5ff",
      };
    case "CANCELLED":
      return {
        background: "#fef2f2",
        color: "#b91c1c",
        border: "1px solid #fecaca",
      };
    default:
      return {
        background: "#f1f5f9",
        color: "#475569",
        border: "1px solid #cbd5e1",
      };
  }
};

const getPriorityBadgeStyle = (priority: TaskRecord["priority"]) => {
  switch (priority) {
    case "URGENT":
      return {
        background: "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
        color: "#b91c1c",
        border: "1px solid #fca5a5",
        fontWeight: 700,
      };
    case "HIGH":
      return {
        background: "linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)",
        color: "#c2410c",
        border: "1px solid #fdba74",
        fontWeight: 700,
      };
    case "MEDIUM":
      return {
        background: "#f0f9ff",
        color: "#0284c7",
        border: "1px solid #bae6fd",
        fontWeight: 600,
      };
    case "LOW":
    default:
      return {
        background: "#f8fafc",
        color: "#64748b",
        border: "1px solid #e2e8f0",
        fontWeight: 600,
      };
  }
};

const getInitials = (name?: string) => {
  if (!name) return "U";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const ProjectDeliveryOverviewWidget: React.FC = () => {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"ALL" | "ACTIVE" | "HIGH_PRIORITY" | "OVERDUE" | "TODO">("ALL");

  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE_URL}/tasks/?page_size=500`, { headers: authHeaders() });
      if (!res.ok) {
        throw new Error("Unable to load tasks.");
      }
      const data = await res.json();
      const rawTasks = Array.isArray(data) ? data : data?.results || [];
      setTasks(rawTasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load task data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const metrics = useMemo(() => {
    const total = tasks.length;
    const pending = tasks.filter((t) => t.status === "PENDING").length;
    const todo = tasks.filter((t) => t.status === "TODO").length;
    const active = tasks.filter((t) => t.status === "IN_PROGRESS").length;
    const overdue = tasks.filter((t) => t.is_overdue).length;
    const onHold = tasks.filter((t) => t.status === "ON_HOLD").length;
    const urgent = tasks.filter(
      (t) =>
        ["URGENT", "HIGH"].includes(t.priority) &&
        !["COMPLETED", "CLOSED", "CANCELLED"].includes(t.status)
    ).length;
    const completed = tasks.filter((t) => ["COMPLETED", "CLOSED"].includes(t.status)).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      pending,
      todo,
      active,
      overdue,
      onHold,
      urgent,
      completed,
      completionRate,
    };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const priorityRank = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as const;

    let list = [...tasks];
    if (activeTab === "ALL") {
      list = list.filter((t) => !["COMPLETED", "CLOSED", "CANCELLED"].includes(t.status));
    } else if (activeTab === "ACTIVE") {
      list = list.filter((t) => t.status === "IN_PROGRESS");
    } else if (activeTab === "HIGH_PRIORITY") {
      list = list.filter(
        (t) =>
          ["URGENT", "HIGH"].includes(t.priority) &&
          !["COMPLETED", "CLOSED", "CANCELLED"].includes(t.status)
      );
    } else if (activeTab === "OVERDUE") {
      list = list.filter((t) => t.is_overdue);
    } else if (activeTab === "TODO") {
      list = list.filter((t) => t.status === "TODO" || t.status === "PENDING");
    }

    return list
      .sort((a, b) => {
        const pDiff = priorityRank[a.priority] - priorityRank[b.priority];
        if (pDiff) return pDiff;
        if (Boolean(a.is_overdue) !== Boolean(b.is_overdue)) return a.is_overdue ? -1 : 1;
        if (a.status === "ON_HOLD" && b.status !== "ON_HOLD") return -1;
        if (b.status === "ON_HOLD" && a.status !== "ON_HOLD") return 1;
        const aDue = daysUntil(a.due_date);
        const bDue = daysUntil(b.due_date);
        if (aDue !== null && bDue !== null) return aDue - bDue;
        if (aDue !== null) return -1;
        if (bDue !== null) return 1;
        return (
          new Date(b.updated_at || b.created_at || 0).getTime() -
          new Date(a.updated_at || a.created_at || 0).getTime()
        );
      })
      .slice(0, 5);
  }, [tasks, activeTab]);

  const metricCards = [
    {
      title: "Pending",
      count: metrics.pending,
      link: "/tasks?status=PENDING",
      icon: <IconClock size={20} />,
      accentColor: "#0284c7",
      bgColor: "#f0f9ff",
      borderColor: "#e0f2fe",
      badgeColor: "#0369a1",
    },
    {
      title: "To Do",
      count: metrics.todo,
      link: "/tasks?status=TODO",
      icon: <IconListDetails size={20} />,
      accentColor: "#475569",
      bgColor: "#f8fafc",
      borderColor: "#e2e8f0",
      badgeColor: "#334155",
    },
    {
      title: "Active",
      count: metrics.active,
      link: "/tasks?task_filter=active",
      icon: <IconBolt size={20} />,
      accentColor: "#4f46e5",
      bgColor: "#eef2ff",
      borderColor: "#e0e7ff",
      badgeColor: "#4338ca",
    },
    {
      title: "Overdue",
      count: metrics.overdue,
      link: "/tasks?task_filter=overdue",
      icon: <IconAlertTriangle size={20} />,
      accentColor: "#dc2626",
      bgColor: "#fef2f2",
      borderColor: "#fee2e2",
      badgeColor: "#b91c1c",
    },
    {
      title: "On Hold",
      count: metrics.onHold,
      link: "/tasks?task_filter=on-hold",
      icon: <IconPlayerPause size={20} />,
      accentColor: "#d97706",
      bgColor: "#fffbeb",
      borderColor: "#fef3c7",
      badgeColor: "#b45309",
    },
    {
      title: "High Priority",
      count: metrics.urgent,
      link: "/tasks?task_filter=high-priority",
      icon: <IconFlame size={20} />,
      accentColor: "#ea580c",
      bgColor: "#fff7ed",
      borderColor: "#ffedd5",
      badgeColor: "#c2410c",
    },
  ];

  return (
    <Card
      className="border-0 shadow-sm mb-6"
      style={{
        borderRadius: "16px",
        overflow: "hidden",
        border: "1px solid rgba(226, 232, 240, 0.8)",
        background: "#ffffff",
      }}
    >
      {/* Top Banner Header */}
      <div
        className="p-4 d-flex flex-column flex-xl-row align-items-xl-center justify-content-between gap-3"
        style={{
          borderBottom: "1px solid #f1f5f9",
          background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
        }}
      >
        <div className="d-flex align-items-center gap-3">
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(79, 70, 229, 0.25)",
              flexShrink: 0,
            }}
          >
            <IconListDetails size={24} />
          </div>
          <div>
            <div className="d-flex align-items-center gap-2">
              <h5 className="mb-0 fw-bold text-dark fs-4">Project Delivery & Tasks Overview</h5>
              <span
                style={{
                  background: "#dcfce7",
                  color: "#15803d",
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "999px",
                  border: "1px solid #bbf7d0",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Live Sync
              </span>
            </div>
            <p className="text-secondary small mb-0 mt-1">
              Real-time workload, project milestones, assignee status, and delivery risk.
            </p>
          </div>
        </div>

        {/* Right Action & Progress Tracker */}
        <div className="d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center gap-3">
          {/* Completion Meter Card */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "10px 16px",
              minWidth: "200px",
              boxShadow: "0 2px 6px rgba(15, 23, 42, 0.04)",
            }}
          >
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Task Completion
              </span>
              <strong style={{ fontSize: "15px", color: "#0f172a", fontWeight: 800 }}>
                {metrics.completionRate}%
              </strong>
            </div>
            <div
              style={{
                background: "#e2e8f0",
                borderRadius: "999px",
                height: "6px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${metrics.completionRate}%`,
                  background: "linear-gradient(90deg, #4f46e5 0%, #10b981 100%)",
                  height: "100%",
                  borderRadius: "999px",
                  transition: "width 0.4s ease",
                }}
              />
            </div>
          </div>

          <Link
            href="/tasks"
            className="btn btn-primary px-4 py-2 fw-semibold d-inline-flex align-items-center justify-content-center gap-2 shadow-sm"
            style={{
              borderRadius: "10px",
              background: "linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)",
              border: "none",
              fontSize: "14px",
              boxShadow: "0 4px 12px rgba(79, 70, 229, 0.3)",
            }}
          >
            <IconFolder size={18} />
            <span>Open Workspace</span>
            <IconArrowRight size={16} />
          </Link>
        </div>
      </div>

      <Card.Body className="p-4">
        {isLoading ? (
          <div className="d-flex justify-content-center align-items-center py-5">
            <Spinner animation="border" variant="primary" size="sm" className="me-2" />
            <span className="text-secondary small fw-medium">Loading project workload…</span>
          </div>
        ) : error ? (
          <div className="text-center py-4 text-secondary small">
            <IconAlertTriangle size={24} className="text-warning mb-2 d-block mx-auto" />
            {error}
          </div>
        ) : (
          <>
            {/* 6 Modern Stat Metric Cards */}
            <Row className="g-3 mb-4">
              {metricCards.map((metric, idx) => (
                <Col key={idx} xs={6} md={4} xl={2}>
                  <Link
                    href={metric.link}
                    style={{
                      textDecoration: "none",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      height: "100%",
                      minHeight: "100px",
                      background: metric.bgColor,
                      border: `1px solid ${metric.borderColor}`,
                      borderRadius: "14px",
                      padding: "14px 16px",
                      position: "relative",
                      overflow: "hidden",
                      transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                      cursor: "pointer",
                      boxShadow: "0 2px 4px rgba(15, 23, 42, 0.02)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-3px)";
                      e.currentTarget.style.boxShadow = "0 8px 18px rgba(15, 23, 42, 0.08)";
                      e.currentTarget.style.borderColor = metric.accentColor;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 2px 4px rgba(15, 23, 42, 0.02)";
                      e.currentTarget.style.borderColor = metric.borderColor;
                    }}
                  >
                    {/* Top Accent Strip */}
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        height: "3px",
                        background: metric.accentColor,
                      }}
                    />

                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          color: metric.badgeColor,
                          textTransform: "uppercase",
                          letterSpacing: "0.4px",
                        }}
                      >
                        {metric.title}
                      </span>
                      <div
                        style={{
                          color: metric.accentColor,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "30px",
                          height: "30px",
                          borderRadius: "8px",
                          background: "rgba(255, 255, 255, 0.7)",
                        }}
                      >
                        {metric.icon}
                      </div>
                    </div>

                    <div className="d-flex align-items-baseline justify-content-between">
                      <span
                        style={{
                          fontSize: "28px",
                          fontWeight: 800,
                          color: "#0f172a",
                          lineHeight: 1,
                        }}
                      >
                        {metric.count}
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          color: metric.badgeColor,
                          fontWeight: 600,
                        }}
                      >
                        View &rarr;
                      </span>
                    </div>
                  </Link>
                </Col>
              ))}
            </Row>

            {/* Filter Tabs & Task List Header */}
            <div
              className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-3 pt-2"
              style={{ borderTop: "1px solid #f1f5f9" }}
            >
              <div className="d-flex align-items-center gap-1 flex-wrap pt-2">
                <span className="text-secondary small fw-bold me-2 text-uppercase" style={{ fontSize: "11px" }}>
                  Quick Filter:
                </span>
                {[
                  { key: "ALL", label: `All Active (${metrics.total - metrics.completed})` },
                  { key: "HIGH_PRIORITY", label: `High Priority (${metrics.urgent})` },
                  { key: "OVERDUE", label: `Overdue (${metrics.overdue})` },
                  { key: "TODO", label: `To Do (${metrics.todo})` },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key as any)}
                    style={{
                      border: "none",
                      background: activeTab === tab.key ? "#4f46e5" : "#f1f5f9",
                      color: activeTab === tab.key ? "#ffffff" : "#475569",
                      fontSize: "12px",
                      fontWeight: activeTab === tab.key ? 700 : 600,
                      padding: "5px 12px",
                      borderRadius: "20px",
                      transition: "all 0.15s ease",
                      cursor: "pointer",
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <Link
                  href="/tasks"
                  className="small text-primary fw-bold text-decoration-none d-inline-flex align-items-center gap-1"
                >
                  Manage all projects in Workspace <IconArrowRight size={14} />
                </Link>
              </div>
            </div>

            {/* Tasks List */}
            {filteredTasks.length === 0 ? (
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px dashed #cbd5e1",
                  borderRadius: "14px",
                  padding: "32px 24px",
                  textAlign: "center",
                }}
              >
                <IconCircleCheck size={36} className="text-success mb-2 d-block mx-auto" />
                <div className="fw-bold text-dark fs-5">All clear in this view!</div>
                <div className="text-secondary small mt-1 mb-3">
                  No active tasks matching this criteria. Keep up the high delivery momentum.
                </div>
                <Link href="/tasks" className="btn btn-outline-primary btn-sm px-4 fw-semibold">
                  + Create New Task
                </Link>
              </div>
            ) : (
              <div style={{ display: "grid", gap: "10px" }}>
                {filteredTasks.map((task) => {
                  const statusStyle = getStatusBadgeStyle(task.status);
                  const priorityStyle = getPriorityBadgeStyle(task.priority);

                  return (
                    <div
                      key={task.id}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #eef2f6",
                        borderRadius: "12px",
                        padding: "14px 18px",
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1fr) auto",
                        alignItems: "center",
                        gap: "16px",
                        transition: "all 0.18s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#cbd5e1";
                        e.currentTarget.style.boxShadow = "0 4px 14px rgba(15, 23, 42, 0.05)";
                        e.currentTarget.style.transform = "translateX(2px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#eef2f6";
                        e.currentTarget.style.boxShadow = "none";
                        e.currentTarget.style.transform = "translateX(0)";
                      }}
                    >
                      {/* Left: Task title, project key, due date & assignee */}
                      <div style={{ minWidth: 0 }}>
                        <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                          <Link
                            href="/tasks"
                            className="text-dark fw-bold text-decoration-none text-truncate"
                            style={{ fontSize: "14px", maxWidth: "450px" }}
                          >
                            {task.title}
                          </Link>

                          {task.project_key && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                border: `1px solid ${task.project_color || "#4f46e5"}`,
                                color: task.project_color || "#4f46e5",
                                background: `${task.project_color || "#4f46e5"}15`,
                                borderRadius: "6px",
                                fontSize: "11px",
                                fontWeight: 800,
                                padding: "2px 6px",
                                letterSpacing: "0.5px",
                              }}
                            >
                              {task.project_key}
                            </span>
                          )}

                          {getDueBadge(task.due_date, task.is_overdue)}
                        </div>

                        {/* Assignee & Subtask metadata */}
                        <div className="d-flex align-items-center gap-3 text-secondary small flex-wrap">
                          <div className="d-flex align-items-center gap-1.5">
                            <div
                              style={{
                                width: "20px",
                                height: "20px",
                                borderRadius: "50%",
                                background: "#e0e7ff",
                                color: "#4338ca",
                                fontSize: "10px",
                                fontWeight: 700,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {getInitials(task.assignee_name)}
                            </div>
                            <span className="fw-medium text-dark">
                              {task.assignee_name || "Unassigned"}
                            </span>
                            {task.assignee_department && (
                              <span className="text-muted">({task.assignee_department})</span>
                            )}
                          </div>

                          {task.subtask_count ? (
                            <span
                              style={{
                                background: "#f1f5f9",
                                color: "#475569",
                                borderRadius: "4px",
                                padding: "1px 6px",
                                fontSize: "11px",
                                fontWeight: 600,
                              }}
                            >
                              📋 {task.subtask_count} subtask{task.subtask_count === 1 ? "" : "s"}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Right: Priority & Status Badges */}
                      <div className="d-flex align-items-center gap-2 flex-wrap justify-content-end">
                        <span
                          style={{
                            ...priorityStyle,
                            borderRadius: "6px",
                            padding: "4px 10px",
                            fontSize: "11px",
                            letterSpacing: "0.3px",
                            textTransform: "uppercase",
                          }}
                        >
                          {task.priority_label || task.priority}
                        </span>

                        <span
                          style={{
                            ...statusStyle,
                            borderRadius: "6px",
                            padding: "4px 10px",
                            fontSize: "11px",
                            fontWeight: 700,
                            letterSpacing: "0.3px",
                          }}
                        >
                          {task.status_label || task.status.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottom Footer Navigation */}
            <div className="text-center mt-4">
              <Link
                href="/tasks"
                className="btn btn-light text-primary fw-semibold px-4 py-2 border shadow-xs d-inline-flex align-items-center gap-2"
                style={{ borderRadius: "8px", fontSize: "13px" }}
              >
                <span>View Full Tasks Board & Kanban Workspace ({metrics.total})</span>
                <IconArrowRight size={16} />
              </Link>
            </div>
          </>
        )}
      </Card.Body>
    </Card>
  );
};

export default ProjectDeliveryOverviewWidget;
