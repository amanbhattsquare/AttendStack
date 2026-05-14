import { Fragment } from "react";
import { Metadata } from "next";
import { IconDownload, IconSearch } from "@tabler/icons-react";

export const metadata: Metadata = {
  title: "Salary & Payroll | HR Management",
};

const SalaryPage = () => {
  return (
    <Fragment>
      <div className="mb-6 d-flex align-items-center justify-content-between">
        <div>
          <h2 className="mb-0 fw-bold">Salary & Payroll</h2>
          <p className="text-secondary mb-0">Manage employee salaries, generate payslips, and view payroll history.</p>
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-2">
          Generate Payroll
        </button>
      </div>

      <div className="card border-0 shadow-sm mb-6">
        <div className="card-header bg-white border-bottom-0 pt-4 pb-0">
          <div className="row g-3">
            <div className="col-md-4">
              <div className="input-group">
                <span className="input-group-text bg-transparent border-end-0">
                  <IconSearch size={18} className="text-muted" />
                </span>
                <input type="text" className="form-control border-start-0 ps-0" placeholder="Search employee..." />
              </div>
            </div>
            <div className="col-md-3">
              <select className="form-select">
                <option>October 2024</option>
                <option>September 2024</option>
                <option>August 2024</option>
              </select>
            </div>
          </div>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table align-middle table-hover text-nowrap">
              <thead className="table-light">
                <tr>
                  <th>Employee Name</th>
                  <th>Basic Salary</th>
                  <th>Allowances</th>
                  <th>Deductions</th>
                  <th>Net Salary</th>
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
                        <small className="text-muted">Engineering</small>
                      </div>
                    </div>
                  </td>
                  <td>$4,500.00</td>
                  <td>$500.00</td>
                  <td>$200.00</td>
                  <td className="fw-bold">$4,800.00</td>
                  <td><span className="badge bg-success bg-opacity-10 text-success">Paid</span></td>
                  <td>
                    <button className="btn btn-light btn-sm d-flex align-items-center gap-1">
                      <IconDownload size={14} /> Payslip
                    </button>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div className="d-flex align-items-center">
                      <img src="/images/avatar/avatar-2.jpg" alt="" className="avatar avatar-sm rounded-circle me-3" />
                      <div>
                        <h6 className="mb-0">Jane Smith</h6>
                        <small className="text-muted">Design</small>
                      </div>
                    </div>
                  </td>
                  <td>$3,800.00</td>
                  <td>$400.00</td>
                  <td>$150.00</td>
                  <td className="fw-bold">$4,050.00</td>
                  <td><span className="badge bg-warning bg-opacity-10 text-warning">Pending</span></td>
                  <td>
                    <button className="btn btn-light btn-sm d-flex align-items-center gap-1">
                      <IconDownload size={14} /> Payslip
                    </button>
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

export default SalaryPage;
