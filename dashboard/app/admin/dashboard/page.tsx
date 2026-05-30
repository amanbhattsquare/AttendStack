"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import dynamic from "next/dynamic";
import { Alert, Badge, Card, Col, Row, Spinner } from "react-bootstrap";
import {
  IconAlertTriangle,
  IconCalendarTime,
  IconCircleCheck,
  IconClock,
  IconListCheck,
  IconUsers,
} from "@tabler/icons-react";
import DashboardStats from "components/dashboard/DashboardStats";
import ActivityLog from "components/dashboard/ActivityLog";
import { DashboardStatType } from "types/DashboardTypes";

const EmployeesByOrgChart = dynamic(
  () => import("components/dashboard/EmployeesByOrgChart"),
  { ssr: false }
);

type AttendanceRecord = {
  id: number | string;
  employee_name?: string;
  status: string;
  status_label?: string;
  date: string;
  check_in?: string | null;
  updated_at?: string;
};

type LeaveRequest = {
  id: number | string;
  employee_name?: string;
  leave_type_label?: string;
  status: string;
  start_date: string;
  end_date: string;
  created_at?: string;
  updated_at?: string;
};

type PayrollRecord = {
  id: number | string;
  employee_details?: { full_name?: string };
  status: string;
  month_name?: string;
  month: number;
  year: number;
  updated_at?: string;
  paid_on?: string | null;
};

type ActivityItem = {
  description: string;
  timestamp: string;
  colorClass: string;
  createdAt: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_ENDPOINT;

const authConfig = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  return {
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
  };
};

const toArray = (payload: any) => Array.isArray(payload) ? payload : payload?.results || [];

const formatDateTime = (value?: string | null) => {
  if (!value) return "Just now";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const getAttendanceDescription = (record: AttendanceRecord) => {
  const employee = record.employee_name || "Employee";
  const punchTime = record.check_in
    ? new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).format(new Date(record.check_in))
    : null;

  switch (record.status) {
    case "PRESENT":
      return { text: `${employee} checked in${punchTime ? ` at ${punchTime}` : ""}`, color: "success" };
    case "LATE":
      return { text: `${employee} checked in late${punchTime ? ` at ${punchTime}` : ""}`, color: "warning" };
    case "HALF_DAY":
      return { text: `${employee} has a half-day attendance record`, color: "info" };
    case "LEAVE":
      return { text: `${employee} is on unpaid leave`, color: "danger" };
    case "PAID_LEAVE":
      return { text: `${employee} is on paid leave`, color: "primary" };
    case "ABSENT":
      return { text: `${employee} is marked absent`, color: "danger" };
    case "HOLIDAY":
      return { text: `${employee} has a holiday record`, color: "success" };
    case "SUNDAY_UNPAID":
      return { text: `${employee} has Sunday unpaid`, color: "secondary" };
    default:
      return { text: `${employee} attendance updated to ${record.status_label || record.status}`, color: "primary" };
  }
};

