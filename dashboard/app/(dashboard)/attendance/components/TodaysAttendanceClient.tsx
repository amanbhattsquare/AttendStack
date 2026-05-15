"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, CardBody, Col, Form, Row, Table } from "react-bootstrap";
import { IconRefresh, IconUserCheck, IconUserExclamation, IconUserOff, IconUsers } from "@tabler/icons-react";
import DashboardStats from "components/dashboard/DashboardStats";

type TodayAttendance = {
  employee_uuid: string;
  employee_id: string;
  employee_name: string;
  employee_email: string;
  employee_department: string;
  employee_designation: string;
  employee_avatar_url: string | null;
  date: string;
  check_in: string | null;
  check_out: string | null;
  total_hours: string | null;
  status: string;
  status_label: string;
  live_status: string;
};

const API_URL = "http://127.0.0.1:8000/api/v1/attendance/today/";

const authHeaders = (): HeadersInit => {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const formatTime = (value?: string | null) =>
  value ? new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "--";

const badgeClass = (status: string) => {
  switch (status) {
    case "Clocked In":
      return "success";
    case "Clocked Out":
      return "secondary";
    case "Absent":
      return "danger";
    case "On Leave":
      return "info";
    default:
      return "warning";
  }
};

const TodaysAttendanceClient = () => {
  const [records, setRecords] = useState<TodayAttendance[]>([]);
  const [nameQuery, setNameQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadToday = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(API_URL, { headers: authHeaders() });
      if (!response.ok) throw new Error("Unable to load today's attendance.");
      setRecords((await response.json()) as TodayAttendance[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load today's attendance.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadToday();
  }, []);

  const summaryStats = useMemo(() => {
    const total = records.length;
    const present = records.filter((record) => record.live_status === "Clocked In" || record.live_status === "Clocked Out").length;
    const absent = records.filter((record) => record.live_status === "Absent").length;
    const late = records.filter((record) => record.status === "LATE").length;

    return [
      { id: "total", title: "Total Employees", value: String(total), icon: <IconUsers size={24} strokeWidth={1.5} />, bgColor: "bg-gradient-primary", textColor: "text-primary-emphasis", bottomValue: "", description: "Active workforce" },
      { id: "present", title: "Present Today", value: String(present), icon: <IconUserCheck size={24} strokeWidth={1.5} />, bgColor: "bg-gradient-success", textColor: "text-success-emphasis", bottomValue: total ? `${Math.round((present / total) * 100)}%` : "0%", description: "Checked in/out" },
      { id: "absent", title: "Absent Today", value: String(absent), icon: <IconUserOff size={24} strokeWidth={1.5} />, bgColor: "bg-gradient-danger", textColor: "text-danger-emphasis", bottomValue: "", description: "No check-in yet" },
      { id: "late", title: "Late Entries", value: String(late), icon: <IconUserExclamation size={24} strokeWidth={1.5} />, bgColor: "bg-gradient-warning", textColor: "text-warning-emphasis", bottomValue: "", description: "After cutoff" },
    ];
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const query = nameQuery.toLowerCase();
      const matchesSearch =
        !query ||
        record.employee_name.toLowerCase().includes(query) ||
        record.employee_email.toLowerCase().includes(query) ||
        record.employee_id.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "All" || record.live_status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [nameQuery, records, statusFilter]);

  return (
    <Fragment>
      <Row className="g-6 mb-6">
        <DashboardStats stats={summaryStats} />
      </Row>

      <Card className="border-0 shadow-sm mb-4">
        <CardBody>
          <Row className="align-items-end g-3">
            <Col md={5}>
              <Form.Group controlId="employeeNameSearch">
                <Form.Label>Search Employee</Form.Label>
                <Form.Control value={nameQuery} onChange={(event) => setNameQuery(event.target.value)} placeholder="Name, email, or employee ID" />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group controlId="statusFilter">
                <Form.Label>Status</Form.Label>
                <Form.Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="All">All</option>
                  <option value="Clocked In">Clocked In</option>
                  <option value="Clocked Out">Clocked Out</option>
                  <option value="Absent">Absent</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3} className="d-grid">
              <Button variant="outline-secondary" className="d-inline-flex align-items-center justify-content-center gap-2" onClick={loadToday}>
                <IconRefresh size={18} /> Refresh
              </Button>
            </Col>
          </Row>
        </CardBody>
      </Card>

      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-white">
          <h4 className="mb-0">Today's Live Status</h4>
        </Card.Header>
        <CardBody>
          {error && <div className="alert alert-danger">{error}</div>}
          <Table hover responsive className="text-nowrap align-middle">
            <thead className="table-light">
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Status</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Total Hours</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={6} className="text-center py-4 text-secondary">Loading attendance...</td></tr>}
              {!isLoading && filteredRecords.length === 0 && <tr><td colSpan={6} className="text-center py-4 text-secondary">No employees found.</td></tr>}
              {!isLoading && filteredRecords.map((record) => (
                <tr key={record.employee_uuid}>
                  <td>
                    <div className="d-flex align-items-center">
                      <img src={record.employee_avatar_url || "/images/avatar/avatar-fallback.jpg"} alt={record.employee_name} className="avatar avatar-sm rounded-circle me-3" />
                      <div>
                        <div className="fw-semibold">{record.employee_name}</div>
                        <small className="text-muted">{record.employee_id} - {record.employee_email}</small>
                      </div>
                    </div>
                  </td>
                  <td>{record.employee_department}</td>
                  <td><Badge bg={badgeClass(record.live_status)}>{record.live_status}</Badge></td>
                  <td>{formatTime(record.check_in)}</td>
                  <td>{formatTime(record.check_out)}</td>
                  <td>{record.total_hours || "-"}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardBody>
      </Card>
    </Fragment>
  );
};

export default TodaysAttendanceClient;
