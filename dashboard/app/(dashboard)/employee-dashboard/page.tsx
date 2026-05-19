"use client";

import React, { useState, useEffect } from "react";
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
  IconBuilding,
  IconBriefcase,
  IconClock,
  IconShield,
  IconLogin2,
  IconLogout2,
  IconCircleCheck,
} from "@tabler/icons-react";
import { useCurrentEmployee } from "./useCurrentEmployee";
import { Spinner, Alert, Badge, Card, Button, Row, Col } from "react-bootstrap";

const formatDate = (value?: string | null) => {
  if (!value) return "Not provided";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

const formatCurrency = (value?: string | number | null) => {
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
    text: "Review personal details, bank records, and official documents.",
    href: "/employee-dashboard/profile",
    icon: <IconUser size={24} />,
    color: "#4f46e5", // Indigo
    bgColor: "#eeebff",
  },
  {
    title: "Clock-In & Attendance",
    text: "Mark your daily presence, log lunch breaks, and review live logs.",
    href: "/employee-dashboard/attendance",
    icon: <IconFingerprint size={24} />,
    color: "#0ea5e9", // Sky
    bgColor: "#e0f2fe",
  },
  {
    title: "Monthly Reports",
    text: "Track your working hours, check-in averages, and present ratios.",
    href: "/employee-dashboard/attendance-report",
    icon: <IconChartBar size={24} />,
    color: "#10b981", // Emerald
    bgColor: "#ecfdf5",
  },
  {
    title: "My Paychecks",
    text: "Download print-ready monthly payslips and inspect salary breakdowns.",
    href: "/employee-dashboard/salary",
    icon: <IconWallet size={24} />,
    color: "#f59e0b", // Amber
    bgColor: "#fef3c7",
  },
  {
    title: "Holiday Calendar",
    text: "Browse upcoming company holidays and festival calendars.",
    href: "/employee-dashboard/holidays",
    icon: <IconBeach size={24} />,
    color: "#ec4899", // Pink
    bgColor: "#fdf2f8",
  },
];

