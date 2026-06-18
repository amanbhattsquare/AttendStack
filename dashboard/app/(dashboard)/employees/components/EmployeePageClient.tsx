"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import {
  IconDotsVertical,
  IconEdit,
  IconEye,
  IconFilter,
  IconKey,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconTrash,
  IconUserCheck,
} from "@tabler/icons-react";
import { Alert, Button, Dropdown, Form, Modal } from "react-bootstrap";
import Link from "next/link";
import EmployeeFormWizard, { EmployeeFormData } from "./EmployeeFormWizard";

type EmployeeStatus = "ACTIVE" | "INACTIVE" | "ON_LEAVE" | "TERMINATED";

type Employee = {
  id: string;
  employee_id: string;
  full_name: string;
  email: string;
  profile_photo_url: string | null;
  department: string;
  designation: string;
  joining_date: string;
  account_exists: boolean;
  status: EmployeeStatus;
  status_label: string;
};

type EmployeeListResponse = Employee[] | {
  results: Employee[];
};

type PasswordActionResponse = {
  detail: string;
  employee_id: string;
  email: string;
  temporary_password: string;
};

type PasswordAction = "create-password" | "reset-password";

const API_URL = `${process.env.NEXT_PUBLIC_API_ENDPOINT}/api/v1/employees/`;

const statusBadgeClass: Record<Employee["status"], string> = {
  ACTIVE: "bg-success-subtle text-success",
  INACTIVE: "bg-secondary-subtle text-secondary",
  ON_LEAVE: "bg-warning-subtle text-warning",
  TERMINATED: "bg-danger-subtle text-danger",
};

const employeeStatusOptions: Array<{
  value: EmployeeStatus;
  label: string;
}> = [
  {
    value: "ACTIVE",
    label: "Active",
  },
  {
    value: "ON_LEAVE",
    label: "On Leave",
  },
  {
    value: "INACTIVE",
    label: "Inactive",
  },
  {
    value: "TERMINATED",
    label: "Terminated",
  },
];

const statusLabelByValue = employeeStatusOptions.reduce((labels, option) => {
  labels[option.value] = option.label;
  return labels;
}, {} as Record<EmployeeStatus, string>);

