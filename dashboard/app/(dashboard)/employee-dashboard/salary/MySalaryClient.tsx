"use client";

import { Fragment, useState, useEffect } from "react";
import { IconDownload, IconPrinter } from "@tabler/icons-react";
import { Spinner, Alert, Badge, Table, Button, Modal, Row, Col } from "react-bootstrap";

const BASE_URL = `${process.env.NEXT_PUBLIC_API_ENDPOINT}/api/v1/payroll/`;

const authHeaders = (): HeadersInit => {
  const token = localStorage.getItem("authToken");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const formatCurrency = (val: number | string) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(val));

const MySalaryClient = () => {
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [employeeProfile, setEmployeeProfile] = useState<any | null>(null);

  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [payslipData, setPayslipData] = useState<any | null>(null);

  // Load employee profile from localStorage to render CTC details
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        setEmployeeProfile(parsed);
      } catch (err) {
        console.error("Failed to parse user session.", err);
      }
    }
  }, []);

  // Fetch only this employee's payrolls
  const fetchMyPayrolls = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(BASE_URL, { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to load your payroll history.");
      const data = await res.json();
      setPayrolls(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payrolls.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyPayrolls();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const annualSalary = payrolls[0]?.employee_details?.annual_salary || 0;
  const monthlyEst = annualSalary ? Number(annualSalary) / 12 : 0;

  return (
    <Fragment>
      <div className="card border-0 shadow-sm mb-5">
        <div className="card-header bg-white border-bottom-0 pt-4 pb-0">
          <h4 className="mb-0 fw-bold text-dark">My Salary & Pay History</h4>
          <p className="text-secondary small mb-0">View your current salary profile and download monthly payslip summaries.</p>
        </div>
        <div className="card-body">
          {error && <Alert variant="danger">{error}</Alert>}

          <Row className="g-4 mb-4">
            <Col md={4}>
              <div className="p-3 border rounded bg-light-subtle">
                <span className="text-muted d-block small fw-semibold text-uppercase mb-1">Annual CTC</span>
                <strong className="fs-4 text-dark">
                  {annualSalary ? formatCurrency(annualSalary) : "Fetching profile..."}
                </strong>
              </div>
            </Col>
            <Col md={4}>
              <div className="p-3 border rounded bg-light-subtle">
                <span className="text-muted d-block small fw-semibold text-uppercase mb-1">Estimated Monthly Basic</span>
                <strong className="fs-4 text-dark">
                  {monthlyEst ? formatCurrency(monthlyEst) : "Fetching profile..."}
                </strong>
              </div>
            </Col>
            <Col md={4}>
              <div className="p-3 border rounded bg-light-subtle">
                <span className="text-muted d-block small fw-semibold text-uppercase mb-1">Pay Frequency</span>
                <strong className="fs-4 text-primary">Monthly</strong>
              </div>
            </Col>
          </Row>

          <hr className="my-4 text-muted opacity-25" />

          <h5 className="fw-bold text-dark mb-3">Recent Salary Statements</h5>
          
          <div className="table-responsive">
            {isLoading ? (
              <div className="d-flex justify-content-center align-items-center py-5">
                <Spinner animation="border" variant="primary" role="status">
                  <span className="visually-hidden">Loading Statements...</span>
                </Spinner>
              </div>
            ) : payrolls.length === 0 ? (
              <div className="text-center py-5 text-secondary border rounded bg-light-subtle">
                No salary statements have been generated for your profile yet.
              </div>
            ) : (
              <Table hover responsive className="align-middle text-nowrap mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Payroll Period</th>
                    <th>Basic Salary</th>
                    <th>Allowances</th>
                    <th>Deductions</th>
                    <th>Net Payout</th>
                    <th>Status</th>
                    <th className="text-end">Statement</th>
                  </tr>
                </thead>
                <tbody>
                  {payrolls.map((p) => (
                    <tr key={p.id}>
                      <td className="fw-semibold text-dark">
                        {p.month_name} {p.year}
                      </td>
                      <td>{formatCurrency(p.basic_salary)}</td>
                      <td>{formatCurrency(p.allowances)}</td>
                      <td className="text-danger">-{formatCurrency(p.deductions)}</td>
                      <td className="fw-bold text-success">{formatCurrency(p.net_salary)}</td>
                      <td>
                        <Badge bg={p.status === "PAID" ? "success" : "warning"}>
                          {p.status}
                        </Badge>
                      </td>
                      <td className="text-end">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => {
                            setPayslipData(p);
                            setShowPayslipModal(true);
                          }}
                          className="d-flex align-items-center gap-1 ms-auto border px-3 py-1"
                        >
                          <IconDownload size={14} /> Payslip
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </div>
        </div>
      </div>

      {/* Printable Payslip Modal */}
      <Modal show={showPayslipModal} onHide={() => setShowPayslipModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">My Payslip Voucher</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {payslipData && (
            <div className="p-4" id="payslip-print-area" style={{ background: "#fff", color: "#333", fontFamily: "sans-serif" }}>
              {/* Header */}
              <div className="d-flex justify-content-between align-items-center border-bottom pb-4 mb-4">
                <div>
                  <h3 className="fw-bold mb-0 text-primary">AttendStack</h3>
                  <small className="text-muted">Enterprise Workforce Management Systems</small>
                </div>
                <div className="text-end">
                  <h5 className="mb-0 fw-bold">PAY SLIP</h5>
                  <small className="text-secondary">
                    Period: {payslipData.month_name} {payslipData.year}
                  </small>
                </div>
              </div>

              {/* Employee Info */}
              <div className="row mb-5 g-4">
                <div className="col-md-6">
                  <span className="text-uppercase text-muted d-block small fw-semibold">Employee Details</span>
                  <strong className="fs-4 text-dark">{payslipData.employee_details.full_name}</strong>
                  <div className="mt-2 text-secondary">
                    <div><strong>ID:</strong> {payslipData.employee_details.employee_id}</div>
                    <div><strong>Email:</strong> {payslipData.employee_details.email}</div>
                  </div>
                </div>
                <div className="col-md-6 text-md-end">
                  <span className="text-uppercase text-muted d-block small fw-semibold">Job Details</span>
                  <div className="mt-2 text-secondary">
                    <div><strong>Department:</strong> {payslipData.employee_details.department}</div>
                    <div><strong>Designation:</strong> {payslipData.employee_details.designation}</div>
                  </div>
                </div>
              </div>

              {/* Salary Breakdown table */}
              <div className="border rounded mb-4 overflow-hidden">
                <table className="table mb-0 align-middle">
                  <thead className="table-light">
                    <tr>
                      <th className="py-3">Salary Component</th>
                      <th className="text-end py-3">Type</th>
                      <th className="text-end py-3">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-3">Basic Monthly Salary</td>
                      <td className="text-end text-success py-3">Earnings</td>
                      <td className="text-end py-3">{formatCurrency(payslipData.basic_salary)}</td>
                    </tr>
                    <tr>
                      <td className="py-3">Allowances & Incentives</td>
                      <td className="text-end text-success py-3">Earnings</td>
                      <td className="text-end py-3">{formatCurrency(payslipData.allowances)}</td>
                    </tr>
                    <tr className="border-bottom">
                      <td className="py-3">Leave Deductions / Taxes</td>
                      <td className="text-end text-danger py-3">Deductions</td>
                      <td className="text-end text-danger py-3">-{formatCurrency(payslipData.deductions)}</td>
                    </tr>
                    <tr className="table-light fw-bold fs-5 border-top">
                      <td className="py-3 text-dark">Net Salary Pay</td>
                      <td className="text-end text-muted py-3">Total Payout</td>
                      <td className="text-end text-success py-3">{formatCurrency(payslipData.net_salary)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Status footer bar */}
              <div className="d-flex justify-content-between align-items-center border-top pt-4 mt-5">
                <div>
                  <span className="small text-muted d-block">Payout Status</span>
                  <strong className={payslipData.status === "PAID" ? "text-success" : "text-warning"}>
                    {payslipData.status}
                  </strong>
                </div>
                {payslipData.paid_on && (
                  <div className="text-end">
                    <span className="small text-muted d-block">Processed On</span>
                    <strong>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(payslipData.paid_on))}</strong>
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowPayslipModal(false)}>
            Close
          </Button>
          <Button variant="primary" onClick={handlePrint} className="d-flex align-items-center gap-2">
            <IconPrinter size={18} /> Print Payslip
          </Button>
        </Modal.Footer>
      </Modal>

      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #payslip-print-area, #payslip-print-area * {
            visibility: visible !important;
          }
          #payslip-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .modal-header, .modal-footer, .btn-close {
            display: none !important;
          }
          .modal-content {
            border: none !important;
            background: transparent !important;
            box-shadow: none !important;
          }
          .modal-dialog {
            max-width: 100% !important;
            margin: 0 !important;
          }
          .modal {
            position: absolute !important;
            overflow: visible !important;
            display: block !important;
          }
          .modal-backdrop {
            display: none !important;
          }
        }
      `}</style>
    </Fragment>
  );
};

export default MySalaryClient;