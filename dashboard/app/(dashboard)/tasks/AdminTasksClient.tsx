"use client";

import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import {
  IconAlertTriangle,
  IconCalendarDue,
  IconCircleCheck,
  IconClock,
  IconEdit,
  IconInfoCircle,
  IconPaperclip,
  IconPlus,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import { Alert, Badge, Button, Card, Col, Form, InputGroup, Modal, Row, Spinner, Table } from "react-bootstrap";
import { Avatar } from "components/common/Avatar";
import { getAssetPath } from "helper/assetPath";

type TaskStatus = "PENDING" | "TODO" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETED" | "CLOSED" | "CANCELLED";
type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

type Task = {
  id: string;
  title: string;
  description: string;
  assignee: string;
  assignee_uuid: string;
  assignee_id: string;
  assignee_name: string;
  assignee_email: string;
  assignee_department: string;
  assignee_designation: string;
  assignee_avatar_url: string | null;
  assigned_by_name: string | null;
  priority: TaskPriority;
  priority_label: string;
  status: TaskStatus;
  status_label: string;
  due_date: string | null;
  department: string;
  project_category: string;
  attachment: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  employee_attachment: string | null;
  employee_attachment_url: string | null;
  employee_attachment_name: string | null;
  employee_notes: string;
  admin_notes: string;
  completed_at: string | null;
  is_overdue: boolean;
  created_at: string;
  updated_at: string;
};

type Employee = {
  id: string;
  employee_id: string;
  full_name: string;
  email: string;
  department: string;
  designation: string;
  status: string;
  profile_photo_url: string | null;
};

type TaskFormState = {
  title: string;
  description: string;
  assignee: string;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string;
  department: string;
  project_category: string;
  attachment: File | null;
  admin_notes: string;
};

const API_ROOT = `${process.env.NEXT_PUBLIC_API_ENDPOINT}/api/v1`;
const TASKS_API = `${API_ROOT}/tasks/`;
const EMPLOYEES_API = `${API_ROOT}/employees/`;

const emptyForm: TaskFormState = {
  title: "",
  description: "",
  assignee: "",
  priority: "MEDIUM",
  status: "PENDING",
  due_date: "",
  department: "",
  project_category: "",
  attachment: null,
  admin_notes: "",
};

const statusOptions: Array<{ value: TaskStatus | "ALL"; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "TODO", label: "To Do" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CLOSED", label: "Closed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const priorityOptions: Array<{ value: TaskPriority | "ALL"; label: string }> = [
  { value: "ALL", label: "All Priorities" },
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
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
    return <Badge className="task-status-badge task-status-overdue">Overdue</Badge>;
  }

  return <Badge className={`task-status-badge task-status-${status.toLowerCase().replace("_", "-")}`}>{label}</Badge>;
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

const AdminTasksClient = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "ALL">("ALL");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "ALL">("ALL");
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [form, setForm] = useState<TaskFormState>(emptyForm);

  const parseList = <T,>(data: T[] | { results?: T[] }) => Array.isArray(data) ? data : data.results || [];

  const loadData = async () => {
    setIsLoading(true);
    setError("");
    try {
      const [tasksRes, employeesRes] = await Promise.all([
        fetch(TASKS_API, { headers: authHeaders() }),
        fetch(`${EMPLOYEES_API}?page_size=100`, { headers: authHeaders() }),
      ]);

      if (!tasksRes.ok) throw new Error(await getApiError(tasksRes));
      if (!employeesRes.ok) throw new Error(await getApiError(employeesRes));

      setTasks(parseList<Task>(await tasksRes.json()));
      setEmployees(parseList<Employee>(await employeesRes.json()).filter((employee) => employee.status === "ACTIVE"));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load tasks.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const metrics = useMemo(() => {
    return {
      total: tasks.length,
      active: tasks.filter((task) => ["PENDING", "TODO", "IN_PROGRESS", "ON_HOLD"].includes(task.status)).length,
      overdue: tasks.filter((task) => task.is_overdue).length,
      completed: tasks.filter((task) => ["COMPLETED", "CLOSED"].includes(task.status)).length,
    };
  }, [tasks]);

  const departmentOptions = useMemo(() => {
    return Array.from(
      new Set(employees.map((employee) => employee.department).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
  }, [employees]);

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesSearch =
        !query ||
        task.title.toLowerCase().includes(query) ||
        task.assignee_name.toLowerCase().includes(query) ||
        task.assignee_department.toLowerCase().includes(query) ||
        task.department.toLowerCase().includes(query) ||
        task.project_category.toLowerCase().includes(query) ||
        task.assignee_id.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "ALL" || task.status === statusFilter;
      const matchesPriority = priorityFilter === "ALL" || task.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tasks, searchQuery, statusFilter, priorityFilter]);

  const openCreateModal = () => {
    setEditingTask(null);
    setForm({
      ...emptyForm,
      assignee: employees[0]?.id || "",
      department: employees[0]?.department || "",
    });
    setShowModal(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description || "",
      assignee: task.assignee_uuid,
      priority: task.priority,
      status: task.status,
      due_date: task.due_date || "",
      department: task.department || "",
      project_category: task.project_category || "",
      attachment: null,
      admin_notes: task.admin_notes || "",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setShowModal(false);
    setEditingTask(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!form.title.trim() || !form.assignee) {
      setError("Task title and assigned employee are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = new FormData();
      payload.append("title", form.title.trim());
      payload.append("description", form.description.trim());
      payload.append("assignee", form.assignee);
      payload.append("priority", form.priority);
      payload.append("status", form.status);
      payload.append("due_date", form.due_date);
      payload.append("department", form.department.trim());
      payload.append("project_category", form.project_category.trim());
      payload.append("admin_notes", form.admin_notes.trim());
      if (form.attachment) {
        payload.append("attachment", form.attachment);
      }

      const response = await fetch(editingTask ? `${TASKS_API}${editingTask.id}/` : TASKS_API, {
        method: editingTask ? "PATCH" : "POST",
        headers: authHeaders(),
        body: payload,
      });

      if (!response.ok) throw new Error(await getApiError(response));

      setSuccessMsg(editingTask ? "Task updated successfully." : "Task assigned successfully.");
      closeModal();
      await loadData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save task.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (task: Task) => {
    const result = await Swal.fire({
      title: "Delete task?",
      text: `This will remove "${task.title}" from ${task.assignee_name}'s task list.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc3545",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Delete Task",
    });

    if (!result.isConfirmed) return;

    try {
      const response = await fetch(`${TASKS_API}${task.id}/`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!response.ok) throw new Error(await getApiError(response));
      setTasks((previous) => previous.filter((item) => item.id !== task.id));
      Swal.fire("Deleted", "Task removed successfully.", "success");
    } catch (deleteError) {
      Swal.fire("Delete Failed", deleteError instanceof Error ? deleteError.message : "Unable to delete task.", "error");
    }
  };

  return (
    <div className="container-fluid px-0 py-4" style={{ minHeight: "85vh" }}>
      <div className="mb-4 d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
        <div>
          <h2 className="fw-bold mb-1">Tasks</h2>
          <p className="text-secondary mb-0">Assign work, monitor progress, and keep employee task ownership clear.</p>
        </div>
        <Button variant="primary" onClick={openCreateModal} className="d-inline-flex align-items-center gap-2 px-4">
          <IconPlus size={18} /> Assign Task
        </Button>
      </div>

      <Row className="g-3 mb-4">
        <Col xs={12} md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="d-flex align-items-center gap-3">
              <span className="task-stat-icon bg-primary-subtle text-primary"><IconCalendarDue size={22} /></span>
              <div><div className="text-secondary small fw-semibold">Total Tasks</div><div className="fs-3 fw-bold">{metrics.total}</div></div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="d-flex align-items-center gap-3">
              <span className="task-stat-icon bg-info-subtle text-info"><IconClock size={22} /></span>
              <div><div className="text-secondary small fw-semibold">Active Work</div><div className="fs-3 fw-bold">{metrics.active}</div></div>
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
            <Col xs={12} lg={5}>
              <InputGroup>
                <InputGroup.Text className="bg-white"><IconSearch size={18} className="text-secondary" /></InputGroup.Text>
                <Form.Control
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search task, employee, department, or employee ID"
                />
              </InputGroup>
            </Col>
            <Col xs={12} md={6} lg={3}>
              <Form.Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as TaskStatus | "ALL")}>
                {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </Form.Select>
            </Col>
            <Col xs={12} md={6} lg={3}>
              <Form.Select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as TaskPriority | "ALL")}>
                {priorityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
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
              <p className="text-secondary small mb-0">Loading tasks...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-5 px-3">
              <IconInfoCircle size={40} className="text-muted mb-2" />
              <h5 className="fw-semibold">No tasks found</h5>
              <p className="text-secondary mb-0">Create a task or adjust filters to see assigned work.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="align-middle mb-0 admin-tasks-table">
                <thead className="table-light">
                  <tr className="small text-secondary text-uppercase">
                    <th className="px-4 py-3">SR. NO.</th>
                    <th className="px-4 py-3">Task</th>
                    <th className="py-3">Assigned To</th>
                    <th className="py-3">Due Date</th>
                    <th className="py-3">Priority</th>
                    <th className="py-3">Status</th>
                    <th className="px-4 py-3 text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((task, index) => (
                    <tr
                      key={task.id}
                      className="task-click-row"
                      onClick={() => setDetailTask(task)}
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.target !== event.currentTarget) return;
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setDetailTask(task);
                        }
                      }}
                      aria-label={`View details for ${task.title}`}
                    >
                      <td className="px-4 py-3 fw-bold text-secondary" data-label="SR. NO.">{index + 1}</td>
                      <td className="px-4 py-3 admin-task-title-cell" data-label="Task">
                        <div className="fw-bold text-dark">{task.title}</div>
                        <div className="text-secondary small text-truncate" style={{ maxWidth: 420 }}>
                          {task.description || "No description"}
                        </div>
                      </td>
                      <td className="py-3" data-label="Assigned To">
                        <div className="d-flex align-items-center gap-2">
                          <Avatar
                            type="image"
                            src={task.assignee_avatar_url || getAssetPath("/images/avatar/avatar-fallback.jpg")}
                            size="md"
                            className="rounded-circle border"
                          />
                          <div>
                            <div className="fw-semibold small">{task.assignee_name}</div>
                            <div className="text-secondary small">{task.assignee_designation} - {task.assignee_department}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 small fw-medium" data-label="Due Date">{formatDate(task.due_date)}</td>
                      <td className="py-3" data-label="Priority">{getPriorityBadge(task.priority, task.priority_label)}</td>
                      <td className="py-3" data-label="Status">{getStatusBadge(task.status, task.status_label, task.is_overdue)}</td>
                      <td className="px-4 py-3 text-end" data-label="Action">
                        <div className="d-flex justify-content-end gap-2">
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              openEditModal(task);
                            }}
                            aria-label={`Edit ${task.title}`}
                          >
                            <IconEdit size={16} />
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDelete(task);
                            }}
                            aria-label={`Delete ${task.title}`}
                          >
                            <IconTrash size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      <Modal show={Boolean(detailTask)} onHide={() => setDetailTask(null)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Task Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {detailTask && (
            <>
              <div className="task-detail-hero mb-4">
                <div>
                  <h5 className="fw-bold mb-1">{detailTask.title}</h5>
                  <p className="text-secondary mb-0">{detailTask.description || "No description provided."}</p>
                </div>
                <div className="d-flex flex-wrap gap-2">
                  {getPriorityBadge(detailTask.priority, detailTask.priority_label)}
                  {getStatusBadge(detailTask.status, detailTask.status_label, false)}
                  {detailTask.is_overdue && getStatusBadge(detailTask.status, detailTask.status_label, true)}
                </div>
              </div>

              <div className="task-detail-grid mb-4">
                <div className="task-detail-field">
                  <span>Assigned To</span>
                  <div className="d-flex align-items-center gap-2 mt-1">
                    <Avatar
                      type="image"
                      src={detailTask.assignee_avatar_url || getAssetPath("/images/avatar/avatar-fallback.jpg")}
                      size="md"
                      className="rounded-circle border"
                    />
                    <div>
                      <strong>{detailTask.assignee_name}</strong>
                      <div className="text-secondary small">{detailTask.assignee_id || "No employee ID"} - {detailTask.assignee_email || "No email"}</div>
                    </div>
                  </div>
                </div>
                <div className="task-detail-field">
                  <span>Designation</span>
                  <strong>{detailTask.assignee_designation || "Not assigned"}</strong>
                  <div className="text-secondary small">{detailTask.assignee_department || "No employee department"}</div>
                </div>
                <div className="task-detail-field">
                  <span>Department</span>
                  <strong>{detailTask.department || detailTask.assignee_department || "No department"}</strong>
                </div>
                <div className="task-detail-field">
                  <span>Project / Category</span>
                  <strong>{detailTask.project_category || "No project/category"}</strong>
                </div>
                <div className="task-detail-field">
                  <span>Due Date</span>
                  <strong>{formatDate(detailTask.due_date)}</strong>
                </div>
                <div className="task-detail-field">
                  <span>Assigned By</span>
                  <strong>{detailTask.assigned_by_name || "Admin"}</strong>
                </div>
                <div className="task-detail-field">
                  <span>Created</span>
                  <strong>{formatDate(detailTask.created_at)}</strong>
                </div>
                <div className="task-detail-field">
                  <span>Last Updated</span>
                  <strong>{formatDate(detailTask.updated_at)}</strong>
                </div>
                <div className="task-detail-field">
                  <span>Completed</span>
                  <strong>{detailTask.completed_at ? formatDate(detailTask.completed_at) : "Not completed"}</strong>
                </div>
              </div>

              <Row className="g-3">
                <Col xs={12} md={6}>
                  <div className="task-detail-section">
                    <span>Admin Notes</span>
                    <p>{detailTask.admin_notes || "No admin notes."}</p>
                  </div>
                </Col>
                <Col xs={12} md={6}>
                  <div className="task-detail-section">
                    <span>Employee Notes</span>
                    <p>{detailTask.employee_notes || "No employee notes."}</p>
                  </div>
                </Col>
                <Col xs={12}>
                  <div className="task-detail-section">
                    <span>Attachments</span>
                    <div className="d-flex flex-column gap-2 mt-2">
                      {detailTask.attachment_url && (
                        <a href={detailTask.attachment_url} target="_blank" rel="noopener noreferrer" className="d-inline-flex align-items-center gap-2 text-decoration-none">
                          <IconPaperclip size={16} /> Task: {detailTask.attachment_name || "Attachment"}
                        </a>
                      )}
                      {detailTask.employee_attachment_url && (
                        <a href={detailTask.employee_attachment_url} target="_blank" rel="noopener noreferrer" className="d-inline-flex align-items-center gap-2 text-decoration-none">
                          <IconPaperclip size={16} /> Employee: {detailTask.employee_attachment_name || "Attachment"}
                        </a>
                      )}
                      {!detailTask.attachment_url && !detailTask.employee_attachment_url && (
                        <span className="text-secondary">No attachments uploaded.</span>
                      )}
                    </div>
                  </div>
                </Col>
              </Row>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setDetailTask(null)}>Close</Button>
          {detailTask && (
            <Button
              variant="primary"
              onClick={() => {
                const taskToEdit = detailTask;
                setDetailTask(null);
                openEditModal(taskToEdit);
              }}
            >
              Edit Task
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      <Modal show={showModal} onHide={closeModal} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editingTask ? "Edit Task" : "Assign Task"}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row className="g-3">
              <Col xs={12}>
                <Form.Group controlId="taskTitle">
                  <Form.Label className="fw-semibold">Task Title *</Form.Label>
                  <Form.Control
                    value={form.title}
                    onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                    placeholder="Example: Prepare monthly attendance exception report"
                    maxLength={180}
                    required
                  />
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Form.Group controlId="taskDescription">
                  <Form.Label className="fw-semibold">Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    value={form.description}
                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Add acceptance criteria, context, or required output."
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group controlId="taskAssignee">
                  <Form.Label className="fw-semibold">Assign To *</Form.Label>
                  <Form.Select
                    value={form.assignee}
                    onChange={(event) => {
                      const assignee = employees.find((employee) => employee.id === event.target.value);
                      setForm((current) => ({
                        ...current,
                        assignee: event.target.value,
                        department: assignee?.department || current.department,
                      }));
                    }}
                    required
                  >
                    <option value="">Select employee</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.full_name} ({employee.employee_id}) - {employee.department}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group controlId="taskDueDate">
                  <Form.Label className="fw-semibold">Due Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={form.due_date}
                    onChange={(event) => setForm((current) => ({ ...current, due_date: event.target.value }))}
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group controlId="taskDepartment">
                  <Form.Label className="fw-semibold">Department</Form.Label>
                  <Form.Select
                    value={form.department}
                    onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))}
                  >
                    <option value="">No department</option>
                    {departmentOptions.map((department) => (
                      <option key={department} value={department}>
                        {department}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group controlId="taskProjectCategory">
                  <Form.Label className="fw-semibold">Project / Category</Form.Label>
                  <Form.Control
                    value={form.project_category}
                    onChange={(event) => setForm((current) => ({ ...current, project_category: event.target.value }))}
                    placeholder="Optional project or category"
                    maxLength={120}
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group controlId="taskPriority">
                  <Form.Label className="fw-semibold">Priority</Form.Label>
                  <Form.Select value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as TaskPriority }))}>
                    {priorityOptions.filter((option) => option.value !== "ALL").map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group controlId="taskStatus">
                  <Form.Label className="fw-semibold">Status</Form.Label>
                  <Form.Select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as TaskStatus }))}>
                    {statusOptions.filter((option) => option.value !== "ALL").map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Form.Group controlId="taskAttachment">
                  <Form.Label className="fw-semibold">Attachment</Form.Label>
                  <Form.Control
                    type="file"
                    onChange={(event) => {
                      const input = event.currentTarget as HTMLInputElement;
                      setForm((current) => ({ ...current, attachment: input.files?.[0] || null }));
                    }}
                  />
                  <Form.Text className="text-secondary">
                    Optional file or document. Maximum size: 10 MB.
                  </Form.Text>
                  {editingTask?.attachment_url && (
                    <div className="mt-2 small">
                      Current:{" "}
                      <a href={editingTask.attachment_url} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
                        {editingTask.attachment_name || "Attachment"}
                      </a>
                    </div>
                  )}
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Form.Group controlId="taskAdminNotes">
                  <Form.Label className="fw-semibold">Internal Notes</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={form.admin_notes}
                    onChange={(event) => setForm((current) => ({ ...current, admin_notes: event.target.value }))}
                    placeholder="Private admin/HR context for this task."
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={closeModal} disabled={isSubmitting}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? <><Spinner size="sm" animation="border" className="me-2" />Saving...</> : editingTask ? "Save Changes" : "Assign Task"}
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

        .task-status-badge {
          border: 1px solid transparent;
          border-radius: 999px;
          font-weight: 700;
          padding: 5px 9px;
        }

        .task-status-pending {
          background: #e0f2fe !important;
          border-color: #bae6fd !important;
          color: #0369a1 !important;
        }

        .task-status-todo {
          background: #f1f5f9 !important;
          border-color: #cbd5e1 !important;
          color: #334155 !important;
        }

        .task-status-in-progress {
          background: #dbeafe !important;
          border-color: #bfdbfe !important;
          color: #1d4ed8 !important;
        }

        .task-status-on-hold {
          background: #fef3c7 !important;
          border-color: #fde68a !important;
          color: #b45309 !important;
        }

        .task-status-completed {
          background: #dcfce7 !important;
          border-color: #bbf7d0 !important;
          color: #15803d !important;
        }

        .task-status-closed {
          background: #ede9fe !important;
          border-color: #ddd6fe !important;
          color: #6d28d9 !important;
        }

        .task-status-cancelled {
          background: #fee2e2 !important;
          border-color: #fecaca !important;
          color: #b91c1c !important;
        }

        .task-status-overdue {
          background: #fff1f2 !important;
          border-color: #fecdd3 !important;
          color: #be123c !important;
        }

        .admin-tasks-table {
          table-layout: fixed;
        }

        .task-click-row {
          cursor: pointer;
        }

        .task-click-row:hover {
          background: #f8fafc;
        }

        .task-click-row:focus {
          outline: 2px solid #93c5fd;
          outline-offset: -2px;
        }

        .admin-task-title-cell {
          width: 28%;
          min-width: 240px;
        }

        .admin-tasks-table th:nth-child(2),
        .admin-tasks-table td:nth-child(2) {
          width: 28%;
        }

        .admin-tasks-table th:nth-child(3),
        .admin-tasks-table td:nth-child(3) {
          width: 24%;
        }

        .admin-tasks-table th:nth-child(4),
        .admin-tasks-table td:nth-child(4),
        .admin-tasks-table th:nth-child(5),
        .admin-tasks-table td:nth-child(5),
        .admin-tasks-table th:nth-child(6),
        .admin-tasks-table td:nth-child(6) {
          width: 10%;
        }

        .admin-tasks-table th:nth-child(7),
        .admin-tasks-table td:nth-child(7) {
          width: 10%;
        }

        .admin-tasks-table th:nth-child(1),
        .admin-tasks-table td:nth-child(1) {
          width: 8%;
        }

        .task-detail-hero {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding: 16px;
          border: 1px solid #e5eaf0;
          border-radius: 8px;
          background: #f8fafc;
        }

        .task-detail-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .task-detail-field,
        .task-detail-section {
          border: 1px solid #e5eaf0;
          border-radius: 8px;
          padding: 12px;
          background: #fff;
          min-width: 0;
        }

        .task-detail-field span,
        .task-detail-section span {
          display: block;
          color: #64748b;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .task-detail-field strong {
          display: block;
          color: #0f172a;
          overflow-wrap: anywhere;
        }

        .task-detail-section p {
          margin: 0;
          color: #334155;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        @media (max-width: 1199.98px) {
          .admin-tasks-table {
            table-layout: auto;
          }

          .task-detail-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 991.98px) {
          .admin-tasks-table thead {
            display: none;
          }

          .admin-tasks-table,
          .admin-tasks-table tbody,
          .admin-tasks-table tr,
          .admin-tasks-table td {
            display: block;
            width: 100% !important;
          }

          .admin-tasks-table tbody {
            padding: 12px;
            background: #f8fafc;
          }

          .admin-tasks-table tr {
            margin: 12px 0;
            border: 1px solid #e5eaf0;
            border-radius: 8px;
            background: #fff;
            box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06);
            overflow: hidden;
          }

          .task-click-row:hover {
            background: #fff;
          }

          .admin-tasks-table td {
            display: grid;
            grid-template-columns: minmax(112px, 34%) 1fr;
            gap: 12px;
            align-items: start;
            border: 0;
            border-bottom: 1px solid #eef2f6;
            padding: 12px 16px !important;
            white-space: normal;
            text-align: left !important;
          }

          .admin-tasks-table td:last-child {
            border-bottom: 0;
          }

          .admin-tasks-table td::before {
            content: attr(data-label);
            font-size: 0.72rem;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0;
          }

          .admin-tasks-table .text-truncate {
            max-width: none !important;
            white-space: normal !important;
            overflow: visible !important;
            text-overflow: clip !important;
          }

          .admin-tasks-table td[data-label="Action"] > div {
            justify-content: stretch !important;
          }

          .admin-tasks-table td[data-label="Action"] .btn {
            flex: 1 1 0;
            justify-content: center;
          }
        }

        @media (max-width: 575.98px) {
          .task-detail-hero {
            flex-direction: column;
          }

          .task-detail-grid {
            grid-template-columns: 1fr;
          }

          .admin-tasks-table tbody {
            padding: 8px;
          }

          .admin-tasks-table td {
            grid-template-columns: 1fr;
            gap: 6px;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminTasksClient;
