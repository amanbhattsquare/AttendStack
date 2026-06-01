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
  IconNotes,
  IconActivity,
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

type EmployeeActivity = {
  id: string;
  title: string;
  description: string;
  timeLabel: string;
  color: string;
  createdAt: string;
};

const toArray = (payload: any) => Array.isArray(payload) ? payload : payload?.results || [];

const formatTimeLabel = (value?: string | null) => {
  if (!value) return "Just now";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const EmployeeDashboard = () => {
  const { employee, isLoading, error } = useCurrentEmployee();

  const [mounted, setMounted] = useState(false);
  const [today, setToday] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [actionLoading, setActionLoading] = useState<"check-in" | "check-out" | null>(null);
  const [punchError, setPunchError] = useState("");
  const [punchSuccess, setPunchSuccess] = useState("");
  const [activityFeed, setActivityFeed] = useState<EmployeeActivity[]>([]);
  const DEFAULT_RULES = `1. Core Working Hours: 10:00 AM to 6:00 PM.
2. Late Entry: Arriving after 10:15 AM will be marked as Late.
3. Half Day: Working less than 4 hours will be considered a Half Day.
4. Leave Requests: Must be submitted at least 24 hours in advance.
5. Unpaid Leave: Absences without prior approval will be considered Unpaid.`;

  const [attendanceRules, setAttendanceRules] = useState("");
  const [settings, setSettings] = useState<any>(null);

  const loadSettings = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_ENDPOINT}/api/v1/settings/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error("Error loading settings:", err);
    }
  };

  const loadActivityFeed = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    try {
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - 7);
      const headers = { Authorization: `Bearer ${token}` };

      const [attendanceRes, leavesRes, payrollRes, holidaysRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_ENDPOINT}/api/v1/attendance/me/?date_from=${weekStart.toISOString().slice(0, 10)}`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_ENDPOINT}/api/v1/attendance/leaves/`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_ENDPOINT}/api/v1/payroll/`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_ENDPOINT}/api/v1/holidays/`, { headers }),
      ]);

      const activities: EmployeeActivity[] = [];

      if (attendanceRes.ok) {
        toArray(await attendanceRes.json()).slice(0, 4).forEach((record: any) => {
          activities.push({
            id: `attendance-${record.id}`,
            title: "Attendance Updated",
            description: `${formatDate(record.date)} marked as ${record.status_label || record.status}.`,
            timeLabel: formatTimeLabel(record.updated_at || record.check_in || record.date),
            color: record.status === "ABSENT" || record.status === "LEAVE" ? "danger" : record.status === "LATE" ? "warning" : "success",
            createdAt: record.updated_at || record.check_in || record.date,
          });
        });
      }

      if (leavesRes.ok) {
        toArray(await leavesRes.json()).slice(0, 4).forEach((leave: any) => {
          activities.push({
            id: `leave-${leave.id}`,
            title: leave.status === "PENDING" ? "Leave Awaiting Review" : `Leave ${leave.status_label || leave.status}`,
            description: `${leave.leave_type_label || "Leave"} from ${formatDate(leave.start_date)} to ${formatDate(leave.end_date)}.`,
            timeLabel: formatTimeLabel(leave.updated_at || leave.created_at),
            color: leave.status === "APPROVED" ? "success" : leave.status === "REJECTED" ? "danger" : "warning",
            createdAt: leave.updated_at || leave.created_at,
          });
        });
      }

      if (payrollRes.ok) {
        toArray(await payrollRes.json()).slice(0, 2).forEach((payroll: any) => {
          activities.push({
            id: `payroll-${payroll.id}`,
            title: payroll.status === "PAID" ? "Salary Paid" : "Payslip Generated",
            description: `${payroll.month_name || payroll.month} ${payroll.year} payroll is ${payroll.status}.`,
            timeLabel: formatTimeLabel(payroll.paid_on || payroll.updated_at),
            color: payroll.status === "PAID" ? "success" : "primary",
            createdAt: payroll.paid_on || payroll.updated_at || payroll.created_at,
          });
        });
      }

      if (holidaysRes.ok) {
        const todayStr = today.toISOString().slice(0, 10);
        toArray(await holidaysRes.json())
          .filter((holiday: any) => holiday.date >= todayStr)
          .slice(0, 2)
          .forEach((holiday: any) => {
            activities.push({
              id: `holiday-${holiday.id}`,
              title: "Upcoming Holiday",
              description: `${holiday.name} on ${formatDate(holiday.date)}.`,
              timeLabel: "Holiday Calendar",
              color: "info",
              createdAt: holiday.date,
            });
          });
      }

      setActivityFeed(
        activities
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 6)
      );
    } catch (err) {
      console.error("Error loading employee activity feed:", err);
    }
  };

  const loadTodayAttendance = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_ENDPOINT}/api/v1/attendance/me/today/`, {
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
    loadActivityFeed();
    loadSettings();
    const rules = localStorage.getItem("attendance_rules");
    setAttendanceRules(rules || settings?.attendance_rules || DEFAULT_RULES);
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);
    const activityTimer = window.setInterval(loadActivityFeed, 60000);
    return () => {
      window.clearInterval(timer);
      window.clearInterval(activityTimer);
    };
  }, []);

  const [isCheckinActive, setCheckinActive] = useState(false);
  const [isCheckoutActive, setCheckoutActive] = useState(false);

  useEffect(() => {
    const checkTime = () => {
      if (!settings) return;

      const now = new Date();
      const [startHours, startMinutes] = settings.shift_start_time.split(':').map(Number);
      const [endHours, endMinutes] = settings.shift_end_time.split(':').map(Number);

      const shiftStart = new Date(now);
      shiftStart.setHours(startHours, startMinutes, 0, 0);

      const shiftEnd = new Date(now);
      shiftEnd.setHours(endHours, endMinutes, 0, 0);

      const checkinWindowStart = new Date(shiftStart);
      checkinWindowStart.setHours(checkinWindowStart.getHours() - 1);

      setCheckinActive(now >= checkinWindowStart && now <= shiftEnd);

      if (today?.check_in) {
        const checkinTime = new Date(today.check_in);
        const minCheckoutTime = new Date(checkinTime);
        minCheckoutTime.setHours(minCheckoutTime.getHours() + 3);
        setCheckoutActive(now >= minCheckoutTime);
      } else {
        setCheckoutActive(false);
      }
    };

    checkTime();
    const timer = setInterval(checkTime, 60000); // Re-check every minute
    return () => clearInterval(timer);
  }, [currentTime, today, settings]);

  const markAttendance = async (action: "check-in" | "check-out") => {
    setActionLoading(action);
    setPunchError("");
    setPunchSuccess("");

    if (action === "check-in" && !isCheckinActive) {
      setPunchError("Check-in is not active at this time.");
      setActionLoading(null);
      return;
    }

    if (action === "check-out" && !isCheckoutActive) {
      setPunchError("Checkout is not active at this time.");
      setActionLoading(null);
      return;
    }

    const token = localStorage.getItem("authToken");
    if (!token) {
      setPunchError("Session expired. Please sign in again.");
      setActionLoading(null);
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_ENDPOINT}/api/v1/attendance/${action}/`, {
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
      await loadActivityFeed();
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
                {employee.designation} <span className="mx-1 text-muted">•</span> {employee.department} <span className="mx-1 text-muted">•</span> Bhatt Square Pvt Ltd
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
      <div className="alert alert-primary border-0 shadow-sm d-flex align-items-center gap-3 mb-4 p-3 px-4">
        <IconClock size={24} className="text-primary flex-shrink-0 animate-pulse" />
        <div>
          <strong className="text-primary-emphasis">Shift Schedule:</strong> 
          <span className="text-secondary ms-1">
            Standard office timing is <strong>{settings ? `${settings.shift_start_time} to ${settings.shift_end_time}` : "10:00 AM to 06:00 PM"}</strong>. Please check in and check out daily from your portal to track working hours accurately.
          </span>
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
                      Standard timing: <strong>{settings ? `${settings.shift_start_time} to ${settings.shift_end_time}` : "10:00 AM to 06:00 PM"}</strong>
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
                          disabled={actionLoading !== null || !isCheckinActive}
                          className="d-inline-flex align-items-center gap-2 px-5 py-3 rounded-3 fw-bold shadow-sm text-white border-0"
                        >
                          <IconLogin2 size={22} />
                          {actionLoading === "check-in" ? "Punching In..." : "Clock In Now"}
                        </Button>
                        {!isCheckinActive && (
                          <p className="text-danger small mt-2">Check-in is only available 1 hour before and during the shift.</p>
                        )}
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
                          disabled={actionLoading !== null || !isCheckoutActive}
                          className="d-inline-flex align-items-center gap-2 px-5 py-3 rounded-3 fw-bold shadow-sm text-dark border-0"
                          style={{ backgroundColor: "#ffb020", color: "#1e293b" }}
                        >
                          <IconLogout2 size={22} />
                          {actionLoading === "check-out" ? "Punching Out..." : "Clock Out Now"}
                        </Button>
                        {!isCheckoutActive && (
                          <p className="text-danger small mt-2">Checkout is available only after 3 hours of work.</p>
                        )}
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

      <Row className="g-4 mb-5">
        <Col xs={12} xl={7}>
          <Card className="border-0 shadow-sm h-100 rounded-4 employee-activity-card">
            <Card.Header className="bg-white border-0 py-3 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2">
                <IconActivity size={20} className="text-primary" />
                <h5 className="mb-0 fw-bold text-dark">My Live Activity</h5>
              </div>
              <Badge bg="success-subtle" text="success" className="border border-success-subtle rounded-pill">
                Live
              </Badge>
            </Card.Header>
            <Card.Body className="pt-0">
              {activityFeed.length === 0 ? (
                <div className="text-center text-secondary py-4">
                  No recent personal activity yet.
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {activityFeed.map((activity) => (
                    <div key={activity.id} className="d-flex gap-3 align-items-start p-3 rounded-3 bg-light-subtle border">
                      <span className={`rounded-circle bg-${activity.color}-subtle text-${activity.color} d-flex align-items-center justify-content-center flex-shrink-0`} style={{ width: 34, height: 34 }}>
                        <IconCircleCheck size={17} />
                      </span>
                      <div className="min-w-0">
                        <div className="fw-semibold text-dark">{activity.title}</div>
                        <div className="small text-secondary">{activity.description}</div>
                        <div className="small text-muted mt-1">{activity.timeLabel}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} xl={5}>
          <Card className="border-0 shadow-sm h-100 rounded-4">
            <Card.Body className="p-4">
              <div className="d-flex align-items-center gap-3 mb-4">
                <div className="metric-icon-box bg-success-subtle text-success">
                  <IconShield size={24} />
                </div>
                <div>
                  <h5 className="fw-bold text-dark mb-1">Work Readiness</h5>
                  <p className="text-secondary small mb-0">Your profile, attendance, and payroll signals in one place.</p>
                </div>
              </div>
              <div className="d-flex flex-column gap-3">
                <div className="d-flex justify-content-between align-items-center border-bottom pb-3">
                  <span className="text-secondary">Today status</span>
                  <Badge bg={today?.status === "ABSENT" ? "danger" : "success"}>{today?.status_label || "Syncing"}</Badge>
                </div>
                <div className="d-flex justify-content-between align-items-center border-bottom pb-3">
                  <span className="text-secondary">Employee status</span>
                  <Badge bg={employee.status === "ACTIVE" ? "success" : "warning"}>{employee.status_label}</Badge>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-secondary">Reporting manager</span>
                  <strong className="text-dark">{employee.reporting_manager || "Admin Desk"}</strong>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

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

      {/* Attendance Rules Section */}
      {attendanceRules && (
        <Card className="border-0 shadow-sm mt-5 overflow-hidden rounded-4 bg-white">
          <Card.Header className="bg-light d-flex align-items-center gap-2 py-3 border-bottom-0">
            <IconNotes size={20} className="text-primary" />
            <h5 className="mb-0 fw-bold text-dark">My Attendance Rules</h5>
          </Card.Header>
          <Card.Body className="p-4 bg-light-subtle">
            <div className="rules-content text-secondary" style={{ whiteSpace: "pre-line", lineHeight: "1.6" }}>
              {attendanceRules}
            </div>
          </Card.Body>
        </Card>
      )}

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