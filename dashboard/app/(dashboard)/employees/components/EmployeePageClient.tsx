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
} from "@tabler/icons-react";
import { Alert, Button, Dropdown, Modal } from "react-bootstrap";
import Link from "next/link";
import EmployeeFormWizard, { EmployeeFormData } from "./EmployeeFormWizard";

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
  status: "ACTIVE" | "INACTIVE" | "ON_LEAVE" | "TERMINATED";
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

const API_URL = `${process.env.NEXT_PUBLIC_API_ENDPOINT}/api/v1/employees/`;

const statusBadgeClass: Record<Employee["status"], string> = {
  ACTIVE: "bg-success-subtle text-success",
  INACTIVE: "bg-secondary-subtle text-secondary",
  ON_LEAVE: "bg-warning-subtle text-warning",
  TERMINATED: "bg-danger-subtle text-danger",
};

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

const EmployeePageClient = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [actionLoadingKey, setActionLoadingKey] = useState<string | null>(null);
  const [passwordResult, setPasswordResult] = useState<PasswordActionResponse | null>(null);
  const [copyLabel, setCopyLabel] = useState("Copy");
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
      setEditingEmployee(details);
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
      const camelKey = toCamelCase(key);
      if (camelKey === 'profilePhoto') {
        camelCaseData['profilePhotoUrl'] = data[key];
      } else {
        (camelCaseData as any)[camelKey] = data[key];
      }
    }
    return camelCaseData;
  };

  const handleDelete = async (employeeId: string) => {
    const result = await Swal.fire({
      title: "Delete Employee?",
      text: "Are you sure you want to permanently delete this employee record?",
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
        text: "Employee deleted successfully.",
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

  const handlePasswordAction = async (employee: Employee, action: "create-password" | "reset-password") => {
    const isReset = action === "reset-password";
    if (isReset) {
      const confirmReset = await Swal.fire({
        title: "Confirm Password Reset",
        text: `Are you sure you want to reset the password for ${employee.full_name}?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#6c757d",
        confirmButtonText: "Yes, Reset It",
        cancelButtonText: "Cancel",
      });
      if (!confirmReset.isConfirmed) return;
    }

    try {
      setError("");
      setSuccessMessage("");
      setPasswordResult(null);
      setCopyLabel("Copy");
      setActionLoadingKey(`${employee.id}:${action}`);

      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_URL}${employee.id}/${action}/`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      const data = (await response.json()) as PasswordActionResponse;
      setPasswordResult(data);
      Swal.fire({
        title: "Success",
        text: data.detail,
        icon: "success",
        confirmButtonColor: "#198754",
      });
      setEmployees((prev) =>
        prev.map((item) =>
          item.id === employee.id ? { ...item, account_exists: true } : item
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

  const handleCopyPassword = async () => {
    if (!passwordResult?.temporary_password) return;
    try {
      await navigator.clipboard.writeText(passwordResult.temporary_password);
      setCopyLabel("Copied");
    } catch {
      setCopyLabel("Copy failed");
    }
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
                  <th>Join Date</th>
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
                    <td>{formatDate(employee.joining_date)}</td>
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
                          <Dropdown.Divider />
                          <Dropdown.Item
                            disabled={employee.account_exists || actionLoadingKey === `${employee.id}:create-password`}
                            onClick={() => handlePasswordAction(employee, "create-password")}
                            className="d-flex align-items-center gap-2"
                          >
                            <IconKey size={16} /> {actionLoadingKey === `${employee.id}:create-password` ? "Creating..." : "Create Password"}
                          </Dropdown.Item>
                          <Dropdown.Item
                            disabled={!employee.account_exists || actionLoadingKey === `${employee.id}:reset-password`}
                            onClick={() => handlePasswordAction(employee, "reset-password")}
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

      <Modal show={Boolean(passwordResult)} onHide={() => setPasswordResult(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Temporary Password</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning" className="mb-3">
            Share this temporary password securely. It will not be shown again after this modal is closed.
          </Alert>
          <div className="mb-3">
            <div className="text-secondary small">Employee</div>
            <div className="fw-semibold">{passwordResult?.email}</div>
          </div>
          <label htmlFor="temporaryPassword" className="form-label">Temporary Password</label>
          <div className="input-group">
            <input
              id="temporaryPassword"
              type="text"
              readOnly
              className="form-control font-monospace"
              value={passwordResult?.temporary_password || ""}
            />
            <Button variant="outline-secondary" onClick={handleCopyPassword}>
              {copyLabel}
            </Button>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setPasswordResult(null)}>Done</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={isEditModalOpen} onHide={() => setIsEditModalOpen(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit Employee</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {isEditModalLoading && <div className="text-center">Loading...</div>}
          {!isEditModalLoading && editingEmployee && (
            <EmployeeFormWizard
              mode="edit"
              employeeId={editingEmployee.id as string}
              initialData={editingEmployee}
              onSave={() => {
                setIsEditModalOpen(false);
                loadEmployees();
                Swal.fire({
                  title: "Success",
                  text: "Employee details updated successfully.",
                  icon: "success",
                  timer: 2000,
                  showConfirmButton: false,
                });
              }}
              onCancel={() => setIsEditModalOpen(false)}
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