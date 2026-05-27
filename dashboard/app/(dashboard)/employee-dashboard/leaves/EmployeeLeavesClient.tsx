"use client";

import React, { useEffect, useState } from "react";
import { Card, Button, Table, Badge, Modal, Form, Row, Col, Alert, Spinner } from "react-bootstrap";
import { IconCalendarPlus, IconCalendarEvent, IconMessage, IconInfoCircle, IconClock, IconCircleCheck, IconCircleX, IconEdit, IconTrash, IconBriefcase, IconHeart, IconUser, IconBook } from "@tabler/icons-react";
import Swal from "sweetalert2";

interface LeaveRequest {
  id: number;
  start_date: string;
  end_date: string;
  leave_type: string;
  leave_type_label: string;
  reason: string;
  status: string;
  status_label: string;
  admin_notes: string | null;
  created_at: string;
}

const EmployeeLeavesClient = () => {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingLeave, setEditingLeave] = useState<LeaveRequest | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [leaveType, setLeaveType] = useState("CASUAL");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchLeaves = async () => {
    setIsLoading(true);
    setError("");
    const token = localStorage.getItem("authToken");
    if (!token) {
      setError("Authorization credentials not found. Please sign in again.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_ENDPOINT}/api/v1/attendance/leaves/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to load leave requests.");
      const data = await res.json();
      const results = Array.isArray(data) ? data : data.results || [];
      setLeaves(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const resetFormAndCloseModal = () => {
    setShowModal(false);
    setEditingLeave(null);
    setStartDate("");
    setEndDate("");
    setLeaveType("CASUAL");
    setReason("");
  };

  const handleEdit = (leave: LeaveRequest) => {
    setEditingLeave(leave);
    setStartDate(leave.start_date);
    setEndDate(leave.end_date);
    setLeaveType(leave.leave_type);
    setReason(leave.reason);
    setShowModal(true);
  };

  const handleDelete = async (leaveId: number) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!"
    });

    if (result.isConfirmed) {
      const token = localStorage.getItem("authToken");
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_ENDPOINT}/api/v1/attendance/leaves/${leaveId}/`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Failed to delete leave request.");

        Swal.fire("Deleted!", "Your leave request has been deleted.", "success");
        fetchLeaves();
      } catch (err) {
        Swal.fire("Error!", err instanceof Error ? err.message : "An unknown error occurred.", "error");
      }
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!startDate || !endDate || !reason) {
      setError("Please fill out all required fields.");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setError("Start date cannot be after end date.");
      return;
    }

    const token = localStorage.getItem("authToken");
    if (!token) {
      setError("Authentication token expired. Please sign in.");
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingLeave
        ? `${process.env.NEXT_PUBLIC_API_ENDPOINT}/api/v1/attendance/leaves/${editingLeave.id}/`
        : `${process.env.NEXT_PUBLIC_API_ENDPOINT}/api/v1/attendance/leaves/`;
      
      const method = editingLeave ? "PUT" : "POST";

      const res = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          start_date: startDate,
          end_date: endDate,
          leave_type: leaveType,
          reason,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Unable to submit leave request.");
      }

      setSuccessMsg(editingLeave ? "Your leave request has been updated successfully!" : "Your leave request has been submitted successfully for HR review!");
      resetFormAndCloseModal();
      
      await fetchLeaves();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error submitting request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <Badge bg="success-subtle" className="text-success border border-success-subtle px-2.5 py-1 rounded-pill fw-semibold">Approved</Badge>;
      case "REJECTED":
        return <Badge bg="danger-subtle" className="text-danger border border-danger-subtle px-2.5 py-1 rounded-pill fw-semibold">Rejected</Badge>;
      default:
        return <Badge bg="warning-subtle" className="text-warning border border-warning-subtle px-2.5 py-1 rounded-pill fw-semibold">Pending Review</Badge>;
    }
  };

  const getLeaveTypeBadge = (type: string) => {
    switch (type) {
      case "SICK":
        return <Badge bg="danger-subtle" className="text-danger-emphasis px-2 py-1 rounded">Sick Leave</Badge>;
      case "ANNUAL":
        return <Badge bg="primary-subtle" className="text-primary-emphasis px-2 py-1 rounded">Annual Leave</Badge>;
      case "CASUAL":
        return <Badge bg="info-subtle" className="text-info-emphasis px-2 py-1 rounded">Casual Leave</Badge>;
      case "MATERNITY":
        return <Badge bg="pink-subtle" className="text-pink-emphasis px-2 py-1 rounded">Maternity Leave</Badge>;
      case "PATERNITY":
        return <Badge bg="blue-subtle" className="text-blue-emphasis px-2 py-1 rounded">Paternity Leave</Badge>;
      case "BEREAVEMENT":
        return <Badge bg="secondary-subtle" className="text-secondary-emphasis px-2 py-1 rounded">Bereavement Leave</Badge>;
      case "MARRIAGE":
        return <Badge bg="success-subtle" className="text-success-emphasis px-2 py-1 rounded">Marriage Leave</Badge>;
      case "STUDY":
        return <Badge bg="warning-subtle" className="text-warning-emphasis px-2 py-1 rounded">Study Leave</Badge>;
      default:
        return <Badge bg="secondary-subtle" className="text-secondary-emphasis px-2 py-1 rounded">Other</Badge>;
    }
  };

  const calculateDays = (start: string, end: string) => {
    const sDate = new Date(start);
    const eDate = new Date(end);
    const diffTime = Math.abs(eDate.getTime() - sDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  // Load company leave settings
  const [leaveSettings, setLeaveSettings] = useState(null);
  
  useEffect(() => {
    const fetchSettings = async () => {
      const token = localStorage.getItem("authToken");
      if (!token) return;
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_ENDPOINT}/api/v1/settings/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setLeaveSettings(data);
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      }
    };
    fetchSettings();
  }, []);

  // Calculate used leave days
  const usedAnnual = leaves.filter(l => l.leave_type === "ANNUAL" && l.status === "APPROVED").reduce((acc, l) => acc + calculateDays(l.start_date, l.end_date), 0);
  const usedSick = leaves.filter(l => l.leave_type === "SICK" && l.status === "APPROVED").reduce((acc, l) => acc + calculateDays(l.start_date, l.end_date), 0);
  const usedCasual = leaves.filter(l => l.leave_type === "CASUAL" && l.status === "APPROVED").reduce((acc, l) => acc + calculateDays(l.start_date, l.end_date), 0);

  // Metrics
  const totalRequested = leaves.length;
  const approvedLeaves = leaves.filter(l => l.status === "APPROVED").length;
  const pendingLeaves = leaves.filter(l => l.status === "PENDING").length;

  return (
    <div className="container-fluid px-0 py-4" style={{ minHeight: "85vh" }}>
      {/* Upper header action area */}
      <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: "16px", background: "linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)" }}>
        <Card.Body className="p-4 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div>
            <h3 className="fw-bold text-dark mb-1">Leave Requests</h3>
            <p className="text-secondary small mb-0">
              Apply for casual, annual, or medical leaves and track your approval status directly.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => setShowModal(true)}
            className="d-flex align-items-center gap-2 px-4 py-2.5 rounded-3 fw-semibold shadow-sm"
          >
            <IconCalendarPlus size={20} strokeWidth={2} />
            Apply For Leave
          </Button>
        </Card.Body>
      </Card>

      {/* Leave Balance Overview */}
      {leaveSettings && (
        <Card className="border-0 shadow-sm mb-4 rounded-4">
          <Card.Header className="bg-white border-0 py-3 px-4">
            <h5 className="fw-bold text-dark mb-0">Your Leave Balance</h5>
          </Card.Header>
          <Card.Body className="px-4 pb-4">
            <Row className="g-4">
              <Col md={4}>
                <div className="d-flex align-items-center justify-content-between p-3 bg-primary-subtle rounded-3">
                  <div>
                    <p className="text-primary small fw-semibold mb-1">Annual Leave</p>
                    <p className="text-primary mb-0"><strong>{leaveSettings.annual_paid_leave_days - usedAnnual}</strong> / {leaveSettings.annual_paid_leave_days} days left</p>
                  </div>
                  <IconBriefcase size={24} className="text-primary" />
                </div>
              </Col>
              <Col md={4}>
                <div className="d-flex align-items-center justify-content-between p-3 bg-danger-subtle rounded-3">
                  <div>
                    <p className="text-danger small fw-semibold mb-1">Sick Leave</p>
                    <p className="text-danger mb-0"><strong>{leaveSettings.sick_leave_days - usedSick}</strong> / {leaveSettings.sick_leave_days} days left</p>
                  </div>
                  <IconHeart size={24} className="text-danger" />
                </div>
              </Col>
              <Col md={4}>
                <div className="d-flex align-items-center justify-content-between p-3 bg-info-subtle rounded-3">
                  <div>
                    <p className="text-info small fw-semibold mb-1">Casual Leave</p>
                    <p className="text-info mb-0"><strong>{leaveSettings.casual_leave_days - usedCasual}</strong> / {leaveSettings.casual_leave_days} days left</p>
                  </div>
                  <IconUser size={24} className="text-info" />
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}

      {/* Metrics Row */}
      <Row className="mb-4 g-3">
        <Col xs={12} md={4}>
          <Card className="border-0 shadow-sm p-3 rounded-4 bg-white">
            <div className="d-flex align-items-center gap-3">
              <div className="p-3 bg-primary-subtle text-primary rounded-3">
                <IconCalendarEvent size={24} />
              </div>
              <div>
                <h5 className="text-secondary small fw-semibold mb-0">Total Leaves Requested</h5>
                <h3 className="fw-bold text-dark mb-0 mt-1">{totalRequested}</h3>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={12} md={4}>
          <Card className="border-0 shadow-sm p-3 rounded-4 bg-white">
            <div className="d-flex align-items-center gap-3">
              <div className="p-3 bg-success-subtle text-success rounded-3">
                <IconCircleCheck size={24} />
              </div>
              <div>
                <h5 className="text-secondary small fw-semibold mb-0">Approved Leaves</h5>
                <h3 className="fw-bold text-dark mb-0 mt-1">{approvedLeaves}</h3>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={12} md={4}>
          <Card className="border-0 shadow-sm p-3 rounded-4 bg-white">
            <div className="d-flex align-items-center gap-3">
              <div className="p-3 bg-warning-subtle text-warning rounded-3">
                <IconClock size={24} />
                <div>
                  <h5 className="text-secondary small fw-semibold mb-0">Pending HR Reviews</h5>
                  <h3 className="fw-bold text-dark mb-0 mt-1">{pendingLeaves}</h3>
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Alert Feedbacks */}
      {successMsg && <Alert variant="success" className="border-0 shadow-sm rounded-3 mb-4" onClose={() => setSuccessMsg("")} dismissible>{successMsg}</Alert>}
      {error && <Alert variant="danger" className="border-0 shadow-sm rounded-3 mb-4" onClose={() => setError("")} dismissible>{error}</Alert>}

      {/* Requests table card */}
      <Card className="border-0 shadow-sm" style={{ borderRadius: "16px", overflow: "hidden" }}>
        <Card.Header className="bg-white border-0 py-3 px-4 d-flex align-items-center justify-content-between">
          <h5 className="fw-bold text-dark mb-0">My Leave Applications</h5>
        </Card.Header>
        <Card.Body className="p-0">
          {isLoading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" className="mb-2" />
              <p className="text-secondary small mb-0">Loading leave requests...</p>
            </div>
          ) : leaves.length === 0 ? (
            <div className="text-center py-5 px-3">
              <IconInfoCircle size={40} className="text-muted mb-2" />
              <h5 className="fw-semibold text-dark-emphasis">No Leaves Found</h5>
              <p className="text-secondary small mb-0">You haven't requested any leaves yet. Click "Apply For Leave" to submit your first request.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="align-middle mb-0 custom-leaves-table">
                <thead className="table-light">
                  <tr className="small text-secondary-emphasis" style={{ fontSize: "0.78rem", textTransform: "uppercase", fontWeight: 600 }}>
                    <th className="px-4 py-3">Leave Type</th>
                    <th className="py-3">Leave Period</th>
                    <th className="py-3 text-center">Total Days</th>
                    <th className="py-3">Reason</th>
                    <th className="py-3">Status</th>
                    <th className="px-4 py-3">HR Remarks</th>
                    <th className="px-4 py-3 text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.map((leave) => {
                    const durationDays = calculateDays(leave.start_date, leave.end_date);
                    const startStr = new Date(leave.start_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
                    const endStr = new Date(leave.end_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
                    
                    return (
                      <tr key={leave.id} style={{ transition: "background-color 0.15s ease" }}>
                        <td className="px-4 py-3.5">
                          {getLeaveTypeBadge(leave.leave_type)}
                        </td>
                        <td className="py-3.5 fw-medium text-dark small">
                          {startStr} — {endStr}
                        </td>
                        <td className="py-3.5 text-center fw-bold text-dark-emphasis small">
                          {durationDays} {durationDays === 1 ? "day" : "days"}
                        </td>
                        <td className="py-3.5 text-secondary small text-truncate" style={{ maxWidth: "220px" }} title={leave.reason}>
                          {leave.reason}
                        </td>
                        <td className="py-3.5">
                          {getStatusBadge(leave.status)}
                        </td>
                        <td className="px-4 py-3.5">
                          {leave.admin_notes ? (
                            <span className="text-dark-emphasis small d-flex align-items-center gap-1.5">
                              <IconMessage size={14} className="text-secondary" />
                              {leave.admin_notes}
                            </span>
                          ) : (
                            <span className="text-muted small italic" style={{ fontSize: "0.78rem" }}>No remarks yet</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-end">
                          {leave.status === 'PENDING' && (
                            <div className="d-flex justify-content-end gap-2">
                              <Button variant="outline-secondary" size="sm" onClick={() => handleEdit(leave)}>
                                <IconEdit size={16} />
                              </Button>
                              <Button variant="outline-danger" size="sm" onClick={() => handleDelete(leave.id)}>
                                <IconTrash size={16} />
                              </Button>
                            </div>
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

      {/* Floating Apply Modal */}
      <Modal show={showModal} onHide={resetFormAndCloseModal} centered className="border-0 shadow-lg" size="lg">
        <Modal.Header closeButton className="border-0 px-4 pt-4 pb-2">
          <Modal.Title className="fw-bold text-dark">{editingLeave ? "Edit Leave Application" : "Submit Leave Application"}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body className="px-4 py-3">
            <Alert variant="info" className="border-0 shadow-sm d-flex align-items-center gap-2 rounded-3 small">
              <IconInfoCircle size={18} className="flex-shrink-0" />
              Your standard shifts are 10:00 AM – 06:00 PM. Leave requests must be approved by HR or Admin.
            </Alert>

            <Row className="g-3 mb-3">
              <Col xs={12} md={6}>
                <Form.Group controlId="leaveType">
                  <Form.Label className="small fw-semibold text-secondary mb-1">Leave Type *</Form.Label>
                  <Form.Select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value)}
                    className="form-control rounded-3 p-2.5"
                  >
                    <option value="CASUAL">Casual Leave</option>
                    <option value="SICK">Sick / Medical Leave</option>
                    <option value="ANNUAL">Annual Leave</option>
                    <option value="MATERNITY">Maternity Leave</option>
                    <option value="PATERNITY">Paternity Leave</option>
                    <option value="BEREAVEMENT">Bereavement Leave</option>
                    <option value="MARRIAGE">Marriage Leave</option>
                    <option value="STUDY">Study Leave</option>
                    <option value="OTHER">Other / Unpaid</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                {startDate && endDate && (
                  <div className="p-3 bg-light rounded-3 text-center border h-100 d-flex flex-column justify-content-center">
                    <span className="small text-secondary fw-semibold">Calculated Leave Duration:</span>
                    <h4 className="fw-bold text-primary mb-0 mt-1">
                      {calculateDays(startDate, endDate)} {calculateDays(startDate, endDate) === 1 ? "Day" : "Days"}
                    </h4>
                  </div>
                )}
              </Col>
            </Row>

            <Row className="g-3 mb-3">
              <Col xs={12} md={6}>
                <Form.Group controlId="startDate">
                  <Form.Label className="small fw-semibold text-secondary mb-1">Start Date *</Form.Label>
                  <Form.Control
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="form-control rounded-3 p-2.5"
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group controlId="endDate">
                  <Form.Label className="small fw-semibold text-secondary mb-1">End Date *</Form.Label>
                  <Form.Control
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="form-control rounded-3 p-2.5"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group controlId="reason" className="mb-2">
              <Form.Label className="small fw-semibold text-secondary mb-1">Reason for Leave *</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                required
                placeholder="Explain the reason for your leave request in detail..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="form-control rounded-3 p-3"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="border-0 px-4 pb-4 pt-2">
            <Button variant="outline-secondary" onClick={resetFormAndCloseModal} className="px-4 py-2.5 rounded-3 fw-semibold">
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmitting} className="px-4 py-2.5 rounded-3 fw-semibold">
              {isSubmitting ? (
                <>
                  <Spinner size="sm" animation="border" className="me-2" />
                  {editingLeave ? "Updating..." : "Submitting..."}
                </>
              ) : (
                editingLeave ? "Update Application" : "Submit Application"
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <style>{`
        .custom-leaves-table tbody tr:hover {
          background-color: #f9fafb !important;
        }
      `}</style>
    </div>
  );
};

export default EmployeeLeavesClient;