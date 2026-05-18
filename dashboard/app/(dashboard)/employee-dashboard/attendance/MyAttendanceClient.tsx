"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Col, Row, Table } from "react-bootstrap";
import { IconLogin2, IconLogout2, IconRefresh } from "@tabler/icons-react";
import CustomPagination from "../../../../components/shared/CustomPagination";

type AttendanceRecord = {
  id: number;
  date: string;
  check_in: string | null;
  check_out: string | null;
  total_hours: string | null;
  status: string;
  status_label: string;
  live_status: string;
};

type TodayAttendance = {
  date: string;
  check_in: string | null;
  check_out: string | null;
  total_hours: string | null;
  status: string;
  status_label: string;
  live_status: string;
};

const API_URL = "http://127.0.0.1:8000/api/v1/attendance/";
const recordsPerPage = 8;

const authHeaders = (): HeadersInit => {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));

const formatTime = (value?: string | null) =>
  value ? new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "--:--";

const getStatusBadge = (status: string) => {
  switch (status) {
    case "PRESENT":
      return "success";
    case "LATE":
      return "warning";
    case "HALF_DAY":
      return "info";
    case "ABSENT":
      return "danger";
    case "ON_LEAVE":
      return "secondary";
    default:
      return "light";
  }
};

const MyAttendanceClient = () => {
  const [mounted, setMounted] = useState(false);
  const [today, setToday] = useState<TodayAttendance | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<"check-in" | "check-out" | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadAttendance = async () => {
    setIsLoading(true);
    setError("");

    try {
      const [todayResponse, recordsResponse] = await Promise.all([
        fetch(`${API_URL}me/today/`, { headers: authHeaders() }),
        fetch(`${API_URL}me/`, { headers: authHeaders() }),
      ]);

      if (!todayResponse.ok || !recordsResponse.ok) {
        throw new Error("Unable to load your attendance.");
      }

      setToday((await todayResponse.json()) as TodayAttendance);
      setRecords((await recordsResponse.json()) as AttendanceRecord[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load your attendance.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadAttendance();
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const parseError = async (response: Response) => {
    const body = await response.json().catch(() => null);
    return body?.detail || Object.values(body || {}).flat().join(" ") || "Attendance action failed.";
  };

  const markAttendance = async (action: "check-in" | "check-out") => {
    setActionLoading(action);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_URL}${action}/`, {
        method: "POST",
        headers: authHeaders(),
      });

      if (!response.ok) {
        throw new Error(await parseError(response));
      }

      setSuccess(action === "check-in" ? "Checked in successfully." : "Checked out successfully.");
      await loadAttendance();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to mark attendance.");
    } finally {
      setActionLoading(null);
    }
  };

  const currentRecords = useMemo(() => {
    const first = (currentPage - 1) * recordsPerPage;
    return records.slice(first, first + recordsPerPage);
  }, [currentPage, records]);

  const totalPages = Math.ceil(records.length / recordsPerPage);
  const canCheckIn = today && !today.check_in;
  const canCheckOut = today && today.check_in && !today.check_out;

  return (
    <div>
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <Card className="border-0 shadow-sm mb-4">
        <Card.Body className="p-4">
          <div className="d-flex flex-column flex-lg-row justify-content-between gap-4">
            <div>
              <h4 className="mb-1 fw-bold text-dark">Mark Attendance</h4>
              <p className="text-secondary mb-0">
                {mounted 
                  ? currentTime.toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }) 
                  : "Loading current date..."}
              </p>
              <span className="badge bg-primary-subtle text-primary border border-primary-subtle mt-2 px-3 py-1.5 rounded-pill fw-semibold">
                Shift Timing: 10:00 AM – 06:00 PM
              </span>
            </div>
            <div className="text-lg-end">
              <div className="display-6 fw-bold text-dark">
                {mounted ? currentTime.toLocaleTimeString("en-IN") : "--:--:--"}
              </div>
              <div className="text-secondary small">Asia/Kolkata</div>
            </div>
          </div>

          <Row className="g-4 mt-2">
            <Col md={4}>
              <div className="attendance-punch-box">
                <div className="text-secondary small">Check In</div>
                <div className="fs-4 fw-bold">{formatTime(today?.check_in)}</div>
              </div>
            </Col>
            <Col md={4}>
              <div className="attendance-punch-box">
                <div className="text-secondary small">Check Out</div>
                <div className="fs-4 fw-bold">{formatTime(today?.check_out)}</div>
              </div>
            </Col>
            <Col md={4}>
              <div className="attendance-punch-box">
                <div className="text-secondary small">Today Status</div>
                <div className="fs-5 fw-bold">{today?.live_status || "Not marked"}</div>
              </div>
            </Col>
          </Row>

          <div className="d-flex flex-wrap gap-2 mt-4">
            <Button
              variant="success"
              className="d-inline-flex align-items-center gap-2"
              onClick={() => markAttendance("check-in")}
              disabled={isLoading || !canCheckIn || actionLoading !== null}
            >
              <IconLogin2 size={18} /> {actionLoading === "check-in" ? "Checking in..." : "Check In"}
            </Button>
            <Button
              variant="danger"
              className="d-inline-flex align-items-center gap-2"
              onClick={() => markAttendance("check-out")}
              disabled={isLoading || !canCheckOut || actionLoading !== null}
            >
              <IconLogout2 size={18} /> {actionLoading === "check-out" ? "Checking out..." : "Check Out"}
            </Button>
            <Button variant="outline-secondary" className="d-inline-flex align-items-center gap-2" onClick={loadAttendance}>
              <IconRefresh size={18} /> Refresh
            </Button>
          </div>
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-white">
          <h4 className="mb-0 fw-bold text-dark">My Attendance Records</h4>
        </Card.Header>
        <Card.Body>
          <Table hover responsive className="text-nowrap align-middle">
            <thead className="table-light">
              <tr>
                <th>Date</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={4} className="text-center py-4 text-secondary">Loading records...</td></tr>}
              {!isLoading && currentRecords.length === 0 && <tr><td colSpan={4} className="text-center py-4 text-secondary">No attendance records yet.</td></tr>}
              {!isLoading && currentRecords.map((record) => (
                <tr key={record.id}>
                  <td>{formatDate(record.date)}</td>
                  <td>{formatTime(record.check_in)}</td>
                  <td>{formatTime(record.check_out)}</td>
                  <td><Badge bg={getStatusBadge(record.status)}>{record.status_label}</Badge></td>
                </tr>
              ))}
            </tbody>
          </Table>
          <CustomPagination currentPage={currentPage} totalPages={totalPages || 1} onPageChange={setCurrentPage} />
        </Card.Body>
      </Card>

      <style jsx global>{`
        .attendance-punch-box {
          background: #fbfcfe;
          border: 1px solid #edf1f5;
          border-radius: 10px;
          padding: 16px;
          height: 100%;
        }
      `}</style>
    </div>
  );
};

export default MyAttendanceClient;