const AdminDashboard = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    setIsLoading(true);
    setError("");

    try {
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - 7);
      const month = today.getMonth() + 1;
      const year = today.getFullYear();

      const [employeesRes, todayRes, recentRes, leavesRes, payrollRes] = await Promise.all([
        axios.get(`${API_URL}/api/v1/employees/`, authConfig()),
        axios.get(`${API_URL}/api/v1/attendance/today/`, authConfig()),
        axios.get(`${API_URL}/api/v1/attendance/?date_from=${weekStart.toISOString().slice(0, 10)}`, authConfig()),
        axios.get(`${API_URL}/api/v1/attendance/leaves/`, authConfig()),
        axios.get(`${API_URL}/api/v1/payroll/?month=${month}&year=${year}`, authConfig()),
      ]);

      setEmployees(toArray(employeesRes.data));
      setTodayAttendance(toArray(todayRes.data));
      setRecentAttendance(toArray(recentRes.data));
      setLeaves(toArray(leavesRes.data));
      setPayrolls(toArray(payrollRes.data));
    } catch (loadError) {
      console.error("Failed to load admin dashboard.", loadError);
      setError("Unable to load live dashboard data. Please refresh or sign in again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    const interval = window.setInterval(loadDashboard, 60000);
    return () => window.clearInterval(interval);
  }, []);

  const attendanceCounts = useMemo(() => {
    const present = todayAttendance.filter((record) => ["PRESENT", "HALF_DAY"].includes(record.status)).length;
    const late = todayAttendance.filter((record) => record.status === "LATE").length;
    const absent = todayAttendance.filter((record) => record.status === "ABSENT").length;
    const leave = todayAttendance.filter((record) => record.status === "LEAVE").length;
    const paidLeave = todayAttendance.filter((record) => record.status === "PAID_LEAVE").length;
    return { present, late, absent, leave, paidLeave };
  }, [todayAttendance]);

  const activeEmployees = employees.filter((employee) => employee.status === "ACTIVE" || !employee.status).length;
  const attendanceRate = activeEmployees
    ? Math.round(((attendanceCounts.present + attendanceCounts.late) / activeEmployees) * 100)
    : 0;
  const pendingLeaves = leaves.filter((leave) => leave.status === "PENDING").length;
  const pendingPayroll = payrolls.filter((payroll) => payroll.status === "PENDING").length;

  const stats: DashboardStatType[] = [
    {
      id: "employees",
      title: "Active Employees",
      value: String(activeEmployees),
      icon: <IconUsers size={24} strokeWidth={1.5} />,
      bgColor: "bg-gradient-primary",
      textColor: "text-primary-emphasis",
      bottomValue: String(employees.length),
      description: "total profiles",
    },
    {
      id: "attendance-rate",
      title: "Attendance Rate",
      value: `${attendanceRate}%`,
      icon: <IconListCheck size={24} strokeWidth={1.5} />,
      bgColor: "bg-gradient-success",
      textColor: "text-success-emphasis",
      bottomValue: String(attendanceCounts.present + attendanceCounts.late),
      description: "checked in today",
    },
    {
      id: "pending-leaves",
      title: "Pending Leaves",
      value: String(pendingLeaves),
      icon: <IconCalendarTime size={24} strokeWidth={1.5} />,
      bgColor: "bg-gradient-warning",
      textColor: "text-warning-emphasis",
      bottomValue: String(attendanceCounts.leave + attendanceCounts.paidLeave),
      description: "on leave today",
    },
    {
      id: "payroll-pending",
      title: "Payroll Queue",
      value: String(pendingPayroll),
      icon: <IconClock size={24} strokeWidth={1.5} />,
      bgColor: "bg-gradient-info",
      textColor: "text-info-emphasis",
      bottomValue: payrolls.length ? String(payrolls.length) : "0",
      description: "records this month",
    },
  ];

  const attendanceChartData = [
    { status: "Present", count: attendanceCounts.present, color: "#16a34a" },
    { status: "Late", count: attendanceCounts.late, color: "#f59e0b" },
    { status: "Absent", count: attendanceCounts.absent, color: "#dc2626" },
    { status: "Leave", count: attendanceCounts.leave, color: "#ef4444" },
    { status: "Paid Leave", count: attendanceCounts.paidLeave, color: "#2563eb" },
  ];

  const activityLogs = useMemo(() => {
    const attendanceActivities: ActivityItem[] = recentAttendance.slice(0, 8).map((record) => {
      const descriptor = getAttendanceDescription(record);
      const createdAt = record.updated_at || record.check_in || record.date;
      return {
        description: descriptor.text,
        timestamp: formatDateTime(createdAt),
        colorClass: descriptor.color,
        createdAt,
      };
    });

    const leaveActivities: ActivityItem[] = leaves.slice(0, 8).map((leave) => ({
      description: `${leave.employee_name || "Employee"} ${leave.status.toLowerCase()} ${leave.leave_type_label || "leave"} request`,
      timestamp: formatDateTime(leave.updated_at || leave.created_at),
      colorClass: leave.status === "APPROVED" ? "success" : leave.status === "REJECTED" ? "danger" : "warning",
      createdAt: leave.updated_at || leave.created_at || leave.start_date,
    }));

    const payrollActivities: ActivityItem[] = payrolls.slice(0, 6).map((payroll) => ({
      description: `${payroll.employee_details?.full_name || "Employee"} payroll is ${payroll.status}`,
      timestamp: formatDateTime(payroll.paid_on || payroll.updated_at),
      colorClass: payroll.status === "PAID" ? "success" : "warning",
      createdAt: payroll.paid_on || payroll.updated_at || new Date().toISOString(),
    }));

    return [...attendanceActivities, ...leaveActivities, ...payrollActivities]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);
  }, [recentAttendance, leaves, payrolls]);

  return (
    <div className="admin-dashboard-page">
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-5">
        <div>
          <div className="d-flex align-items-center gap-2 mb-2">
            <Badge bg="primary-subtle" text="primary" className="border border-primary-subtle px-3 py-2 rounded-pill">
              Live Operations
            </Badge>
            <span className="text-secondary small">Auto-refreshes every 60 seconds</span>
          </div>
          <h2 className="mb-1 fw-bold text-dark">Admin Dashboard</h2>
          <p className="text-secondary mb-0">Workforce attendance, leave approvals, payroll queue, and operational activity.</p>
        </div>
        <Card className="border-0 shadow-sm admin-health-card">
          <Card.Body className="py-3 px-4 d-flex align-items-center gap-3">
            <div className="rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center" style={{ width: 42, height: 42 }}>
              <IconCircleCheck size={22} />
            </div>
            <div>
              <div className="fw-bold text-dark">System Live</div>
              <div className="small text-secondary">{formatDateTime(new Date().toISOString())}</div>
            </div>
          </Card.Body>
        </Card>
      </div>

      {error && (
        <Alert variant="danger" className="border-0 shadow-sm d-flex align-items-center gap-2">
          <IconAlertTriangle size={18} />
          {error}
        </Alert>
      )}

      {isLoading ? (
        <div className="d-flex justify-content-center align-items-center py-6">
          <Spinner animation="border" variant="primary" />
        </div>
      ) : (
        <>
          <Row className="g-4 mb-5">
            <DashboardStats stats={stats} />
          </Row>

          <Row className="g-4 mb-4">
            <Col xs={12} xl={8}>
              <EmployeesByOrgChart data={attendanceChartData} />
            </Col>
            <Col xs={12} xl={4}>
              <ActivityLog logs={activityLogs} />
            </Col>
          </Row>
        </>
      )}

      <style jsx global>{`
        .admin-dashboard-page .card {
          border-radius: 12px;
        }

        .admin-health-card {
          min-width: 250px;
        }

        .admin-dashboard-page .card-lg {
          border: 1px solid #eef2f6;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
          min-height: 160px;
        }

        .admin-dashboard-page .card-lg:hover {
          transform: translateY(-2px);
          transition: transform 0.18s ease, box-shadow 0.18s ease;
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
