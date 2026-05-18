"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, CardBody, CardHeader, Col, Form, Modal, Row, Table } from "react-bootstrap";
import { IconPencil, IconRefresh, IconTrash } from "@tabler/icons-react";
import CustomPagination from "components/shared/CustomPagination";

type AttendanceRecord = {
  id: number;
  employee_id: string;
  employee_name: string;
  employee_email: string;
  employee_department: string;
  employee_avatar_url: string | null;
  date: string;
  check_in: string | null;
  check_out: string | null;
  total_hours: string | null;
  status: string;
  status_label: string;
  live_status: string;
};

type AttendanceListResponse = AttendanceRecord[] | {
  results: AttendanceRecord[];
};

type EmployeeSummary = {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  present: number;
  late: number;
  absent: number;
  halfDay: number;
};

const API_URL = "http://127.0.0.1:8000/api/v1/attendance/";
const recordsPerPage = 20;

const authHeaders = (): HeadersInit => {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));

const formatTime = (value?: string | null) =>
  value ? new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "--";

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

const monthOptions = [
  { value: 1, name: "January" },
  { value: 2, name: "February" },
  { value: 3, name: "March" },
  { value: 4, name: "April" },
  { value: 5, name: "May" },
  { value: 6, name: "June" },
  { value: 7, name: "July" },
  { value: 8, name: "August" },
  { value: 9, name: "September" },
  { value: 10, name: "October" },
  { value: 11, name: "November" },
  { value: 12, name: "December" },
];

