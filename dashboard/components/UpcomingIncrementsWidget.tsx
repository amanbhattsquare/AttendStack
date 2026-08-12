"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Card, Table, Badge, Button, Modal, Form, Spinner, Row, Col, Alert } from "react-bootstrap";
import { IconTrendingUp, IconCheck, IconX, IconCalendarTime, IconCurrencyRupee, IconRefresh } from "@tabler/icons-react";
import Swal from "sweetalert2";

const BASE_URL = `${process.env.NEXT_PUBLIC_API_ENDPOINT}/api/v1`;

const authHeaders = (): HeadersInit => {
  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  return token
    ? {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      }
    : { "Content-Type": "application/json" };
};

export interface EmployeeIncrementItem {
  id: number;
  employee: string;
  employee_details: {
    id: string;
    employee_id: string;
    full_name: string;
    email: string;
    department: string;
    designation: string;
    annual_salary: string;
    profile_photo_url: string | null;
  };
  due_date: string;
  current_salary: string;
  increment_type: "PERCENTAGE" | "FLAT_AMOUNT";
  increment_type_display: string;
  increment_value: string;
  calculated_increment_amount: string;
  new_salary: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "RESCHEDULED";
  status_display: string;
  rescheduled_date?: string | null;
  action_date?: string | null;
  notes?: string;
}

export interface IncrementSummary {
  pending_count: number;
  due_this_month: number;
  due_next_month?: number;
  this_month_name?: string;
  next_month_name?: string;
  approved_this_year: number;
}

