"use client";

import { Fragment, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { IconFilter, IconPlus, IconSearch } from "@tabler/icons-react";
import { Dropdown } from "react-bootstrap";
import AddEmployeeModal from "./AddEmployeeModal";
import Link from "next/link";

// Dummy data with UUIDs
const employees = [
  {
    uuid: "d2a6c9c8-3a75-4d89-9a15-3f57a9f7b2e1",
    name: "John Doe",
    email: "john@example.com",
    avatar: "/images/avatar/avatar-1.jpg",
    id: "#EMP-001",
    department: "Engineering",
    designation: "Senior Developer",
    joinDate: "Jan 15, 2021",
    status: "Active",
  },
  {
    uuid: "f8b8e3c8-6d54-4f8b-8e3c-8d54f8b8e3c8",
    name: "Jane Smith",
    email: "jane@example.com",
    avatar: "/images/avatar/avatar-2.jpg",
    id: "#EMP-002",
    department: "Design",
    designation: "UI/UX Designer",
    joinDate: "Feb 20, 2022",
    status: "Active",
  },
  {
    uuid: "a1b2c3d4-e5f6-7890-1234-567890abcdef",
    name: "Peter Jones",
    email: "peter@example.com",
    avatar: "/images/avatar/avatar-3.jpg",
    id: "#EMP-003",
    department: "Engineering",
    designation: "Junior Developer",
    joinDate: "Mar 10, 2023",
    status: "Inactive",
  }
];

const EmployeePageClient = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const router = useRouter();

  const handleRowClick = (employeeUuid: string) => {
    router.push(`/employees/${employeeUuid}`);
  };

  const filteredEmployees = useMemo(() => {
    let result = employees;

    if (searchQuery) {
      result = result.filter((employee) =>
        employee.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (departmentFilter) {
      result = result.filter(
        (employee) => employee.department === departmentFilter
      );
    }

    if (statusFilter) {
      result = result.filter((employee) => employee.status === statusFilter);
    }

    return result;
  }, [searchQuery, departmentFilter, statusFilter]);

  const uniqueDepartments = [...new Set(employees.map(emp => emp.department))];

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
                <input type="text" className="form-control border-start-0 ps-0" placeholder="Search employees by name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
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
                    {uniqueDepartments.map(dep => (
                      <Dropdown.Item key={dep} onClick={() => setDepartmentFilter(dep)}>{dep}</Dropdown.Item>
                    ))}
                    <Dropdown.Divider />
                    <Dropdown.Header>Status</Dropdown.Header>
                    <Dropdown.Item onClick={() => setStatusFilter("")}>All Statuses</Dropdown.Item>
                    <Dropdown.Item onClick={() => setStatusFilter("Active")}>Active</Dropdown.Item>
                    <Dropdown.Item onClick={() => setStatusFilter("Inactive")}>Inactive</Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </div>
          </div>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table align-middle table-hover text-nowrap">
              <thead className="table-light">
                <tr>
                  <th>Employee Name</th>
                  <th>ID</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Join Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((employee) => (
                  <tr key={employee.uuid} style={{ cursor: 'pointer' }} onClick={() => handleRowClick(employee.uuid)}>
                    <td>
                      <div className="d-flex align-items-center">
                        <img src={employee.avatar} alt={employee.name} className="avatar avatar-sm rounded-circle me-3" />
                        <div>
                          <h6 className="mb-0">{employee.name}</h6>
                          <small className="text-muted">{employee.email}</small>
                        </div>
                      </div>
                    </td>
                    <td>{employee.id}</td>
                    <td>{employee.department}</td>
                    <td>{employee.designation}</td>
                    <td>{employee.joinDate}</td>
                    <td>
                      <span className={`badge ${employee.status === 'Active' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}>{employee.status}</span>
                    </td>
                    <td>
                      <button className="btn btn-light btn-sm me-2" onClick={(e) => e.stopPropagation()}>Edit</button>
                      <button className="btn btn-outline-danger btn-sm" onClick={(e) => e.stopPropagation()}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <AddEmployeeModal show={showAddModal} onHide={() => setShowAddModal(false)} />
    </Fragment>
  );
};

export default EmployeePageClient;