const AttendanceRecordsClient = () => {
  const today = new Date();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [nameQuery, setNameQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<AttendanceRecord | null>(null);

  const handleUpdateRecord = async (updatedRecord: AttendanceRecord) => {
    try {
      const response = await fetch(`${API_URL}${updatedRecord.id}/`, {
        method: "PUT",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedRecord),
      });

      if (!response.ok) {
        throw new Error("Failed to update the record.");
      }

      setEditingRecord(null);
      loadRecords();
    } catch (error) {
      setError(error instanceof Error ? error.message : "An unknown error occurred.");
    }
  };

  const handleSaveChanges = () => {
    if (!editingRecord) return;

    const form = document.querySelector("#edit-attendance-form") as HTMLFormElement;
    const updatedRecord: AttendanceRecord = {
      ...editingRecord,
      check_in: form.checkin.value,
      check_out: form.checkout.value,
      status: form.status.value,
    };

    handleUpdateRecord(updatedRecord);
  };

  const handleDeleteRecord = async () => {
    if (!deletingRecord) return;

    try {
      const response = await fetch(`${API_URL}${deletingRecord.id}/`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to delete the record.");
      }

      setDeletingRecord(null);
      loadRecords();
    } catch (error) {
      setError(error instanceof Error ? error.message : "An unknown error occurred.");
    }
  };

  const loadRecords = async () => {
    setIsLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        year: String(selectedYear),
        month: String(selectedMonth),
      });
      if (selectedDay !== "All") params.set("day", selectedDay);
      if (statusFilter !== "All") params.set("status", statusFilter);
      if (nameQuery.trim()) params.set("search", nameQuery.trim());

      const response = await fetch(`${API_URL}?${params.toString()}`, { headers: authHeaders() });
      if (!response.ok) throw new Error("Unable to load attendance records.");

      const data = (await response.json()) as AttendanceListResponse;
      setRecords(Array.isArray(data) ? data : data.results);
      setCurrentPage(1);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load attendance records.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [selectedYear, selectedMonth, selectedDay, statusFilter]);

  const employeeSummary = useMemo(() => {
    const summary: Record<string, EmployeeSummary> = {};
    records.forEach((record) => {
      if (!summary[record.employee_id]) {
        summary[record.employee_id] = {
          id: record.employee_id,
          name: record.employee_name,
          email: record.employee_email,
          avatar: record.employee_avatar_url,
          present: 0,
          late: 0,
          absent: 0,
          halfDay: 0,
        };
      }
      if (record.status === "PRESENT") summary[record.employee_id].present += 1;
      if (record.status === "LATE") summary[record.employee_id].late += 1;
      if (record.status === "ABSENT") summary[record.employee_id].absent += 1;
      if (record.status === "HALF_DAY") summary[record.employee_id].halfDay += 1;
    });
    return Object.values(summary);
  }, [records]);

  const currentRecords = useMemo(() => {
    const first = (currentPage - 1) * recordsPerPage;
    return records.slice(first, first + recordsPerPage);
  }, [currentPage, records]);

  const years = Array.from({ length: 5 }, (_, index) => today.getFullYear() - index);
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);
  const totalPages = Math.ceil(records.length / recordsPerPage);

  return (
    <Fragment>
      <Card className="border-0 shadow-sm mb-4">
        <CardBody>
          <Row className="align-items-end g-3">
            <Col md={2}>
              <Form.Group controlId="yearFilter">
                <Form.Label>Year</Form.Label>
                <Form.Select value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))}>
                  {years.map((year) => <option key={year} value={year}>{year}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group controlId="monthFilter">
                <Form.Label>Month</Form.Label>
                <Form.Select value={selectedMonth} onChange={(event) => setSelectedMonth(Number(event.target.value))}>
                  {monthOptions.map((month) => <option key={month.value} value={month.value}>{month.name}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group controlId="dayFilter">
                <Form.Label>Day</Form.Label>
                <Form.Select value={selectedDay} onChange={(event) => setSelectedDay(event.target.value)}>
                  <option value="All">All</option>
                  {days.map((day) => <option key={day} value={day}>{day}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group controlId="employeeSearch">
                <Form.Label>Employee</Form.Label>
                <Form.Control value={nameQuery} onChange={(event) => setNameQuery(event.target.value)} placeholder="Name, ID, or email" />
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group controlId="statusFilter">
                <Form.Label>Status</Form.Label>
                <Form.Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="All">All</option>
                  <option value="PRESENT">Present</option>
                  <option value="LATE">Late Entry</option>
                  <option value="HALF_DAY">Half-day</option>
                  <option value="ABSENT">Absent</option>
                  <option value="ON_LEAVE">On Leave</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={1} className="d-grid">
              <Button variant="primary" onClick={loadRecords}><IconRefresh size={20} /></Button>
            </Col>
          </Row>
        </CardBody>
      </Card>

      <Card className="border-0 shadow-sm mb-4">
        <CardHeader className="bg-white">
          <h4 className="mb-0">Monthly Employee Summary</h4>
        </CardHeader>
        <CardBody>
          <Table hover responsive className="text-nowrap align-middle">
            <thead className="table-light">
              <tr>
                <th>Employee</th>
                <th className="text-center">Present</th>
                <th className="text-center">Late</th>
                <th className="text-center">Half Days</th>
                <th className="text-center">Absent</th>
              </tr>
            </thead>
            <tbody>
              {employeeSummary.length === 0 && <tr><td colSpan={5} className="text-center py-4 text-secondary">No summary available for selected filters.</td></tr>}
              {employeeSummary.map((summary) => (
                <tr key={summary.id}>
                  <td>
                    <div className="d-flex align-items-center">
                      <img src={summary.avatar || "/images/avatar/avatar-fallback.jpg"} alt={summary.name} className="avatar avatar-sm rounded-circle me-3" />
                      <div>
                        <div className="fw-semibold">{summary.name}</div>
                        <small className="text-muted">{summary.id} - {summary.email}</small>
                      </div>
                    </div>
                  </td>
                  <td className="text-center">{summary.present}</td>
                  <td className="text-center">{summary.late}</td>
                  <td className="text-center">{summary.halfDay}</td>
                  <td className="text-center">{summary.absent}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardBody>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="bg-white d-flex justify-content-between align-items-center">
          <h4 className="mb-0">Detailed Daily Log</h4>
          <Button variant="primary" size="sm">Mark Attendance</Button>
        </CardHeader>
        <CardBody>
          {error && <div className="alert alert-danger">{error}</div>}
          <Table hover responsive className="text-nowrap align-middle">
            <thead className="table-light">
              <tr>
                <th>Date</th>
                <th>Employee</th>
                <th>Department</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={8} className="text-center py-4 text-secondary">Loading records...</td></tr>}
              {!isLoading && currentRecords.length === 0 && <tr><td colSpan={8} className="text-center py-4 text-secondary">No attendance records found.</td></tr>}
              {!isLoading && currentRecords.map((record) => (
                <tr key={record.id}>
                  <td>{formatDate(record.date)}</td>
                  <td>
                    <div className="d-flex align-items-center">
                      <img src={record.employee_avatar_url || "/images/avatar/avatar-fallback.jpg"} alt={record.employee_name} className="avatar avatar-sm rounded-circle me-3" />
                      <div>
                        <div className="fw-semibold">{record.employee_name}</div>
                        <small className="text-muted">{record.employee_id}</small>
                      </div>
                    </div>
                  </td>
                  <td>{record.employee_department}</td>
                  <td>{formatTime(record.check_in)}</td>
                  <td>{formatTime(record.check_out)}</td>
                  <td><Badge bg={getStatusBadge(record.status)}>{record.status_label}</Badge></td>
                  <td className="text-end">
                    <Button variant="white" size="sm" className="btn-icon" onClick={() => setEditingRecord(record)}>
                      <IconPencil size={16} />
                    </Button>
                    <Button variant="white" size="sm" className="btn-icon" onClick={() => setDeletingRecord(record)}>
                      <IconTrash size={16} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <CustomPagination currentPage={currentPage} totalPages={totalPages || 1} onPageChange={setCurrentPage} />
        </CardBody>
      </Card>

      {editingRecord && (
        <Modal show={!!editingRecord} onHide={() => setEditingRecord(null)}>
          <Modal.Header closeButton>
            <Modal.Title>Edit Attendance</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form id="edit-attendance-form">
              <Form.Group className="mb-3" controlId="formCheckIn">
                <Form.Label>Check In</Form.Label>
                <Form.Control name="checkin" type="time" defaultValue={editingRecord.check_in ? new Date(editingRecord.check_in).toTimeString().slice(0, 5) : ""} />
              </Form.Group>
              <Form.Group className="mb-3" controlId="formCheckOut">
                <Form.Label>Check Out</Form.Label>
                <Form.Control name="checkout" type="time" defaultValue={editingRecord.check_out ? new Date(editingRecord.check_out).toTimeString().slice(0, 5) : ""} />
              </Form.Group>
              <Form.Group className="mb-3" controlId="formStatus">
                <Form.Label>Status</Form.Label>
                <Form.Select name="status" defaultValue={editingRecord.status}>
                  <option value="PRESENT">Present</option>
                  <option value="LATE">Late Entry</option>
                  <option value="HALF_DAY">Half-day</option>
                  <option value="ABSENT">Absent</option>
                  <option value="ON_LEAVE">On Leave</option>
                </Form.Select>
              </Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setEditingRecord(null)}>
              Close
            </Button>
            <Button variant="primary" onClick={handleSaveChanges}>
              Save Changes
            </Button>
          </Modal.Footer>
        </Modal>
      )}

      {deletingRecord && (
        <Modal show={!!deletingRecord} onHide={() => setDeletingRecord(null)}>
          <Modal.Header closeButton>
            <Modal.Title>Delete Attendance</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>Are you sure you want to delete this attendance record?</p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setDeletingRecord(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteRecord}>
              Delete
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </Fragment>
  );
};

export default AttendanceRecordsClient;