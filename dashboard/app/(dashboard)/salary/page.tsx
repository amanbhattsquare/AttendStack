"use client";

import { Fragment, useState, useEffect } from "react";
import { IconDownload, IconSearch, IconPlus, IconPencil, IconCheck, IconPrinter } from "@tabler/icons-react";
import { Spinner, Alert, Modal, Button, Form, Badge, Table } from "react-bootstrap";
import Swal from "sweetalert2";

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

const monthsList = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const SalaryPage = () => {
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Modals States
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [genMonth, setGenMonth] = useState<number>(new Date().getMonth() + 1);
  const [genYear, setGenYear] = useState<number>(new Date().getFullYear());
  const [isGenerating, setIsGenerating] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<any | null>(null);
  const [editBasic, setEditBasic] = useState("");
  const [editAllowances, setEditAllowances] = useState("");
  const [editDeductions, setEditDeductions] = useState("");
  const [editStatus, setEditStatus] = useState("PENDING");
  const [isUpdating, setIsUpdating] = useState(false);

  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [payslipData, setPayslipData] = useState<any | null>(null);

  // Parse User Credentials
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        setIsAdmin(parsed.role === "SUPER_ADMIN" || parsed.role === "HR");
      } catch (err) {
        console.error("Failed to parse user data.", err);
      }
    }
  }, []);

  // Fetch Payroll records
  const fetchPayrolls = async () => {
    setIsLoading(true);
    setError("");
    try {
      const url = new URL(BASE_URL);
      if (selectedMonth) url.searchParams.append("month", String(selectedMonth));
      if (selectedYear) url.searchParams.append("year", String(selectedYear));
      if (searchTerm) url.searchParams.append("search", searchTerm);

      const res = await fetch(url.toString(), { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to load payroll list.");
      const data = await res.json();
      setPayrolls(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payroll data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrolls();
  }, [selectedMonth, selectedYear, searchTerm]);

  // Generate Payroll batch
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      const res = await fetch(`${BASE_URL}generate/`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ month: genMonth, year: genYear }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to generate payroll.");
      }
      const result = await res.json();
      Swal.fire({
        title: "Payroll Run Completed",
        html: `
          <div class="text-start">
            <p class="mb-3 text-secondary">The system processed the monthly payroll successfully.</p>
            <div class="d-flex justify-content-between border-bottom py-2">
              <span class="fw-semibold">Generated Paychecks:</span>
              <span class="badge bg-success rounded-pill px-3 py-1 fs-6">${result.generated}</span>
            </div>
            <div class="d-flex justify-content-between py-2">
              <span class="fw-semibold">Skipped (Duplicate Checks):</span>
              <span class="badge bg-secondary rounded-pill px-3 py-1 fs-6">${result.skipped}</span>
            </div>
          </div>
        `,
        icon: "success",
        confirmButtonText: "Done",
        confirmButtonColor: "#3085d6",
      });
      setShowGenerateModal(false);
      setSelectedMonth(genMonth);
      setSelectedYear(genYear);
      fetchPayrolls();
    } catch (err) {
      Swal.fire({
        title: "Generation Failed",
        text: err instanceof Error ? err.message : "Failed to generate payroll run.",
        icon: "error",
        confirmButtonColor: "#dc3545",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (p: any) => {
    setSelectedPayroll(p);
    setEditBasic(p.basic_salary);
    setEditAllowances(p.allowances);
    setEditDeductions(p.deductions);
    setEditStatus(p.status);
    setShowEditModal(true);
  };

  // Handle Edit Submit
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayroll) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`${BASE_URL}${selectedPayroll.id}/`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({
          employee_id: selectedPayroll.employee_details.id,
          month: selectedPayroll.month,
          year: selectedPayroll.year,
          basic_salary: Number(editBasic),
          allowances: Number(editAllowances),
          deductions: Number(editDeductions),
          status: editStatus,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to update payroll details.");
      }
      setShowEditModal(false);
      fetchPayrolls();
    } catch (err) {
      Swal.fire({
        title: "Update Failed",
        text: err instanceof Error ? err.message : "Failed to update payroll.",
        icon: "error",
        confirmButtonColor: "#dc3545",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Quick payout mark as PAID
  const quickMarkPaid = async (p: any) => {
    const result = await Swal.fire({
      title: "Confirm Payout",
      text: `Are you sure you want to mark ${p.employee_details.full_name}'s salary as PAID?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#198754",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Yes, Mark Paid",
      cancelButtonText: "Cancel",
    });
    if (!result.isConfirmed) return;
    try {
      const res = await fetch(`${BASE_URL}${p.id}/`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({
          employee_id: p.employee_details.id,
          month: p.month,
          year: p.year,
          basic_salary: Number(p.basic_salary),
          allowances: Number(p.allowances),
          deductions: Number(p.deductions),
          status: "PAID",
        }),
      });
      if (!res.ok) throw new Error("Failed to process payment status.");
      fetchPayrolls();
      Swal.fire({
        title: "Success",
        text: "Payout marked as PAID successfully.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire({
        title: "Processing Failed",
        text: err instanceof Error ? err.message : "Failed to change payout status.",
        icon: "error",
        confirmButtonColor: "#dc3545",
      });
    }
  };

  // Payslip Print
  const handlePrint = () => {
    window.print();
  };

  return (
    <Fragment>
      <div className="mb-6 d-flex align-items-center justify-content-between">
        <div>
          <h2 className="mb-0 fw-bold">Salary & Payroll</h2>
          <p className="text-secondary mb-0">Manage employee salaries, generate payslips, and view payroll history.</p>
        </div>
        {isAdmin && (
          <button
            className="btn btn-primary d-flex align-items-center gap-2 shadow-sm"
            onClick={() => setShowGenerateModal(true)}
          >
            <IconPlus size={18} /> Generate Payroll
          </button>
        )}
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <div className="card border-0 shadow-sm mb-6">
        <div className="card-header bg-white border-bottom-0 pt-4 pb-0">
          <div className="row g-3 align-items-center">
            {/* Search */}
            <div className="col-md-4">
              <div className="input-group">
                <span className="input-group-text bg-transparent border-end-0">
                  <IconSearch size={18} className="text-muted" />
                </span>
                <input
                  type="text"
                  className="form-control border-start-0 ps-0"
                  placeholder="Search employee..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Month Filter */}
            <div className="col-md-3">
              <select
                className="form-select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
              >
                {monthsList.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Filter */}
            <div className="col-md-2">
              <select
                className="form-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
                <option value={2024}>2024</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card-body p-0 mt-3">
          <div className="table-responsive">
            {isLoading ? (
              <div className="d-flex justify-content-center align-items-center py-6">
                <Spinner animation="border" variant="primary" role="status">
                  <span className="visually-hidden">Loading Payroll...</span>
                </Spinner>
              </div>
            ) : (
              <Table hover responsive className="align-middle text-nowrap mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Employee Name</th>
                    <th>Basic Salary</th>
                    <th>Allowances</th>
                    <th>Deductions</th>
                    <th>Net Salary</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payrolls.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-5 text-secondary">
                        No payroll records found for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    payrolls.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <div className="d-flex align-items-center">
                            <img
                              src={p.employee_details.profile_photo_url || "/images/avatar/avatar-fallback.jpg"}
                              alt=""
                              className="avatar avatar-sm rounded-circle me-3"
                            />
                            <div>
                              <h6 className="mb-0 fw-semibold">{p.employee_details.full_name}</h6>
                              <small className="text-muted">
                                {p.employee_details.department} • {p.employee_details.designation}
                              </small>
                            </div>
                          </div>
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
                          <div className="d-flex justify-content-end gap-2 px-3">
                            {isAdmin && p.status === "PENDING" && (
                              <Button
                                variant="outline-success"
                                size="sm"
                                onClick={() => quickMarkPaid(p)}
                                className="px-2 py-1"
                              >
                                <IconCheck size={14} className="me-1" /> Pay
                              </Button>
                            )}
                            {isAdmin && (
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => openEditModal(p)}
                                className="px-2 py-1"
                              >
                                <IconPencil size={14} /> Edit
                              </Button>
                            )}
                            <Button
                              variant="light"
                              size="sm"
                              onClick={() => {
                                setPayslipData(p);
                                setShowPayslipModal(true);
                              }}
                              className="d-flex align-items-center gap-1 border px-2 py-1"
                            >
                              <IconDownload size={14} /> Payslip
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            )}
          </div>
        </div>
      </div>

      {/* Generate Payroll Modal */}
      <Modal show={showGenerateModal} onHide={() => setShowGenerateModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">Generate Monthly Payroll Run</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleGenerate}>
          <Modal.Body>
            <p className="text-muted mb-4">
              Select the Month and Year to generate payroll records for all **Active Employees** dynamically. 
              The system will compute basic monthly payouts (`annual_salary / 12`) and default allowances/deductions to zero.
            </p>
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Payroll Month</Form.Label>
              <Form.Select
                value={genMonth}
                onChange={(e) => setGenMonth(Number(e.target.value))}
              >
                {monthsList.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Payroll Year</Form.Label>
              <Form.Select
                value={genYear}
                onChange={(e) => setGenYear(Number(e.target.value))}
              >
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
                <option value={2024}>2024</option>
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShowGenerateModal(false)} disabled={isGenerating}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Spinner as="span" animation="border" size="sm" className="me-2" />
                  Generating...
                </>
              ) : (
                "Generate Payouts"
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Edit Payroll Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">Adjust Payroll Details</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleUpdate}>
          {selectedPayroll && (
            <Modal.Body>
              <div className="mb-4 border-bottom pb-3">
                <h6 className="mb-0 fw-bold">{selectedPayroll.employee_details.full_name}</h6>
                <small className="text-secondary">
                  Payroll Period: {selectedPayroll.month_name} {selectedPayroll.year}
                </small>
              </div>

              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">Basic Monthly Salary (INR)</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  value={editBasic}
                  onChange={(e) => setEditBasic(e.target.value)}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">Allowances / Bonuses (INR)</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  value={editAllowances}
                  onChange={(e) => setEditAllowances(e.target.value)}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">Deductions / Unpaid Offs (INR)</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  value={editDeductions}
                  onChange={(e) => setEditDeductions(e.target.value)}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">Payout Status</Form.Label>
                <Form.Select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                >
                  <option value="PENDING">PENDING</option>
                  <option value="PAID">PAID</option>
                </Form.Select>
              </Form.Group>
            </Modal.Body>
          )}
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShowEditModal(false)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Spinner as="span" animation="border" size="sm" className="me-2" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Printable Payslip Modal */}
      <Modal show={showPayslipModal} onHide={() => setShowPayslipModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">Payslip Preview</Modal.Title>
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

export default SalaryPage;
