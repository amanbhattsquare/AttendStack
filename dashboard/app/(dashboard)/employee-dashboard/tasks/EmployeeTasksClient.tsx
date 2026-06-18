"use client";

import { useEffect, useMemo, useState } from "react";
import {
  IconAlertTriangle,
  IconCalendarDue,
  IconCircleCheck,
  IconClock,
  IconEdit,
  IconInfoCircle,
  IconPaperclip,
  IconSearch,
} from "@tabler/icons-react";
import { Alert, Badge, Button, Card, Col, Form, InputGroup, Modal, Row, Spinner, Table } from "react-bootstrap";

type TaskStatus = "TODO" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED" | "CANCELLED";
type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

type Task = {
  id: string;
  title: string;
  description: string;
  assigned_by_name: string | null;
  priority: TaskPriority;
  priority_label: string;
  status: TaskStatus;
  status_label: string;
  due_date: string | null;
  department: string;
  project_category: string;
  attachment_url: string | null;
  attachment_name: string | null;
  employee_attachment_url: string | null;
  employee_attachment_name: string | null;
  employee_notes: string;
  admin_notes: string;
  completed_at: string | null;
  is_overdue: boolean;
  created_at: string;
};

const API_ROOT = `${process.env.NEXT_PUBLIC_API_ENDPOINT}/api/v1`;
const TASKS_API = `${API_ROOT}/tasks/`;

const employeeStatusOptions: Array<{ value: TaskStatus; label: string }> = [
  { value: "TODO", label: "To Do" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "BLOCKED", label: "Blocked" },
  { value: "COMPLETED", label: "Completed" },
];

const filterOptions: Array<{ value: TaskStatus | "ALL"; label: string }> = [
  { value: "ALL", label: "All Tasks" },
  ...employeeStatusOptions,
  { value: "CANCELLED", label: "Cancelled" },
];

