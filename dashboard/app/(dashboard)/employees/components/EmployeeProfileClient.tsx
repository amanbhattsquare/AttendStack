"use client";

import { useState } from "react";
import Image from "next/image";

// Define the type for the employee data
// We can expand this as we build out more sections
type Employee = {
  id: string;
  fullName: string;
  designation: string;
  avatar: string;
  personalInfo: {
    email: string;
    phone: string;
  };
  // ... other properties
};

interface EmployeeProfileClientProps {
  employee: Employee;
}

const EmployeeProfileClient = ({ employee }: EmployeeProfileClientProps) => {
  const [activeTab, setActiveTab] = useState("personal");

  return (
    <div className="row">
      {/* Profile Header */}
      <div className="col-12">
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <div className="d-flex align-items-center">
              <Image
                src={employee.avatar}
                alt={employee.fullName}
                width={100}
                height={100}
                className="rounded-circle me-4"
              />
              <div>
                <h3 className="mb-1">{employee.fullName}</h3>
                <p className="text-muted mb-1">{employee.designation}</p>
                <p className="text-muted mb-0">{employee.personalInfo.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Content (Tabs and Tab Panes) */}
      <div className="col-12">
        <div className="card border-0 shadow-sm">
          <div className="card-header">
            <ul className="nav nav-tabs card-header-tabs">
              <li className="nav-item">
                <a
                  className={`nav-link ${activeTab === "personal" ? "active" : ""}`}
                  href="#personal"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab("personal");
                  }}
                >
                  Personal Info
                </a>
              </li>
              <li className="nav-item">
                <a
                  className={`nav-link ${activeTab === "employment" ? "active" : ""}`}
                  href="#employment"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab("employment");
                  }}
                >
                  Employment
                </a>
              </li>
              {/* Add more tabs here as needed */}
            </ul>
          </div>
          <div className="card-body p-4">
            {/* Tab Content */}
            {activeTab === "personal" && (
              <div>
                <h4>Personal Information</h4>
                <p>Details about the employee's personal life.</p>
                {/* We will build a detailed view component here */}
              </div>
            )}
            {activeTab === "employment" && (
              <div>
                <h4>Employment Details</h4>
                <p>Information about the employee's role and history.</p>
                {/* We will build a detailed view component here */}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeProfileClient;