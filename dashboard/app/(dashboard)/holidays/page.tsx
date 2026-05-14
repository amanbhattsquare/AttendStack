import { Fragment } from "react";
import { Metadata } from "next";
import { IconPlus, IconBeach } from "@tabler/icons-react";

export const metadata: Metadata = {
  title: "Holidays | HR Management",
};

const HolidaysPage = () => {
  return (
    <Fragment>
      <div className="mb-6 d-flex align-items-center justify-content-between">
        <div>
          <h2 className="mb-0 fw-bold">Company Holidays</h2>
          <p className="text-secondary mb-0">Manage and view all upcoming company holidays and events.</p>
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-2">
          <IconPlus size={18} /> Add Holiday
        </button>
      </div>

      <div className="card border-0 shadow-sm mb-6">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table align-middle table-hover text-nowrap">
              <thead className="table-light">
                <tr>
                  <th>Holiday Name</th>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Type</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div className="d-flex align-items-center gap-3">
                      <div className="bg-primary-subtle text-primary p-2 rounded">
                        <IconBeach size={20} />
                      </div>
                      <h6 className="mb-0">New Year&apos;s Day</h6>
                    </div>
                  </td>
                  <td>Jan 1, 2024</td>
                  <td>Monday</td>
                  <td><span className="badge bg-info bg-opacity-10 text-info">Public Holiday</span></td>
                  <td>
                    <button className="btn btn-light btn-sm me-2">Edit</button>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div className="d-flex align-items-center gap-3">
                      <div className="bg-primary-subtle text-primary p-2 rounded">
                        <IconBeach size={20} />
                      </div>
                      <h6 className="mb-0">Independence Day</h6>
                    </div>
                  </td>
                  <td>Aug 15, 2024</td>
                  <td>Thursday</td>
                  <td><span className="badge bg-info bg-opacity-10 text-info">National Holiday</span></td>
                  <td>
                    <button className="btn btn-light btn-sm me-2">Edit</button>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div className="d-flex align-items-center gap-3">
                      <div className="bg-primary-subtle text-primary p-2 rounded">
                        <IconBeach size={20} />
                      </div>
                      <h6 className="mb-0">Diwali</h6>
                    </div>
                  </td>
                  <td>Nov 1, 2024</td>
                  <td>Friday</td>
                  <td><span className="badge bg-info bg-opacity-10 text-info">Festival</span></td>
                  <td>
                    <button className="btn btn-light btn-sm me-2">Edit</button>
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

export default HolidaysPage;