const formatDate = (value: string) => {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

const toCamelCase = (s: string) => {
  return s.replace(/([-_][a-z])/ig, ($1) => {
    return $1.toUpperCase()
      .replace('-', '')
      .replace('_', '');
  });
};

const generateStrongPassword = (length = 14) => {
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const symbols = "!@#$%&*?";
  const all = lower + upper + digits + symbols;
  const required = [
    lower[Math.floor(Math.random() * lower.length)],
    upper[Math.floor(Math.random() * upper.length)],
    digits[Math.floor(Math.random() * digits.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ];
  const remaining = Array.from({ length: length - required.length }, () => all[Math.floor(Math.random() * all.length)]);
  return [...required, ...remaining].sort(() => Math.random() - 0.5).join("");
};

const EmployeePageClient = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [actionLoadingKey, setActionLoadingKey] = useState<string | null>(null);
  const [passwordEmployee, setPasswordEmployee] = useState<Employee | null>(null);
  const [passwordAction, setPasswordAction] = useState<PasswordAction>("create-password");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [statusEmployee, setStatusEmployee] = useState<Employee | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<EmployeeStatus>("ACTIVE");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Partial<EmployeeFormData> | null>(null);
  const [isEditModalLoading, setIsEditModalLoading] = useState(false);
  const router = useRouter();

  const loadEmployees = async () => {
    setIsLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(API_URL, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!response.ok) {
        throw new Error("Unable to load employees from the backend.");
      }

      const data = (await response.json()) as EmployeeListResponse;
      setEmployees(Array.isArray(data) ? data : data.results);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load employees.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const handleRowClick = (employeeUuid: string) => {
    router.push(`/employees/${employeeUuid}`);
  };

  const handleEdit = async (employee: Employee) => {
    setIsEditModalOpen(true);
    setIsEditModalLoading(true);
    setEditingEmployee(null);
    try {
      const details = await fetchEmployeeDetails(employee.id);
      setEditingEmployee({ ...details, id: employee.id });
    } catch (error) {
      Swal.fire("Error", "Could not load employee details.", "error");
      setIsEditModalOpen(false);
    } finally {
      setIsEditModalLoading(false);
    }
  };

  const fetchEmployeeDetails = async (employeeId: string): Promise<Partial<EmployeeFormData>> => {
    const token = localStorage.getItem("authToken");
    const response = await fetch(`${API_URL}${employeeId}/`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!response.ok) {
      throw new Error("Failed to fetch employee details.");
    }
    const data = await response.json();
    const camelCaseData: Partial<EmployeeFormData> = {};
    for (const key in data) {
      if (key === "profile_photo") {
        camelCaseData.profilePhoto = null;
        continue;
      }
      if (key === "profile_photo_url") {
        camelCaseData.profilePhotoUrl = data[key];
        continue;
      }
      if (key === "aadhaar_document") {
        camelCaseData.aadhaarDocument = null;
        continue;
      }
      if (key === "aadhaar_document_url") {
        camelCaseData.aadhaarDocumentUrl = data[key];
        continue;
      }
      const camelKey = toCamelCase(key);
      (camelCaseData as any)[camelKey] = data[key];
    }
    return camelCaseData;
  };

  const handleDelete = async (employeeId: string) => {
    const result = await Swal.fire({
      title: "Delete Employee?",
      text: "This permanently deletes the employee record and their linked login account. They will no longer be able to sign in.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc3545",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Yes, Delete It",
      cancelButtonText: "Cancel",
    });
    if (!result.isConfirmed) return;

    try {
      setError("");
      setSuccessMessage("");
      setActionLoadingKey(`${employeeId}:delete`);
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_URL}${employeeId}/`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!response.ok) {
        throw new Error("Unable to delete employee.");
      }

      setEmployees((prev) => prev.filter((employee) => employee.id !== employeeId));
      Swal.fire({
        title: "Deleted!",
        text: "Employee and linked login account deleted successfully.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (deleteError) {
      Swal.fire({
        title: "Delete Failed",
        text: deleteError instanceof Error ? deleteError.message : "Unable to delete employee.",
        icon: "error",
        confirmButtonColor: "#dc3545",
      });
    } finally {
      setActionLoadingKey(null);
    }
  };

  const parseApiError = async (response: Response) => {
    const errorBody = await response.json().catch(() => null);
    if (!errorBody) return "Request failed. Please try again.";
    if (typeof errorBody.detail === "string") return errorBody.detail;
    return Object.values(errorBody).flat().join(" ");
  };

  const openPasswordModal = (employee: Employee, action: PasswordAction) => {
    setPasswordEmployee(employee);
    setPasswordAction(action);
    setNewPassword("");
    setConfirmPassword("");
    setShowPassword(false);
  };

  const openStatusModal = (employee: Employee) => {
    setStatusEmployee(employee);
    setSelectedStatus(employee.status);
  };

  const closeStatusModal = () => {
    if (actionLoadingKey?.endsWith(":status")) return;
    setStatusEmployee(null);
    setSelectedStatus("ACTIVE");
  };

  const closePasswordModal = () => {
    setPasswordEmployee(null);
    setNewPassword("");
    setConfirmPassword("");
    setShowPassword(false);
  };

  const handleAutoGeneratePassword = () => {
    const generatedPassword = generateStrongPassword();
    setNewPassword(generatedPassword);
    setConfirmPassword(generatedPassword);
    setShowPassword(true);
  };

  const handlePasswordAction = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!passwordEmployee) return;

    const trimmedPassword = newPassword.trim();
    const trimmedConfirmPassword = confirmPassword.trim();

    if ((trimmedPassword || trimmedConfirmPassword) && trimmedPassword !== trimmedConfirmPassword) {
      Swal.fire({
        title: "Password Mismatch",
        text: "Password and confirm password must match.",
        icon: "warning",
        confirmButtonColor: "#ffc107",
      });
      return;
    }

    if (trimmedPassword && trimmedPassword.length < 8) {
      Swal.fire({
        title: "Weak Password",
        text: "Password must be at least 8 characters long.",
        icon: "warning",
        confirmButtonColor: "#ffc107",
      });
      return;
    }

    try {
      setError("");
      setSuccessMessage("");
      setActionLoadingKey(`${passwordEmployee.id}:${passwordAction}`);

      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_URL}${passwordEmployee.id}/${passwordAction}/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(trimmedPassword ? { password: trimmedPassword } : {}),
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      const data = (await response.json()) as PasswordActionResponse;
      closePasswordModal();

      const successHtml = data.temporary_password
        ? `${data.detail}<br/><br/><div class="text-start"><strong>New Password:</strong><div class="input-group mt-1"><input type="text" class="form-control font-monospace" value="${data.temporary_password}" readonly /><button class="btn btn-outline-secondary" onclick="navigator.clipboard.writeText('${data.temporary_password}').then(() => { this.innerText = 'Copied'; });">Copy</button></div><small class="d-block mt-2 text-warning">Please copy this password and share it securely. It will not be shown again.</small></div>`
        : data.detail;

      Swal.fire({
        title: "Success",
        html: successHtml,
        icon: "success",
        confirmButtonColor: "#198754",
      });

      setEmployees((prev) =>
        prev.map((item) =>
          item.id === passwordEmployee.id ? { ...item, account_exists: true } : item
        )
      );
    } catch (passwordError) {
      Swal.fire({
        title: "Action Failed",
        text: passwordError instanceof Error ? passwordError.message : "Unable to complete password action.",
        icon: "error",
        confirmButtonColor: "#dc3545",
      });
    } finally {
      setActionLoadingKey(null);
    }
  };

  const handleStatusAction = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!statusEmployee || selectedStatus === statusEmployee.status) return;

    try {
      setError("");
      setSuccessMessage("");
      setActionLoadingKey(`${statusEmployee.id}:status`);

      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_URL}${statusEmployee.id}/status/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: selectedStatus }),
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      const updatedEmployee = (await response.json()) as Employee;
      setEmployees((prev) =>
        prev.map((item) => (item.id === updatedEmployee.id ? { ...item, ...updatedEmployee } : item))
      );
      setStatusEmployee(null);

      Swal.fire({
        title: "Status Updated",
        text: `${updatedEmployee.full_name} is now ${updatedEmployee.status_label}.`,
        icon: "success",
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (statusError) {
      Swal.fire({
        title: "Status Update Failed",
        text: statusError instanceof Error ? statusError.message : "Unable to update employee status.",
        icon: "error",
        confirmButtonColor: "#dc3545",
      });
    } finally {
      setActionLoadingKey(null);
    }
  };



  const handleEditSaved = async () => {
    await loadEmployees();
    setIsEditModalOpen(false);
    setEditingEmployee(null);
    Swal.fire("Success", "Employee updated successfully!", "success");
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        !query ||
        employee.full_name.toLowerCase().includes(query) ||
        employee.email.toLowerCase().includes(query) ||
        employee.employee_id.toLowerCase().includes(query);
      const matchesDepartment = !departmentFilter || employee.department === departmentFilter;
      const matchesStatus = !statusFilter || employee.status === statusFilter;

      return matchesSearch && matchesDepartment && matchesStatus;
    });
  }, [employees, searchQuery, departmentFilter, statusFilter]);

  const uniqueDepartments = [...new Set(employees.map((employee) => employee.department).filter(Boolean))];
  return (
    <Fragment>
      <div className="mb-6 d-flex align-items-center justify-content-between">
        <div>
          <h2 className="mb-0 fw-bold">Employees</h2>
          <p className="text-secondary mb-0">Manage your workforce, view profiles, and update details.</p>
        </div>
        <Link href="/employees/add" className="btn btn-primary d-flex align-items-center gap-2">
          <IconPlus size={18} /> Add Employee
        </Link>
      </div>

      <div className="card border-0 shadow-sm mb-6">
        <div className="card-header bg-white border-bottom-0 pt-4 pb-0">
          <div className="row g-3 align-items-center">
            <div className="col-md-4">
              <div className="input-group">
                <span className="input-group-text bg-transparent border-end-0">
                  <IconSearch size={18} className="text-muted" />
                </span>
                <input
                  type="text"
                  className="form-control border-start-0 ps-0"
                  placeholder="Search employees..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
            </div>
            <div className="col-md-8 d-flex justify-content-md-end">
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-filter" className="d-flex align-items-center gap-2">
                  <IconFilter size={18} /> Filter
                </Dropdown.Toggle>

                <Dropdown.Menu>
                  <Dropdown.Header>Department</Dropdown.Header>
                  <Dropdown.Item onClick={() => setDepartmentFilter("")}>All Departments</Dropdown.Item>
                  {uniqueDepartments.map((department) => (
                    <Dropdown.Item key={department} onClick={() => setDepartmentFilter(department)}>{department}</Dropdown.Item>
                  ))}
                  <Dropdown.Divider />
                  <Dropdown.Header>Status</Dropdown.Header>
                  <Dropdown.Item onClick={() => setStatusFilter("")}>All Statuses</Dropdown.Item>
                  <Dropdown.Item onClick={() => setStatusFilter("ACTIVE")}>Active</Dropdown.Item>
                  <Dropdown.Item onClick={() => setStatusFilter("INACTIVE")}>Inactive</Dropdown.Item>
                  <Dropdown.Item onClick={() => setStatusFilter("ON_LEAVE")}>On Leave</Dropdown.Item>
                  <Dropdown.Item onClick={() => setStatusFilter("TERMINATED")}>Terminated</Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </div>
          </div>
        </div>
        <div className="card-body">
          {error && <div className="alert alert-danger">{error}</div>}
          {successMessage && <div className="alert alert-success">{successMessage}</div>}

          <div className="table-responsive employee-table-responsive">
            <table className="table align-middle table-hover text-nowrap">
              <thead className="table-light">
                <tr>
                  <th>Employee Name</th>
                  <th>ID</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Status</th>
                  <th className="text-center employee-action-column">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={7} className="text-center py-5 text-secondary">Loading employees...</td>
                  </tr>
                )}

                {!isLoading && filteredEmployees.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-5 text-secondary">No employees found.</td>
                  </tr>
                )}

                {!isLoading && filteredEmployees.map((employee) => (
                  <tr key={employee.id} style={{ cursor: "pointer" }} onClick={() => handleRowClick(employee.id)}>
                    <td>
                      <div className="d-flex align-items-center">
                        <img
                          src={employee.profile_photo_url || "/images/avatar/avatar-fallback.jpg"}
                          alt={employee.full_name}
                          className="avatar avatar-sm rounded-circle me-3"
                        />
                        <div>
                          <h6 className="mb-0">{employee.full_name}</h6>
                          <small className="text-muted">{employee.email}</small>
                        </div>
                      </div>
                    </td>
                    <td>{employee.employee_id}</td>
                    <td>{employee.department}</td>
                    <td>{employee.designation}</td>
                    <td>
                      <span className={`badge ${statusBadgeClass[employee.status] || "bg-secondary-subtle text-secondary"}`}>
                        {employee.status_label}
                      </span>
                    </td>
                    <td className="text-center employee-action-column">
                      <Dropdown
                        align="end"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Dropdown.Toggle
                          variant="light"
                          size="sm"
                          className="btn-icon employee-action-toggle"
                          aria-label={`Actions for ${employee.full_name}`}
                        >
                          <IconDotsVertical size={18} />
                        </Dropdown.Toggle>
                        <Dropdown.Menu
                          className="employee-action-menu shadow border-0"
                          popperConfig={{ strategy: "fixed" }}
                        >
                          <Dropdown.Item onClick={() => handleRowClick(employee.id)} className="d-flex align-items-center gap-2">
                            <IconEye size={16} /> View Profile
                          </Dropdown.Item>
                          <Dropdown.Item onClick={() => handleEdit(employee)} className="d-flex align-items-center gap-2">
                            <IconEdit size={16} /> Edit Employee
                          </Dropdown.Item>
                          <Dropdown.Item onClick={() => openStatusModal(employee)} className="d-flex align-items-center gap-2">
                            <IconUserCheck size={16} /> Change Status
                          </Dropdown.Item>
                          <Dropdown.Divider />
                          <Dropdown.Item
                            disabled={employee.account_exists || actionLoadingKey === `${employee.id}:create-password`}
                            onClick={() => openPasswordModal(employee, "create-password")}
                            className="d-flex align-items-center gap-2"
                          >
                            <IconKey size={16} /> {actionLoadingKey === `${employee.id}:create-password` ? "Creating..." : "Create Password"}
                          </Dropdown.Item>
                          <Dropdown.Item
                            disabled={!employee.account_exists || actionLoadingKey === `${employee.id}:reset-password`}
                            onClick={() => openPasswordModal(employee, "reset-password")}
                            className="d-flex align-items-center gap-2"
                          >
                            <IconRefresh size={16} /> {actionLoadingKey === `${employee.id}:reset-password` ? "Resetting..." : "Reset Password"}
                          </Dropdown.Item>
                          <Dropdown.Divider />
                          <Dropdown.Item
                            disabled={actionLoadingKey === `${employee.id}:delete`}
                            onClick={() => handleDelete(employee.id)}
                            className="d-flex align-items-center gap-2 text-danger"
                          >
                            <IconTrash size={16} /> {actionLoadingKey === `${employee.id}:delete` ? "Deleting..." : "Delete"}
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal show={Boolean(passwordEmployee)} onHide={closePasswordModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>{passwordAction === "create-password" ? "Create Employee Password" : "Reset Employee Password"}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handlePasswordAction}>
          <Modal.Body>
            <Alert variant="info" className="mb-4">
              Enter your own password or use auto-generate. If both fields are left blank, the system will generate a secure password automatically.
            </Alert>
            <div className="mb-4">
              <div className="text-secondary small">Employee</div>
              <div className="fw-semibold">{passwordEmployee?.full_name}</div>
              <div className="text-muted small">{passwordEmployee?.email}</div>
            </div>
            <Form.Group className="mb-3" controlId="employeePassword">
              <div className="d-flex align-items-center justify-content-between gap-3 mb-2">
                <Form.Label className="mb-0 fw-semibold">Password</Form.Label>
                <Button
                  type="button"
                  variant="outline-primary"
                  size="sm"
                  onClick={handleAutoGeneratePassword}
                >
                  Auto Generate
                </Button>
              </div>
              <Form.Control
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Enter custom password or auto-generate"
                autoComplete="new-password"
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="employeeConfirmPassword">
              <Form.Label className="fw-semibold">Confirm Password</Form.Label>
              <Form.Control
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Re-enter password"
                autoComplete="new-password"
              />
            </Form.Group>
            <Form.Check
              type="checkbox"
              id="showEmployeePassword"
              label="Show password"
              checked={showPassword}
              onChange={(event) => setShowPassword(event.target.checked)}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={closePasswordModal} disabled={Boolean(actionLoadingKey)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={Boolean(actionLoadingKey)}>
              {actionLoadingKey ? "Saving..." : passwordAction === "create-password" ? "Create Password" : "Reset Password"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={Boolean(statusEmployee)} onHide={closeStatusModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Change Employee Status</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleStatusAction}>
          <Modal.Body>
            <div className="employee-status-summary mb-4">
              <div className="d-flex align-items-center gap-3">
                <img
                  src={statusEmployee?.profile_photo_url || "/images/avatar/avatar-fallback.jpg"}
                  alt={statusEmployee?.full_name || "Employee"}
                  className="avatar avatar-sm rounded-circle"
                />
                <div className="min-w-0">
                  <div className="fw-semibold">{statusEmployee?.full_name}</div>
                  <div className="text-muted small">{statusEmployee?.employee_id} - {statusEmployee?.email}</div>
                </div>
              </div>
              {statusEmployee && (
                <span className={`badge ${statusBadgeClass[statusEmployee.status] || "bg-secondary-subtle text-secondary"}`}>
                  Current: {statusEmployee.status_label}
                </span>
              )}
            </div>

            <Form.Group className="mb-4" controlId="employeeStatus">
              <Form.Label className="fw-semibold">New Status</Form.Label>
              <div className="employee-status-options">
                {employeeStatusOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`employee-status-option ${selectedStatus === option.value ? "is-selected" : ""}`}
                  >
                    <Form.Check
                      type="radio"
                      name="employeeStatus"
                      value={option.value}
                      checked={selectedStatus === option.value}
                      onChange={(event) => setSelectedStatus(event.target.value as EmployeeStatus)}
                    />
                    <span>
                      <span className="d-flex align-items-center justify-content-between gap-3">
                        <span className="fw-semibold">{option.label}</span>
                        <span className={`badge ${statusBadgeClass[option.value]}`}>{option.label}</span>
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={closeStatusModal} disabled={actionLoadingKey === `${statusEmployee?.id}:status`}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={!statusEmployee || selectedStatus === statusEmployee.status || actionLoadingKey === `${statusEmployee?.id}:status`}
            >
              {actionLoadingKey === `${statusEmployee?.id}:status`
                ? "Updating..."
                : `Set ${statusLabelByValue[selectedStatus]}`}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>



      <Modal show={isEditModalOpen} onHide={() => setIsEditModalOpen(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit Employee</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {isEditModalLoading ? (
            <div className="text-center">Loading...</div>
          ) : (
            <EmployeeFormWizard
                initialData={editingEmployee || undefined}
                onSave={handleEditSaved}
                mode="edit"
              />
          )}
        </Modal.Body>
      </Modal>

      <style jsx global>{`
        .employee-table-responsive {
          overflow: visible;
        }

        .employee-action-column {
          width: 112px;
          min-width: 112px;
        }

        .employee-action-toggle {
          width: 34px;
          height: 34px;
          padding: 0;
          border: 1px solid #d8e0e7;
          border-radius: 8px;
          background: #fff;
          color: #526273;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
        }

        .employee-action-toggle::after {
          display: none;
        }

        .employee-action-toggle:hover,
        .employee-action-toggle:focus,
        .employee-action-toggle.show {
          background: #f5f8fb;
          border-color: #bac7d5;
          color: #0f172a;
        }

        .employee-action-menu {
          min-width: 210px;
          padding: 8px;
          border-radius: 8px;
          z-index: 1080;
        }

        .employee-action-menu .dropdown-item {
          border-radius: 6px;
          padding: 8px 10px;
          font-size: 14px;
        }

        .employee-action-menu .dropdown-item:active {
          background-color: #e9f7f1;
          color: #0f172a;
        }

        .employee-status-summary {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 14px;
          border: 1px solid #e5eaf0;
          border-radius: 8px;
          background: #f8fafc;
        }

        .employee-status-options {
          display: grid;
          gap: 10px;
        }

        .employee-status-option {
          display: grid;
          grid-template-columns: 22px 1fr;
          gap: 10px;
          padding: 12px;
          border: 1px solid #e5eaf0;
          border-radius: 8px;
          background: #fff;
          cursor: pointer;
          transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
        }

        .employee-status-option:hover {
          border-color: #b7c8da;
          background: #fbfdff;
        }

        .employee-status-option.is-selected {
          border-color: #0d6efd;
          box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.12);
        }

        .employee-status-option .form-check {
          min-height: 0;
          margin: 2px 0 0;
          padding-left: 0;
        }

        .employee-status-option .form-check-input {
          margin-left: 0;
        }

        .min-w-0 {
          min-width: 0;
        }

        @media (max-width: 991.98px) {
          .employee-table-responsive {
            overflow-x: auto;
            padding-bottom: 180px;
          }
        }
      `}</style>
    </Fragment>
  );
};

export default EmployeePageClient;
