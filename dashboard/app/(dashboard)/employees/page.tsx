import { Fragment } from "react";
import { Metadata } from "next";
import { IconPlus, IconSearch, IconFilter } from "@tabler/icons-react";

export const metadata: Metadata = {
  title: "Employees | HR Management",
};

const EmployeesPage = () => {
  return (
    <Fragment>
      <div className="mb-6 d-flex align-items-center justify-content-between">
        <div>
          <h2 className="mb-0 fw-bold">Employees</h2>
          <p className="text-secondary mb-0">Manage your workforce, view profiles, and update details.</p>
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-2">
          <IconPlus size={18} /> Add Employee
        </button>
      </div>

      <div className="card border-0 shadow-sm mb-6">
        <div className="card-header bg-white border-bottom-0 pt-4 pb-0">
          <div className="row g-3 align-items-center">
            <div className="col-md-4">
              <div className="input-group">
                <span className="input-group-text bg-transparent border-end-0">
                  <IconSearch size={18} className="text-muted" />
                </span>
                <input type="text" className="form-control border-start-0 ps-0" placeholder="Search employees..." />
              </div>
            </div>
            <div className="col-md-8 d-flex justify-content-md-end">
              <button className="btn btn-outline-secondary d-flex align-items-center gap-2">
                <IconFilter size={18} /> Filter
              </button>
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
                <tr>
                  <td>
                    <div className="d-flex align-items-center">
                      <img src="/images/avatar/avatar-1.jpg" alt="" className="avatar avatar-sm rounded-circle me-3" />
                      <div>
                        <h6 className="mb-0">John Doe</h6>
                        <small className="text-muted">john@example.com</small>
                      </div>
                    </div>
                  </td>
                  <td>#EMP-001</td>
                  <td>Engineering</td>
                  <td>Senior Developer</td>
                  <td>Jan 15, 2021</td>
                  <td><span className="badge bg-success-subtle text-success">Active</span></td>
                  <td>
                    <button className="btn btn-light btn-sm me-2">Edit</button>
                    <button className="btn btn-outline-danger btn-sm">Delete</button>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div className="d-flex align-items-center">
                      <img src="/images/avatar/avatar-2.jpg" alt="" className="avatar avatar-sm rounded-circle me-3" />
                      <div>
                        <h6 className="mb-0">Jane Smith</h6>
                        <small className="text-muted">jane@example.com</small>
                      </div>
                    </div>
                  </td>
                  <td>#EMP-002</td>
                  <td>Design</td>
                  <td>UI/UX Designer</td>
                  <td>Feb 20, 2022</td>
                  <td><span className="badge bg-success-subtle text-success">Active</span></td>
                  <td>
                    <button className="btn btn-light btn-sm me-2">Edit</button>
                    <button className="btn btn-outline-danger btn-sm">Delete</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default EmployeesPage;