const EmployeeDashboard = () => {
  const { employee, isLoading, error } = useCurrentEmployee();

  const [mounted, setMounted] = useState(false);
  const [today, setToday] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [actionLoading, setActionLoading] = useState<"check-in" | "check-out" | null>(null);
  const [punchError, setPunchError] = useState("");
  const [punchSuccess, setPunchSuccess] = useState("");

  const loadTodayAttendance = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/attendance/me/today/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setToday(data);
      }
    } catch (err) {
      console.error("Error loading today attendance:", err);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadTodayAttendance();
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const markAttendance = async (action: "check-in" | "check-out") => {
    setActionLoading(action);
    setPunchError("");
    setPunchSuccess("");
    const token = localStorage.getItem("authToken");
    if (!token) {
      setPunchError("Session expired. Please sign in again.");
      setActionLoading(null);
      return;
    }

    try {
      const res = await fetch(`http://127.0.0.1:8000/api/v1/attendance/${action}/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail || "Attendance operation failed.");
      }

      setPunchSuccess(action === "check-in" ? "Checked in successfully!" : "Checked out successfully!");
      await loadTodayAttendance();
    } catch (err) {
      setPunchError(err instanceof Error ? err.message : "Unable to mark attendance.");
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-6 min-vh-50">
        <div className="text-center">
          <Spinner animation="border" variant="primary" role="status" className="mb-3">
            <span className="visually-hidden">Loading Dashboard...</span>
          </Spinner>
          <p className="text-secondary">Assembling your personal workspace...</p>
        </div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <Alert variant="danger" className="border-0 shadow-sm p-4">
        <h5 className="fw-bold mb-2">Workspace Unreachable</h5>
        <p className="mb-0">{error || "Unable to fetch your personal employee credentials. Please log in again."}</p>
      </Alert>
    );
  }

  const monthlySalary = Number(employee.annual_salary) / 12;

  return (
    <div className="employee-dashboard-container py-3">
      {/* Welcome Hero Banner */}
      <div className="card border-0 shadow-sm mb-5 overflow-hidden position-relative welcome-hero-card">
        <div className="radial-glow"></div>
        <div className="card-body p-4 p-lg-5 position-relative">
          <div className="d-flex flex-column flex-lg-row align-items-lg-center gap-4">
            <div className="avatar-wrapper position-relative">
              <img
                src={employee.profile_photo_url || "/images/avatar/avatar-fallback.jpg"}
                alt={employee.full_name}
                className="rounded-circle border border-4 border-white shadow-sm employee-avatar"
              />
              <span className={`status-dot ${employee.status === "ACTIVE" ? "bg-success" : "bg-warning"}`}></span>
            </div>
            <div className="flex-grow-1 text-white-container">
              <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                <h1 className="fw-bold mb-0 text-dark heading-welcome">Welcome back, {employee.full_name.split(" ")[0]}!</h1>
                <Badge bg="success" className="px-3 py-2 bg-success-subtle text-success border border-success-subtle font-monospace rounded-pill">
                  {employee.status_label}
                </Badge>
              </div>
              <p className="text-secondary fw-medium mb-3 fs-5">
                {employee.designation} <span className="mx-1 text-muted">•</span> {employee.department}
              </p>
              
              <div className="d-flex flex-wrap gap-4 text-muted small mt-2">
                <span className="d-inline-flex align-items-center gap-2">
                  <IconMail size={18} className="text-secondary" /> {employee.email}
                </span>
                <span className="d-inline-flex align-items-center gap-2">
                  <IconPhone size={18} className="text-secondary" /> {employee.phone}
                </span>
                <span className="d-inline-flex align-items-center gap-2">
                  <IconCalendarCheck size={18} className="text-secondary" /> Joined {formatDate(employee.joining_date)}
                </span>
              </div>
            </div>
            <div className="ms-lg-auto">
              <Link href="/employee-dashboard/profile" className="btn btn-primary btn-lg shadow-sm px-4 fw-semibold text-white">
                View Official Profile
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Helpful Tip Banner */}
      <div className="alert alert-primary border-0 shadow-sm d-flex align-items-center gap-3 mb-5 p-3 px-4">
        <IconClock size={24} className="text-primary flex-shrink-0 animate-pulse" />
        <div>
          <strong className="text-primary-emphasis">Shift Schedule:</strong> 
          <span className="text-secondary ms-1">Standard office timing is **10:00 AM to 06:00 PM**. Please check in and check out daily from your portal to track working hours accurately.</span>
        </div>
      </div>

      {/* Attendance Punch In/Out Quick Action Panel */}
      {mounted && (
        <Card className="border-0 shadow-sm mb-5 overflow-hidden rounded-4 bg-white">
          <Card.Body className="p-4">
            <Row className="align-items-center g-4">
              <Col xs={12} lg={6}>
                <div className="d-flex align-items-center gap-3">
                  <div className="p-3 bg-primary-subtle text-primary rounded-4">
                    <IconFingerprint size={32} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h4 className="fw-bold text-dark mb-1">Daily Attendance Punch</h4>
                    <p className="text-secondary small mb-0">
                      Standard Timing: **10:00 AM — 06:00 PM**
                    </p>
                  </div>
                </div>

                {/* Ticking Digital Clock */}
                <div className="mt-4 p-3 bg-light rounded-3 d-inline-flex align-items-center gap-3 border">
                  <IconClock size={20} className="text-primary animate-pulse" />
                  <div>
                    <div className="fs-5 fw-bold text-dark font-monospace">
                      {currentTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
                    </div>
                    <div className="text-secondary small" style={{ fontSize: "0.76rem" }}>
                      {currentTime.toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "short", year: "numeric" })}
                    </div>
                  </div>
                </div>
              </Col>

              <Col xs={12} lg={6} className="d-flex flex-column justify-content-center align-items-lg-end">
                {punchSuccess && (
                  <Alert variant="success" className="border-0 shadow-sm rounded-3 w-100 mb-3 py-2 px-3 small" onClose={() => setPunchSuccess("")} dismissible>
                    {punchSuccess}
                  </Alert>
                )}
                {punchError && (
                  <Alert variant="danger" className="border-0 shadow-sm rounded-3 w-100 mb-3 py-2 px-3 small" onClose={() => setPunchError("")} dismissible>
                    {punchError}
                  </Alert>
                )}

                {today ? (
                  <div className="w-100 d-flex flex-column gap-3 align-items-lg-end">
                    {/* Punch States */}
                    {!today.check_in ? (
                      <div className="w-100 text-lg-end">
                        <p className="text-secondary small mb-3">You haven't clocked in today yet.</p>
                        <Button
                          variant="primary"
                          size="lg"
                          onClick={() => markAttendance("check-in")}
                          disabled={actionLoading !== null}
                          className="d-inline-flex align-items-center gap-2 px-5 py-3 rounded-3 fw-bold shadow-sm text-white border-0"
                        >
                          <IconLogin2 size={22} />
                          {actionLoading === "check-in" ? "Punching In..." : "Clock In Now"}
                        </Button>
                      </div>
                    ) : !today.check_out ? (
                      <div className="w-100 text-lg-end">
                        <div className="mb-3 d-inline-flex align-items-center gap-2 px-3 py-2 bg-success-subtle text-success border border-success-subtle rounded-3 small">
                          <IconCircleCheck size={16} />
                          <strong>Checked In at:</strong>{" "}
                          {new Date(today.check_in).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </div>
                        <br />
                        <Button
                          variant="warning"
                          size="lg"
                          onClick={() => markAttendance("check-out")}
                          disabled={actionLoading !== null}
                          className="d-inline-flex align-items-center gap-2 px-5 py-3 rounded-3 fw-bold shadow-sm text-dark border-0"
                          style={{ backgroundColor: "#ffb020", color: "#1e293b" }}
                        >
                          <IconLogout2 size={22} />
                          {actionLoading === "check-out" ? "Punching Out..." : "Clock Out Now"}
                        </Button>
                      </div>
                    ) : (
                      <div className="w-100 text-lg-end">
                        <div className="p-3 bg-light rounded-4 border text-center text-lg-end d-inline-block w-100">
                          <h6 className="fw-bold text-success mb-2 d-flex align-items-center gap-2 justify-content-center justify-content-lg-end">
                            <IconCircleCheck size={20} /> Shift Completed Today!
                          </h6>
                          <p className="text-secondary small mb-0">
                            Check In: <strong>{new Date(today.check_in).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}</strong> | 
                            Check Out: <strong>{new Date(today.check_out).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}</strong>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center w-100 py-3">
                    <Spinner animation="border" size="sm" variant="primary" />
                    <span className="ms-2 text-secondary small">Synchronizing punch status...</span>
                  </div>
                )}
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}

      {/* Key Metrics grid */}
      <div className="row g-4 mb-5">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100 metric-card position-relative overflow-hidden">
            <div className="metric-glow bg-primary-subtle"></div>
            <div className="card-body p-4 position-relative d-flex align-items-center gap-3">
              <div className="metric-icon-box bg-primary-subtle text-primary">
                <IconBriefcase size={24} />
              </div>
              <div>
                <span className="text-muted d-block small fw-semibold text-uppercase">Corporate ID</span>
                <strong className="fs-4 fw-bold text-dark">{employee.employee_id}</strong>
                <span className="d-block text-secondary small mt-1">{employee.employment_type_label || "Permanent"} Employee</span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100 metric-card position-relative overflow-hidden">
            <div className="metric-glow bg-success-subtle"></div>
            <div className="card-body p-4 position-relative d-flex align-items-center gap-3">
              <div className="metric-icon-box bg-success-subtle text-success">
                <IconWallet size={24} />
              </div>
              <div>
                <span className="text-muted d-block small fw-semibold text-uppercase">Monthly Salary Est.</span>
                <strong className="fs-4 fw-bold text-success">{formatCurrency(monthlySalary)}</strong>
                <span className="d-block text-secondary small mt-1">CTC: {formatCurrency(employee.annual_salary)} / yr</span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100 metric-card position-relative overflow-hidden">
            <div className="metric-glow bg-info-subtle"></div>
            <div className="card-body p-4 position-relative d-flex align-items-center gap-3">
              <div className="metric-icon-box bg-info-subtle text-info">
                <IconBuilding size={24} />
              </div>
              <div>
                <span className="text-muted d-block small fw-semibold text-uppercase">Reporting Officer</span>
                <strong className="fs-5 fw-bold text-dark">{employee.reporting_manager || "Admin Desk"}</strong>
                <span className="d-block text-secondary small mt-1">Department: {employee.department}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <h4 className="fw-bold mb-4 text-dark d-flex align-items-center gap-2">
        <IconShield size={22} className="text-primary" /> Core Workspaces & Actions
      </h4>
      
      <div className="row g-4">
        {quickActions.map((action) => (
          <div className="col-md-6 col-xl-4" key={action.href}>
            <Link href={action.href} className="card h-100 border-0 shadow-sm quick-action-card text-decoration-none">
              <div className="card-body p-4 d-flex gap-3">
                <div 
                  className="action-icon-wrapper d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ backgroundColor: action.bgColor, color: action.color }}
                >
                  {action.icon}
                </div>
                <div>
                  <h6 className="fw-bold text-dark mb-1 card-title-action">{action.title}</h6>
                  <p className="text-secondary small mb-0">{action.text}</p>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      <style jsx global>{`
        .employee-dashboard-container {
          font-family: 'Inter', sans-serif;
        }

        .welcome-hero-card {
          background: #ffffff;
          border: 1px solid #eef2f6 !important;
          border-radius: 16px;
        }

        .radial-glow {
          position: absolute;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.05) 0%, rgba(255, 255, 255, 0) 70%);
          right: -50px;
          top: -50px;
          pointer-events: none;
        }

        .employee-avatar {
          width: 110px;
          height: 110px;
          object-fit: cover;
        }

        .avatar-wrapper {
          display: inline-block;
        }

        .status-dot {
          position: absolute;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 3px solid #ffffff;
          bottom: 4px;
          right: 4px;
        }

        .metric-card {
          border: 1px solid #eef2f6 !important;
          border-radius: 14px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .metric-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(16, 24, 40, 0.06) !important;
        }

        .metric-glow {
          position: absolute;
          width: 150px;
          height: 150px;
          background: radial-gradient(circle, rgba(0, 0, 0, 0.02) 0%, rgba(255, 255, 255, 0) 70%);
          right: -40px;
          bottom: -40px;
          pointer-events: none;
          opacity: 0.5;
        }

        .metric-icon-box {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .quick-action-card {
          border: 1px solid #eef2f6 !important;
          border-radius: 14px;
          transition: all 0.2s ease;
        }

        .quick-action-card:hover {
          transform: translateY(-3px);
          border-color: #4f46e5 !important;
          box-shadow: 0 10px 20px rgba(79, 70, 229, 0.05) !important;
        }

        .action-icon-wrapper {
          width: 46px;
          height: 46px;
          border-radius: 10px;
        }

        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: .6;
          }
        }

        .heading-welcome {
          font-family: 'Outfit', sans-serif;
          letter-spacing: -0.5px;
        }
      `}</style>
    </div>
  );
};

export default EmployeeDashboard;
