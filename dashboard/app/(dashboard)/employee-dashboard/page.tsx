import { Fragment } from "react";
import { Metadata } from "next";
import { IconClock, IconCalendarOff, IconReceipt, IconChartPie } from "@tabler/icons-react";

export const metadata: Metadata = {
  title: "Employee Dashboard | Attendance & HR Management",
  description: "Personal dashboard for employees to track attendance, leave, and salary.",
};

const EmployeeDashboard = () => {
  return (
    <Fragment>
      <div className="mb-6 d-flex align-items-center justify-content-between">
        <div>
          <h2 className="mb-0 fw-bold">Welcome back, John! 👋</h2>
          <p className="text-secondary mb-0">Here is a summary of your recent activities.</p>
        </div>
      </div>
      <div className="row g-6 mb-6">
        <div className="col-xl-3 col-md-6">
          <div className="card card-lg bg-gradient-primary">
            <div className="card-body d-flex flex-column gap-8">
              <div className="d-flex justify-content-between align-items-center">
                <div className="fw-semibold">Total Attendance</div>
                <div className="text-primary-emphasis"><IconClock size={24} strokeWidth={1.5} /></div>
              </div>
              <div className="lh-1 d-flex flex-column gap-3">
                <div className="fs-1 fw-bold">184 days</div>
                <p className="mb-0 text-secondary">This Year</p>
              </div>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-md-6">
          <div className="card card-lg bg-gradient-warning">
            <div className="card-body d-flex flex-column gap-8">
              <div className="d-flex justify-content-between align-items-center">
                <div className="fw-semibold">Leave Balance</div>
                <div className="text-warning-emphasis"><IconCalendarOff size={24} strokeWidth={1.5} /></div>
              </div>
              <div className="lh-1 d-flex flex-column gap-3">
                <div className="fs-1 fw-bold">12 days</div>
                <p className="mb-0 text-secondary">Remaining</p>
              </div>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-md-6">
          <div className="card card-lg bg-gradient-success">
            <div className="card-body d-flex flex-column gap-8">
              <div className="d-flex justify-content-between align-items-center">
                <div className="fw-semibold">Next Salary</div>
                <div className="text-success-emphasis"><IconReceipt size={24} strokeWidth={1.5} /></div>
              </div>
              <div className="lh-1 d-flex flex-column gap-3">
                <div className="fs-1 fw-bold">In 5 days</div>
                <p className="mb-0 text-secondary">Estimated</p>
              </div>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-md-6">
          <div className="card card-lg bg-gradient-info">
            <div className="card-body d-flex flex-column gap-8">
              <div className="d-flex justify-content-between align-items-center">
                <div className="fw-semibold">Performance Score</div>
                <div className="text-info-emphasis"><IconChartPie size={24} strokeWidth={1.5} /></div>
              </div>
              <div className="lh-1 d-flex flex-column gap-3">
                <div className="fs-1 fw-bold">92%</div>
                <p className="mb-0 text-secondary">Outstanding</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="row g-6 mb-6">
        <div className="col-xl-8">
          <div className="card h-100">
            <div className="card-header">
              <h4 className="mb-0">Recent Attendance Logs</h4>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table mb-0 text-nowrap table-hover table-centered">
                  <thead className="table-light">
                    <tr>
                      <th>Date</th>
                      <th>Check In</th>
                      <th>Check Out</th>
                      <th>Total Hours</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Oct 24, 2024</td>
                      <td>09:00 AM</td>
                      <td>06:05 PM</td>
                      <td>9h 5m</td>
                      <td><span className="badge bg-success-subtle text-success">Present</span></td>
                    </tr>
                    <tr>
                      <td>Oct 23, 2024</td>
                      <td>09:15 AM</td>
                      <td>06:00 PM</td>
                      <td>8h 45m</td>
                      <td><span className="badge bg-warning-subtle text-warning">Late Entry</span></td>
                    </tr>
                    <tr>
                      <td>Oct 22, 2024</td>
                      <td>--:--</td>
                      <td>--:--</td>
                      <td>0h 0m</td>
                      <td><span className="badge bg-danger-subtle text-danger">Absent</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        <div className="col-xl-4">
          <div className="card h-100">
            <div className="card-header">
              <h4 className="mb-0">Upcoming Holidays</h4>
            </div>
            <div className="card-body">
              <div className="d-flex align-items-center mb-4">
                <div className="bg-primary-subtle text-primary rounded p-3 me-3">
                  <IconCalendarOff size={24} />
                </div>
                <div>
                  <h5 className="mb-1">Diwali</h5>
                  <p className="text-muted mb-0">Nov 1, 2024</p>
                </div>
              </div>
              <div className="d-flex align-items-center mb-4">
                <div className="bg-danger-subtle text-danger rounded p-3 me-3">
                  <IconCalendarOff size={24} />
                </div>
                <div>
                  <h5 className="mb-1">Christmas</h5>
                  <p className="text-muted mb-0">Dec 25, 2024</p>
                </div>
              </div>
              <div className="d-flex align-items-center">
                <div className="bg-info-subtle text-info rounded p-3 me-3">
                  <IconCalendarOff size={24} />
                </div>
                <div>
                  <h5 className="mb-1">New Year</h5>
                  <p className="text-muted mb-0">Jan 1, 2025</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default EmployeeDashboard;