const formatDate = (value?: string | null) => {
  if (!value) return "No due date";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const getApiError = async (response: Response) => {
  const body = await response.json().catch(() => null);
  if (!body) return "Request failed. Please try again.";
  if (typeof body.detail === "string") return body.detail;
  return Object.values(body).flat().join(" ");
};

const getStatusBadge = (status: TaskStatus, label: string, overdue = false) => {
  if (overdue) {
    return <Badge bg="danger-subtle" className="text-danger border border-danger-subtle rounded-pill px-2 py-1">Overdue</Badge>;
  }

  const className = "border rounded-pill px-2 py-1 fw-semibold";
  switch (status) {
    case "COMPLETED":
      return <Badge bg="success-subtle" className={`text-success border-success-subtle ${className}`}>{label}</Badge>;
    case "IN_PROGRESS":
      return <Badge bg="primary-subtle" className={`text-primary border-primary-subtle ${className}`}>{label}</Badge>;
    case "BLOCKED":
      return <Badge bg="warning-subtle" className={`text-warning border-warning-subtle ${className}`}>{label}</Badge>;
    case "CANCELLED":
      return <Badge bg="secondary-subtle" className={`text-secondary border-secondary-subtle ${className}`}>{label}</Badge>;
    default:
      return <Badge bg="light" className={`text-dark border-secondary-subtle ${className}`}>{label}</Badge>;
  }
};

const getPriorityBadge = (priority: TaskPriority, label: string) => {
  const className = "rounded px-2 py-1 fw-semibold";
  switch (priority) {
    case "URGENT":
      return <Badge bg="danger-subtle" className={`text-danger ${className}`}>{label}</Badge>;
    case "HIGH":
      return <Badge bg="warning-subtle" className={`text-warning ${className}`}>{label}</Badge>;
    case "LOW":
      return <Badge bg="secondary-subtle" className={`text-secondary ${className}`}>{label}</Badge>;
    default:
      return <Badge bg="info-subtle" className={`text-info ${className}`}>{label}</Badge>;
  }
};

const EmployeeTasksClient = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "ALL">("ALL");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus>("TODO");
  const [employeeNotes, setEmployeeNotes] = useState("");
  const [employeeAttachment, setEmployeeAttachment] = useState<File | null>(null);

  const loadTasks = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(TASKS_API, { headers: authHeaders() });
      if (!response.ok) throw new Error(await getApiError(response));
      const data = await response.json();
      setTasks(Array.isArray(data) ? data : data.results || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load your assigned tasks.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const metrics = useMemo(() => ({
    total: tasks.length,
    active: tasks.filter((task) => ["TODO", "IN_PROGRESS", "BLOCKED"].includes(task.status)).length,
    overdue: tasks.filter((task) => task.is_overdue).length,
    completed: tasks.filter((task) => task.status === "COMPLETED").length,
  }), [tasks]);

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesSearch =
        !query ||
        task.title.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query) ||
        task.department.toLowerCase().includes(query) ||
        task.project_category.toLowerCase().includes(query) ||
        task.priority_label.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "ALL" || task.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [tasks, searchQuery, statusFilter]);

  const openUpdateModal = (task: Task) => {
    setSelectedTask(task);
    setSelectedStatus(task.status === "CANCELLED" ? "TODO" : task.status);
    setEmployeeNotes(task.employee_notes || "");
    setEmployeeAttachment(null);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setSelectedTask(null);
    setEmployeeNotes("");
    setEmployeeAttachment(null);
    setSelectedStatus("TODO");
  };

  const handleStatusSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedTask) return;

    setError("");
    setSuccessMsg("");
    setIsSubmitting(true);

    try {
      const payload = new FormData();
      payload.append("status", selectedStatus);
      payload.append("employee_notes", employeeNotes.trim());
      if (employeeAttachment) {
        payload.append("employee_attachment", employeeAttachment);
      }

      const response = await fetch(`${TASKS_API}${selectedTask.id}/status/`, {
        method: "PATCH",
        headers: authHeaders(),
        body: payload,
      });

      if (!response.ok) throw new Error(await getApiError(response));

      const updatedTask = await response.json();
      setTasks((previous) => previous.map((task) => task.id === updatedTask.id ? updatedTask : task));
      setSuccessMsg("Task status updated successfully.");
      closeModal();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to update task.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container-fluid px-0 py-4" style={{ minHeight: "85vh" }}>
      <div className="mb-4">
        <h2 className="fw-bold mb-1">My Tasks</h2>
        <p className="text-secondary mb-0">Track assigned work and keep your manager updated on progress.</p>
      </div>

      <Row className="g-3 mb-4">
        <Col xs={12} md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="d-flex align-items-center gap-3">
              <span className="task-stat-icon bg-primary-subtle text-primary"><IconCalendarDue size={22} /></span>
              <div><div className="text-secondary small fw-semibold">Assigned</div><div className="fs-3 fw-bold">{metrics.total}</div></div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="d-flex align-items-center gap-3">
              <span className="task-stat-icon bg-info-subtle text-info"><IconClock size={22} /></span>
              <div><div className="text-secondary small fw-semibold">Active</div><div className="fs-3 fw-bold">{metrics.active}</div></div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="d-flex align-items-center gap-3">
              <span className="task-stat-icon bg-danger-subtle text-danger"><IconAlertTriangle size={22} /></span>
              <div><div className="text-secondary small fw-semibold">Overdue</div><div className="fs-3 fw-bold">{metrics.overdue}</div></div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="d-flex align-items-center gap-3">
              <span className="task-stat-icon bg-success-subtle text-success"><IconCircleCheck size={22} /></span>
              <div><div className="text-secondary small fw-semibold">Completed</div><div className="fs-3 fw-bold">{metrics.completed}</div></div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {successMsg && <Alert variant="success" className="border-0 shadow-sm" onClose={() => setSuccessMsg("")} dismissible>{successMsg}</Alert>}
      {error && <Alert variant="danger" className="border-0 shadow-sm" onClose={() => setError("")} dismissible>{error}</Alert>}

      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <Row className="g-3 align-items-center">
            <Col xs={12} lg={6}>
              <InputGroup>
                <InputGroup.Text className="bg-white"><IconSearch size={18} className="text-secondary" /></InputGroup.Text>
                <Form.Control
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search your tasks"
                />
              </InputGroup>
            </Col>
            <Col xs={12} lg={3}>
              <Form.Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as TaskStatus | "ALL")}>
                {filterOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm" style={{ overflow: "hidden" }}>
        <Card.Body className="p-0">
          {isLoading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" className="mb-2" />
              <p className="text-secondary small mb-0">Loading assigned tasks...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-5 px-3">
              <IconInfoCircle size={40} className="text-muted mb-2" />
              <h5 className="fw-semibold">No tasks found</h5>
              <p className="text-secondary mb-0">You do not have assigned tasks matching this view.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="align-middle mb-0 employee-tasks-table">
                <thead className="table-light">
                  <tr className="small text-secondary text-uppercase">
                    <th className="px-4 py-3">Task</th>
                    <th className="py-3">Context</th>
                    <th className="py-3">Due Date</th>
                    <th className="py-3">Priority</th>
                    <th className="py-3">Status</th>
                    <th className="py-3">Attachments</th>
                    <th className="py-3">Assigned By</th>
                    <th className="px-4 py-3 text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((task) => (
                    <tr key={task.id}>
                      <td className="px-4 py-3 employee-task-title-cell" data-label="Task">
                        <div className="fw-bold text-dark">{task.title}</div>
                        <div className="text-secondary small text-truncate" style={{ maxWidth: 440 }}>
                          {task.description || "No description"}
                        </div>
                        {task.employee_notes && (
                          <div className="text-secondary small mt-1 text-truncate" style={{ maxWidth: 440 }}>
                            Note: {task.employee_notes}
                          </div>
                        )}
                      </td>
                      <td className="py-3 small" data-label="Context">
                        <div className="fw-semibold text-dark">{task.department || "No department"}</div>
                        <div className="text-secondary">{task.project_category || "No project/category"}</div>
                      </td>
                      <td className="py-3 small fw-medium" data-label="Due Date">{formatDate(task.due_date)}</td>
                      <td className="py-3" data-label="Priority">{getPriorityBadge(task.priority, task.priority_label)}</td>
                      <td className="py-3" data-label="Status">{getStatusBadge(task.status, task.status_label, task.is_overdue)}</td>
                      <td className="py-3 small" data-label="Attachments">
                        <div className="d-flex flex-column gap-1">
                          {task.attachment_url && (
                            <a href={task.attachment_url} target="_blank" rel="noopener noreferrer" className="d-inline-flex align-items-center gap-1 text-decoration-none">
                              <IconPaperclip size={15} /> Task: {task.attachment_name || "Attachment"}
                            </a>
                          )}
                          {task.employee_attachment_url && (
                            <a href={task.employee_attachment_url} target="_blank" rel="noopener noreferrer" className="d-inline-flex align-items-center gap-1 text-decoration-none">
                              <IconPaperclip size={15} /> Mine: {task.employee_attachment_name || "Attachment"}
                            </a>
                          )}
                          {!task.attachment_url && !task.employee_attachment_url && (
                            <span className="text-muted">None</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 small text-secondary" data-label="Assigned By">{task.assigned_by_name || "Admin"}</td>
                      <td className="px-4 py-3 text-end" data-label="Action">
                        <Button
                          variant={task.status === "CANCELLED" ? "outline-secondary" : "outline-primary"}
                          size="sm"
                          disabled={task.status === "CANCELLED"}
                          onClick={() => openUpdateModal(task)}
                          className="d-inline-flex align-items-center gap-1"
                        >
                          <IconEdit size={16} /> Update
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      <Modal show={Boolean(selectedTask)} onHide={closeModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Update Task Status</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleStatusSubmit}>
          <Modal.Body>
            <div className="p-3 bg-light border rounded mb-4">
              <div className="fw-bold text-dark">{selectedTask?.title}</div>
              <div className="text-secondary small mt-1">{selectedTask?.description || "No description"}</div>
              {selectedTask?.due_date && (
                <div className="text-secondary small mt-2">Due: {formatDate(selectedTask.due_date)}</div>
              )}
              {(selectedTask?.department || selectedTask?.project_category) && (
                <div className="text-secondary small mt-1">
                  {[selectedTask.department, selectedTask.project_category].filter(Boolean).join(" - ")}
                </div>
              )}
              {selectedTask?.attachment_url && (
                <a href={selectedTask.attachment_url} target="_blank" rel="noopener noreferrer" className="d-inline-flex align-items-center gap-1 small mt-2 text-decoration-none">
                  <IconPaperclip size={15} /> Task: {selectedTask.attachment_name || "Attachment"}
                </a>
              )}
              {selectedTask?.employee_attachment_url && (
                <a href={selectedTask.employee_attachment_url} target="_blank" rel="noopener noreferrer" className="d-inline-flex align-items-center gap-1 small mt-2 text-decoration-none">
                  <IconPaperclip size={15} /> Mine: {selectedTask.employee_attachment_name || "Attachment"}
                </a>
              )}
            </div>

            <Form.Group className="mb-3" controlId="taskStatus">
              <Form.Label className="fw-semibold">Status</Form.Label>
              <Form.Select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value as TaskStatus)}>
                {employeeStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group controlId="employeeTaskNotes">
              <Form.Label className="fw-semibold">Progress Note</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={employeeNotes}
                onChange={(event) => setEmployeeNotes(event.target.value)}
                placeholder="Add progress, blockers, or completion notes."
                maxLength={2000}
              />
            </Form.Group>

            <Form.Group className="mt-3" controlId="employeeTaskAttachment">
              <Form.Label className="fw-semibold">Attach File</Form.Label>
              <Form.Control
                type="file"
                onChange={(event) => {
                  const input = event.currentTarget as HTMLInputElement;
                  setEmployeeAttachment(input.files?.[0] || null);
                }}
              />
              <Form.Text className="text-secondary">
                Optional file or document. Maximum size: 10 MB.
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={closeModal} disabled={isSubmitting}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? <><Spinner size="sm" animation="border" className="me-2" />Updating...</> : "Update Status"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <style>{`
        .task-stat-icon {
          width: 44px;
          height: 44px;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 44px;
        }

        .employee-tasks-table {
          table-layout: fixed;
        }

        .employee-task-title-cell {
          width: 30%;
          min-width: 260px;
        }

        .employee-tasks-table th:nth-child(2),
        .employee-tasks-table td:nth-child(2) {
          width: 17%;
        }

        .employee-tasks-table th:nth-child(3),
        .employee-tasks-table td:nth-child(3),
        .employee-tasks-table th:nth-child(4),
        .employee-tasks-table td:nth-child(4),
        .employee-tasks-table th:nth-child(5),
        .employee-tasks-table td:nth-child(5) {
          width: 11%;
        }

        .employee-tasks-table th:nth-child(6),
        .employee-tasks-table td:nth-child(6) {
          width: 17%;
        }

        .employee-tasks-table th:nth-child(7),
        .employee-tasks-table td:nth-child(7) {
          width: 10%;
        }

        .employee-tasks-table th:nth-child(8),
        .employee-tasks-table td:nth-child(8) {
          width: 12%;
        }

        @media (max-width: 991.98px) {
          .employee-tasks-table {
            table-layout: auto;
          }

          .employee-tasks-table thead {
            display: none;
          }

          .employee-tasks-table,
          .employee-tasks-table tbody,
          .employee-tasks-table tr,
          .employee-tasks-table td {
            display: block;
            width: 100% !important;
          }

          .employee-tasks-table tbody {
            padding: 12px;
            background: #f8fafc;
          }

          .employee-tasks-table tr {
            margin: 12px 0;
            border: 1px solid #e5eaf0;
            border-radius: 8px;
            background: #fff;
            box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06);
            overflow: hidden;
          }

          .employee-tasks-table td {
            display: grid;
            grid-template-columns: minmax(104px, 34%) 1fr;
            gap: 12px;
            align-items: start;
            border: 0;
            border-bottom: 1px solid #eef2f6;
            padding: 12px 16px !important;
            white-space: normal;
            text-align: left !important;
          }

          .employee-tasks-table td:last-child {
            border-bottom: 0;
          }

          .employee-tasks-table td::before {
            content: attr(data-label);
            font-size: 0.72rem;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0;
          }

          .employee-tasks-table .text-truncate {
            max-width: none !important;
            white-space: normal !important;
            overflow: visible !important;
            text-overflow: clip !important;
          }

          .employee-tasks-table td[data-label="Action"] .btn {
            width: 100%;
            justify-content: center;
          }
        }

        @media (max-width: 575.98px) {
          .employee-tasks-table tbody {
            padding: 8px;
          }

          .employee-tasks-table td {
            grid-template-columns: 1fr;
            gap: 6px;
          }
        }
      `}</style>
    </div>
  );
};

export default EmployeeTasksClient;
