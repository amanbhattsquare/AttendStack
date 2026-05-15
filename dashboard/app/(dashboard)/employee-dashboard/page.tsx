"use client";

import Link from "next/link";
import {
  IconBeach,
  IconCalendarCheck,
  IconChartBar,
  IconFingerprint,
  IconMail,
  IconPhone,
  IconUser,
  IconWallet,
} from "@tabler/icons-react";
import { useCurrentEmployee } from "./useCurrentEmployee";

const formatDate = (value?: string | null) => {
  if (!value) return "Not provided";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

const formatCurrency = (value?: string | null) => {
  if (!value) return "Not provided";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value));
};

const quickActions = [
  {
    title: "My Profile",
    text: "View your personal, job, and bank details.",
    href: "/employee-dashboard/profile",
    icon: <IconUser size={22} />,
  },
  {
    title: "My Attendance",
    text: "Mark or review your attendance activity.",
    href: "/employee-dashboard/attendance",
    icon: <IconFingerprint size={22} />,
  },
  {
    title: "Attendance Report",
    text: "Check monthly summaries and status.",
    href: "/employee-dashboard/attendance-report",
    icon: <IconChartBar size={22} />,
  },
  {
    title: "My Salary",
    text: "View payroll and salary information.",
    href: "/employee-dashboard/salary",
    icon: <IconWallet size={22} />,
  },
  {
    title: "Holidays",
    text: "See upcoming company holidays.",
    href: "/employee-dashboard/holidays",
    icon: <IconBeach size={22} />,
  },
];

const EmployeeDashboard = () => {
  const { employee, isLoading, error } = useCurrentEmployee();

  if (isLoading) {
    return <div className="card border-0 shadow-sm"><div className="card-body py-5 text-center text-secondary">Loading your dashboard...</div></div>;
  }

  if (error || !employee) {
    return <div className="alert alert-danger">{error || "Unable to load your dashboard."}</div>;
  }

  return (
    <div>
      <div className="employee-self-hero mb-4">
        <div className="d-flex flex-column flex-lg-row align-items-lg-center gap-4">
          <img
            src={employee.profile_photo_url || "/images/avatar/avatar-fallback.jpg"}
            alt={employee.full_name}
            className="employee-self-avatar"
          />
          <div className="flex-grow-1">
            <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
              <h2 className="mb-0">Welcome, {employee.full_name}</h2>
              <span className="badge bg-success-subtle text-success">{employee.status_label}</span>
            </div>
            <p className="text-secondary mb-3">{employee.designation} - {employee.department}</p>
            <div className="d-flex flex-wrap gap-3 text-secondary small">
              <span className="d-inline-flex align-items-center gap-1"><IconMail size={16} /> {employee.email}</span>
              <span className="d-inline-flex align-items-center gap-1"><IconPhone size={16} /> {employee.phone}</span>
              <span className="d-inline-flex align-items-center gap-1"><IconCalendarCheck size={16} /> Joined {formatDate(employee.joining_date)}</span>
            </div>
          </div>
          <Link href="/employee-dashboard/profile" className="btn btn-primary">Open My Profile</Link>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-md-4">
          <div className="employee-self-stat">
            <div className="text-secondary small">Employee ID</div>
            <div className="fw-bold fs-5">{employee.employee_id}</div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="employee-self-stat">
            <div className="text-secondary small">Annual Salary</div>
            <div className="fw-bold fs-5">{formatCurrency(employee.annual_salary)}</div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="employee-self-stat">
            <div className="text-secondary small">Reporting Manager</div>
            <div className="fw-bold fs-5">{employee.reporting_manager || "Not assigned"}</div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {quickActions.map((action) => (
          <div className="col-md-6 col-xl-4" key={action.href}>
            <Link href={action.href} className="employee-self-action">
              <span className="employee-self-action-icon">{action.icon}</span>
              <span>
                <span className="d-block fw-semibold">{action.title}</span>
                <span className="text-secondary small">{action.text}</span>
              </span>
            </Link>
          </div>
        ))}
      </div>

      <style jsx global>{`
        .employee-self-hero,
        .employee-self-stat,
        .employee-self-action {
          background: #fff;
          border: 1px solid #edf1f5;
          border-radius: 10px;
          box-shadow: 0 2px 8px rgba(16, 24, 40, 0.04);
        }

        .employee-self-hero {
          padding: 24px;
        }

        .employee-self-avatar {
          width: 104px;
          height: 104px;
          border-radius: 50%;
          object-fit: cover;
          border: 4px solid #f3f7fa;
        }

        .employee-self-stat {
          padding: 18px;
          height: 100%;
        }

        .employee-self-action {
          min-height: 112px;
          padding: 18px;
          display: flex;
          gap: 14px;
          align-items: flex-start;
          color: inherit;
          text-decoration: none;
          height: 100%;
          transition: border-color 0.15s ease, transform 0.15s ease;
        }

        .employee-self-action:hover {
          border-color: #0ea66b;
          transform: translateY(-1px);
        }

        .employee-self-action-icon {
          width: 42px;
          height: 42px;
          border-radius: 8px;
          background: #eaf8f1;
          color: #0ea66b;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
        }
      `}</style>
    </div>
  );
};

export default EmployeeDashboard;