const UpcomingIncrementsWidget: React.FC = () => {
  const [increments, setIncrements] = useState<EmployeeIncrementItem[]>([]);
  const [summary, setSummary] = useState<IncrementSummary>({
    pending_count: 0,
    due_this_month: 0,
    due_next_month: 0,
    this_month_name: "",
    next_month_name: "",
    approved_this_year: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  // Reschedule Modal State
  const [showRescheduleModal, setShowRescheduleModal] = useState<boolean>(false);
  const [selectedIncrement, setSelectedIncrement] = useState<EmployeeIncrementItem | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>("");
  const [actionNotes, setActionNotes] = useState<string>("");
  const [submittingAction, setSubmittingAction] = useState<boolean>(false);

  // Reject Modal State
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);

  const fetchIncrements = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // 1. Fetch Summary
      const summaryRes = await fetch(`${BASE_URL}/payroll/increments/summary/`, { headers: authHeaders() });
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setSummary(summaryData);
      }

      // 2. Fetch Increments List
      let listUrl = `${BASE_URL}/payroll/increments/`;
      if (filterStatus === "NEXT_MONTH") {
        listUrl = `${BASE_URL}/payroll/increments/?due=next_month`;
      } else if (filterStatus === "THIS_MONTH") {
        listUrl = `${BASE_URL}/payroll/increments/?due=this_month`;
      } else if (filterStatus) {
        listUrl = `${BASE_URL}/payroll/increments/?status=${filterStatus}`;
      }

      const res = await fetch(listUrl, { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to load employee increments.");
      const data = await res.json();
      setIncrements(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load increments.");
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchIncrements();
  }, [fetchIncrements]);

  // Handle Accept / Approve
  const handleApprove = (inc: EmployeeIncrementItem) => {
    const isAnnual = Number(inc.current_salary) > 50000;
    const monthlyCurrent = isAnnual ? Math.round(Number(inc.current_salary) / 12) : Number(inc.current_salary);
    const monthlyNew = isAnnual ? Math.round(Number(inc.new_salary) / 12) : Number(inc.new_salary);
    const monthlyRaise = isAnnual ? Math.round(Number(inc.calculated_increment_amount) / 12) : Number(inc.calculated_increment_amount);

    const formattedAmount = monthlyRaise.toLocaleString("en-IN");
    const formattedNewSal = monthlyNew.toLocaleString("en-IN");

    Swal.fire({
      title: "Approve Salary Increment?",
      html: `
        <div style="text-align: left; font-size: 14px;">
          <p><strong>Employee:</strong> ${inc.employee_details?.full_name} (${inc.employee_details?.employee_id})</p>
          <p><strong>Current Monthly Salary:</strong> ₹${monthlyCurrent.toLocaleString("en-IN")} / month</p>
          <p><strong>Raise:</strong> ${inc.increment_type === "PERCENTAGE" ? `${inc.increment_value}% (+₹${formattedAmount}/mo)` : `+₹${formattedAmount}/mo`}</p>
          <p style="color: #198754; font-weight: bold; font-size: 16px;">New Salary: ₹${formattedNewSal} / month</p>
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#198754",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Yes, Approve & Update Salary",
      cancelButtonText: "Cancel",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await fetch(`${BASE_URL}/payroll/increments/${inc.id}/approve/`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({ notes: "Approved by Admin" }),
          });

          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.detail || "Failed to approve increment.");
          }

          Swal.fire({
            icon: "success",
            title: "Increment Approved!",
            text: `${inc.employee_details?.full_name}'s annual salary has been updated to ₹${formattedNewSal}.`,
            timer: 3000,
            showConfirmButton: false,
          });

          fetchIncrements();
        } catch (err) {
          Swal.fire("Error", err instanceof Error ? err.message : "Failed to approve increment.", "error");
        }
      }
    });
  };

  // Open Reject Modal
  const openRejectModal = (inc: EmployeeIncrementItem) => {
    setSelectedIncrement(inc);
    setActionNotes("");
    setShowRejectModal(true);
  };

  // Submit Reject
  const handleConfirmReject = async () => {
    if (!selectedIncrement) return;
    setSubmittingAction(true);
    try {
      const res = await fetch(`${BASE_URL}/payroll/increments/${selectedIncrement.id}/reject/`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ notes: actionNotes }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to reject increment.");
      }

      setShowRejectModal(false);
      Swal.fire("Rejected", "The increment record has been rejected.", "info");
      fetchIncrements();
    } catch (err) {
      Swal.fire("Error", err instanceof Error ? err.message : "Failed to reject increment.", "error");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Open Reschedule Modal
  const openRescheduleModal = (inc: EmployeeIncrementItem) => {
    setSelectedIncrement(inc);
    setRescheduleDate(inc.due_date || "");
    setActionNotes(inc.notes || "");
    setShowRescheduleModal(true);
  };

  // Submit Reschedule
  const handleConfirmReschedule = async () => {
    if (!selectedIncrement || !rescheduleDate) return;
    setSubmittingAction(true);
    try {
      const res = await fetch(`${BASE_URL}/payroll/increments/${selectedIncrement.id}/reschedule/`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          rescheduled_date: rescheduleDate,
          notes: actionNotes,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to reschedule increment.");
      }

      setShowRescheduleModal(false);
      Swal.fire("Rescheduled", `Increment due date moved to ${rescheduleDate}.`, "success");
      fetchIncrements();
    } catch (err) {
      Swal.fire("Error", err instanceof Error ? err.message : "Failed to reschedule increment.", "error");
    } finally {
      setSubmittingAction(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <Badge bg="success">Approved</Badge>;
      case "REJECTED":
        return <Badge bg="danger">Rejected</Badge>;
      case "RESCHEDULED":
        return <Badge bg="warning" text="dark">Rescheduled</Badge>;
      default:
        return <Badge bg="primary">Pending Review</Badge>;
    }
  };

  return (
    <div className="upcoming-increments-section my-4">
      {/* Metric Cards Grid */}
      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} xl={3}>
          <Card
            className="border-0 shadow-sm text-white h-100"
            style={{ background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)", cursor: "pointer" }}
            onClick={() => setFilterStatus("PENDING")}
          >
            <Card.Body className="d-flex align-items-center justify-content-between p-3">
              <div>
                <span className="text-white-50 small fw-semibold text-uppercase">Pending Review</span>
                <h3 className="mb-0 fw-bold mt-1 text-white">{summary.pending_count}</h3>
              </div>
              <div className="rounded-circle bg-white bg-opacity-20 p-2.5 d-flex align-items-center justify-content-center">
                <IconTrendingUp size={22} className="text-white" />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} xl={3}>
          <Card
            className="border-0 shadow-sm text-white h-100 position-relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, #0d9488 0%, #059669 100%)", cursor: "pointer" }}
            onClick={() => setFilterStatus("NEXT_MONTH")}
          >
            <Card.Body className="d-flex align-items-center justify-content-between p-3">
              <div>
                <span className="text-white-50 small fw-semibold text-uppercase">
                  Due Next Month {summary.next_month_name ? `(${summary.next_month_name})` : ""}
                </span>
                <h3 className="mb-0 fw-bold mt-1 text-white">{summary.due_next_month ?? 0}</h3>
              </div>
              <div className="rounded-circle bg-white bg-opacity-25 p-2.5 d-flex align-items-center justify-content-center">
                <IconCalendarTime size={22} className="text-white" />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} xl={3}>
          <Card
            className="border-0 shadow-sm text-dark h-100"
            style={{ background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", cursor: "pointer" }}
            onClick={() => setFilterStatus("THIS_MONTH")}
          >
            <Card.Body className="d-flex align-items-center justify-content-between p-3">
              <div>
                <span className="text-white-50 small fw-semibold text-uppercase">Due This Month</span>
                <h3 className="mb-0 fw-bold mt-1 text-white">{summary.due_this_month}</h3>
              </div>
              <div className="rounded-circle bg-white bg-opacity-25 p-2.5 d-flex align-items-center justify-content-center">
                <IconCalendarTime size={22} className="text-white" />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} xl={3}>
          <Card
            className="border-0 shadow-sm text-white h-100"
            style={{ background: "linear-gradient(135deg, #10b981 0%, #047857 100%)", cursor: "pointer" }}
            onClick={() => setFilterStatus("APPROVED")}
          >
            <Card.Body className="d-flex align-items-center justify-content-between p-3">
              <div>
                <span className="text-white-50 small fw-semibold text-uppercase">Approved (Year)</span>
                <h3 className="mb-0 fw-bold mt-1 text-white">{summary.approved_this_year}</h3>
              </div>
              <div className="rounded-circle bg-white bg-opacity-20 p-2.5 d-flex align-items-center justify-content-center">
                <IconCurrencyRupee size={22} className="text-white" />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Main Table Card */}
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-white py-3 border-0 d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div className="d-flex align-items-center gap-2">
            <IconTrendingUp size={22} className="text-primary" />
            <div>
              <h5 className="mb-0 fw-bold">Employee Salary Increment Management</h5>
              <small className="text-muted">
                {filterStatus === "NEXT_MONTH"
                  ? `Showing employees with increments scheduled for next month (${summary.next_month_name || "Next Month"})`
                  : filterStatus === "THIS_MONTH"
                  ? `Showing employees with increments scheduled for this month (${summary.this_month_name || "This Month"})`
                  : "Track, approve, reject or reschedule upcoming employee salary raises"}
              </small>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            {/* Filter Dropdown */}
            <Form.Select
              size="sm"
              style={{ width: "210px" }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Increments</option>
              <option value="NEXT_MONTH">Due Next Month {summary.next_month_name ? `(${summary.next_month_name})` : ""}</option>
              <option value="THIS_MONTH">Due This Month</option>
              <option value="PENDING">Pending Review (All)</option>
              <option value="RESCHEDULED">Rescheduled</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </Form.Select>

            <Button variant="outline-secondary" size="sm" onClick={fetchIncrements} disabled={loading}>
              <IconRefresh size={16} className={loading ? "spin" : ""} />
            </Button>
          </div>
        </Card.Header>

        <Card.Body className="p-0">
          {error && <Alert variant="danger" className="m-3">{error}</Alert>}

          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="text-muted mt-2 mb-0 small">Checking employee increment schedules...</p>
            </div>
          ) : increments.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <IconTrendingUp size={40} className="mb-2 text-secondary opacity-50" />
              <p className="mb-0 fw-semibold">No {filterStatus.toLowerCase()} increments found.</p>
              <small>Salary increments will appear automatically when due based on employee joining date or company policy.</small>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover size="sm" className="align-middle mb-0">
                <thead className="table-light text-secondary small text-uppercase">
                  <tr>
                    <th>Employee</th>
                    <th>Current Salary</th>
                    <th>Proposed Raise</th>
                    <th>New Salary</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {increments.map((inc) => {
                    const emp = inc.employee_details;
                    const isPending = inc.status === "PENDING" || inc.status === "RESCHEDULED";
                    const isAnnual = Number(inc.current_salary) > 50000;
                    const monthlyCurrent = isAnnual ? Math.round(Number(inc.current_salary) / 12) : Number(inc.current_salary);
                    const monthlyNew = isAnnual ? Math.round(Number(inc.new_salary) / 12) : Number(inc.new_salary);
                    const monthlyRaiseAmount = isAnnual ? Math.round(Number(inc.calculated_increment_amount) / 12) : Number(inc.calculated_increment_amount);

                    return (
                      <tr key={inc.id}>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            {emp?.profile_photo_url ? (
                              <img
                                src={emp.profile_photo_url}
                                alt={emp.full_name}
                                className="rounded-circle"
                                style={{ width: "36px", height: "36px", objectFit: "cover" }}
                              />
                            ) : (
                              <div
                                className="rounded-circle bg-primary bg-opacity-10 text-primary fw-bold d-flex align-items-center justify-content-center"
                                style={{ width: "36px", height: "36px" }}
                              >
                                {emp?.full_name?.charAt(0) || "E"}
                              </div>
                            )}
                            <div>
                              <div className="fw-bold text-dark">{emp?.full_name || "Employee"}</div>
                              <small className="text-muted">
                                {emp?.employee_id} &bull; {emp?.department || "N/A"}
                              </small>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="fw-semibold text-dark">
                            ₹{monthlyCurrent.toLocaleString("en-IN")}
                          </div>
                          <small className="text-muted">monthly</small>
                        </td>

                        <td>
                          <Badge bg="success" className="p-2">
                            {inc.increment_type === "PERCENTAGE"
                              ? `+${inc.increment_value}%`
                              : `+₹${monthlyRaiseAmount.toLocaleString("en-IN")}`}
                          </Badge>
                          <div className="small text-muted mt-1">
                            +₹{monthlyRaiseAmount.toLocaleString("en-IN")}/mo
                          </div>
                        </td>

                        <td>
                          <div className="fw-bold text-success">
                            ₹{monthlyNew.toLocaleString("en-IN")}
                          </div>
                          <small className="text-muted">monthly</small>
                        </td>

                        <td>
                          <div className="fw-semibold">{inc.due_date}</div>
                          {inc.rescheduled_date && (
                            <small className="text-warning d-block">
                              Rescheduled to {inc.rescheduled_date}
                            </small>
                          )}
                        </td>

                        <td>{getStatusBadge(inc.status)}</td>

                        <td className="text-end">
                          {isPending ? (
                            <div className="d-flex justify-content-end gap-1">
                              <Button
                                variant="success"
                                size="sm"
                                className="p-1 px-2 d-inline-flex align-items-center justify-content-center"
                                onClick={() => handleApprove(inc)}
                                title="Accept & Apply Increment"
                              >
                                <IconCheck size={16} />
                              </Button>

                              <Button
                                variant="outline-warning"
                                size="sm"
                                className="p-1 px-2 d-inline-flex align-items-center justify-content-center"
                                onClick={() => openRescheduleModal(inc)}
                                title="Reschedule Due Date"
                              >
                                <IconCalendarTime size={16} />
                              </Button>

                              <Button
                                variant="outline-danger"
                                size="sm"
                                className="p-1 px-2 d-inline-flex align-items-center justify-content-center"
                                onClick={() => openRejectModal(inc)}
                                title="Reject Increment"
                              >
                                <IconX size={16} />
                              </Button>
                            </div>
                          ) : (
                            <small className="text-muted">
                              {inc.notes ? `Note: ${inc.notes}` : "Completed"}
                            </small>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Reschedule Modal */}
      <Modal show={showRescheduleModal} onHide={() => setShowRescheduleModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">Reschedule Salary Increment</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted small">
            Select a new target date for <strong>{selectedIncrement?.employee_details?.full_name}</strong>'s salary increment.
          </p>
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold">New Due Date</Form.Label>
            <Form.Control
              type="date"
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold">Notes / Reason for Rescheduling</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="E.g., Performance review postponed to next month."
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRescheduleModal(false)} disabled={submittingAction}>
            Cancel
          </Button>
          <Button variant="warning" onClick={handleConfirmReschedule} disabled={submittingAction || !rescheduleDate}>
            {submittingAction ? <Spinner size="sm" /> : "Save Rescheduled Date"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Reject Modal */}
      <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold text-danger">Reject Salary Increment</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted small">
            Are you sure you want to reject the upcoming increment for <strong>{selectedIncrement?.employee_details?.full_name}</strong>?
          </p>
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold">Rejection Reason / Remarks</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="Enter reason for rejecting this cycle's increment..."
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRejectModal(false)} disabled={submittingAction}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirmReject} disabled={submittingAction}>
            {submittingAction ? <Spinner size="sm" /> : "Confirm Rejection"}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default UpcomingIncrementsWidget;
