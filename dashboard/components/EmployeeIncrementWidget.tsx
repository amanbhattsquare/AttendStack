"use client";

import React, { useEffect, useState } from "react";
import { Card, Row, Col, Badge, Table, Spinner, Alert, ProgressBar } from "react-bootstrap";
import { IconTrendingUp, IconCalendarTime, IconCurrencyRupee, IconAward, IconCircleCheck } from "@tabler/icons-react";

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

export interface MyIncrementResponse {
  employee_id: string;
  full_name: string;
  joining_date: string;
  annual_salary: string | number;
  last_increment_date: string | null;
  next_increment_date: string | null;
  increment_enabled: boolean;
  increment_cycle_months: number;
  increment_type: "PERCENTAGE" | "FLAT_AMOUNT";
  increment_value: string | number;
  pending_increment: {
    id: number;
    due_date: string;
    current_salary: string;
    increment_type: string;
    increment_value: string;
    calculated_increment_amount: string;
    new_salary: string;
    status: string;
    status_display: string;
    rescheduled_date?: string | null;
    notes?: string;
  } | null;
  history: Array<{
    id: number;
    due_date: string;
    current_salary: string;
    increment_type: string;
    increment_value: string;
    calculated_increment_amount: string;
    new_salary: string;
    status: string;
    status_display: string;
    action_date?: string;
    notes?: string;
  }>;
}

const EmployeeIncrementWidget: React.FC = () => {
  const [data, setData] = useState<MyIncrementResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchMyIncrementData = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${BASE_URL}/payroll/increments/my-increment/`, { headers: authHeaders() });
        if (!res.ok) throw new Error("Failed to fetch your salary increment schedule.");
        const result = await res.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load increment status.");
      } finally {
        setLoading(false);
      }
    };

    fetchMyIncrementData();
  }, []);

  if (loading) {
    return (
      <Card className="border-0 shadow-sm my-4">
        <Card.Body className="text-center py-4">
          <Spinner animation="border" variant="primary" size="sm" />
          <span className="ms-2 text-muted small">Loading career growth & increment details...</span>
        </Card.Body>
      </Card>
    );
  }

  if (error || !data) {
    return null; // Silently skip if employee profile has no access
  }

  const currentSalNum = Number(data.annual_salary || 0);
  const pendingInc = data.pending_increment;

  // Calculate days remaining until next increment
  let daysRemaining: number | null = null;
  const targetDateStr = pendingInc?.due_date || data.next_increment_date;
  if (targetDateStr) {
    const target = new Date(targetDateStr);
    const today = new Date();
    const diffTime = target.getTime() - today.getTime();
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  return (
    <div className="employee-increment-section my-4">
      <Card className="border-0 shadow-sm overflow-hidden">
        <Card.Header className="bg-primary text-white py-3">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-2">
              <IconTrendingUp size={22} />
              <h5 className="mb-0 text-white fw-bold">Salary Increment & Growth Timeline</h5>
            </div>
            <Badge bg="light" text="primary" className="fw-semibold">
              {data.increment_cycle_months}-Month Review Cycle
            </Badge>
          </div>
        </Card.Header>

        <Card.Body className="p-4">
          <Row className="g-4 align-items-center">
            {/* Left Column: Key Stats */}
            <Col md={7}>
              <div className="d-flex flex-wrap gap-4 mb-3">
                <div>
                  <small className="text-muted text-uppercase d-block fw-semibold">Current Salary (Annual)</small>
                  <span className="fs-3 fw-bold text-dark">
                    ₹{currentSalNum.toLocaleString("en-IN")}
                  </span>
                </div>

                {pendingInc && (
                  <div>
                    <small className="text-muted text-uppercase d-block fw-semibold">Estimated New Salary</small>
                    <span className="fs-3 fw-bold text-success">
                      ₹{Number(pendingInc.new_salary).toLocaleString("en-IN")}
                    </span>
                    <small className="text-success fw-semibold ms-1">
                      (+{pendingInc.increment_type === "PERCENTAGE" ? `${pendingInc.increment_value}%` : `₹${pendingInc.increment_value}`})
                    </small>
                  </div>
                )}
              </div>

              <div className="p-3 bg-light rounded border">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="small text-muted fw-semibold">Next Increment Review Date</span>
                  <span className="fw-bold text-primary">{targetDateStr || "To be scheduled"}</span>
                </div>

                {daysRemaining !== null && (
                  <>
                    <ProgressBar
                      now={Math.max(0, Math.min(100, Math.round(100 - (daysRemaining / (data.increment_cycle_months * 30)) * 100)))}
                      variant={daysRemaining <= 30 ? "warning" : "primary"}
                      style={{ height: "8px" }}
                      className="mb-2"
                    />
                    <div className="small text-muted d-flex justify-content-between">
                      <span>Last Increment: {data.last_increment_date || data.joining_date || "Joining Date"}</span>
                      <span>
                        {daysRemaining <= 0
                          ? "Due for Review (Under Management Approval)"
                          : `${daysRemaining} days remaining`}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </Col>

            {/* Right Column: Status Banner */}
            <Col md={5}>
              {pendingInc ? (
                <div className="p-3 border border-primary-subtle rounded bg-primary-subtle">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <IconAward size={24} className="text-primary" />
                    <h6 className="fw-bold mb-0 text-primary">Upcoming Raise Evaluation</h6>
                  </div>
                  <p className="small text-secondary mb-2">
                    You are eligible for a <strong>{pendingInc.increment_type === "PERCENTAGE" ? `${pendingInc.increment_value}%` : `₹${pendingInc.increment_value}`}</strong> increment on <strong>{pendingInc.due_date}</strong>.
                  </p>
                  <div className="d-flex align-items-center gap-2">
                    <span className="badge bg-primary">
                      Status: {pendingInc.status_display}
                    </span>
                    {pendingInc.rescheduled_date && (
                      <span className="badge bg-warning text-dark">
                        Rescheduled to {pendingInc.rescheduled_date}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3 border rounded bg-light">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <IconCircleCheck size={24} className="text-success" />
                    <h6 className="fw-bold mb-0 text-dark">Company Increment Policy Active</h6>
                  </div>
                  <p className="small text-muted mb-0">
                    Your salary performance raise is scheduled automatically every {data.increment_cycle_months} months based on standard company HR guidelines.
                  </p>
                </div>
              )}
            </Col>
          </Row>

          {/* Past Increment History Table */}
          {data.history && data.history.length > 0 && (
            <div className="mt-4 pt-3 border-top">
              <h6 className="fw-bold mb-3">Increment History</h6>
              <div className="table-responsive">
                <Table hover size="sm" className="mb-0">
                  <thead className="table-light small text-uppercase text-secondary">
                    <tr>
                      <th>Effective Date</th>
                      <th>Previous Salary</th>
                      <th>Raise</th>
                      <th>Revised Salary</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.history.map((item) => (
                      <tr key={item.id}>
                        <td className="fw-semibold">{item.due_date}</td>
                        <td>₹{Number(item.current_salary).toLocaleString("en-IN")}</td>
                        <td>
                          <Badge bg="success" className="p-1 px-2">
                            {item.increment_type === "PERCENTAGE" ? `+${item.increment_value}%` : `+₹${item.increment_value}`}
                          </Badge>
                        </td>
                        <td className="fw-bold text-success">
                          ₹{Number(item.new_salary).toLocaleString("en-IN")}
                        </td>
                        <td>
                          <Badge bg={item.status === "APPROVED" ? "success" : item.status === "REJECTED" ? "danger" : "secondary"}>
                            {item.status_display}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default EmployeeIncrementWidget;
