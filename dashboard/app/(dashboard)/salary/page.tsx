"use client";

import { Fragment, useState, useEffect } from "react";
import { IconDownload, IconSearch, IconPlus, IconPencil, IconCheck, IconInfoCircle } from "@tabler/icons-react";
import { Spinner, Alert, Modal, Button, Form, Badge, Table } from "react-bootstrap";
import Swal from "sweetalert2";
import PayslipPreview from "components/payroll/PayslipPreview";
import { downloadPayslipPdf } from "components/payroll/payslipPdf";
import { useBranding } from "context/BrandingContext";

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

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return dateStr;
  }
};

const leaveTotal = (summary: any, paymentType: "paid" | "unpaid") =>
  Object.values(summary?.leave_breakdown || {}).reduce(
    (total: number, item: any) => total + Number(item?.[paymentType] || 0),
    0,
  );

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
  const { companyLogo, companyName } = useBranding();
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
  const [showDeductionModal, setShowDeductionModal] = useState(false);
  const [deductionData, setDeductionData] = useState<any | null>(null);

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
        const errorText = await res.text();
        try {
          const errData = JSON.parse(errorText);
          throw new Error(errData.detail || "Failed to generate payroll.");
        } catch (e) {
          throw new Error(errorText || "Failed to generate payroll.");
        }
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
            <div class="d-flex justify-content-between border-bottom py-2">
              <span class="fw-semibold">Recalculated Pending Paychecks:</span>
              <span class="badge bg-primary rounded-pill px-3 py-1 fs-6">${result.updated}</span>
            </div>
            <div class="d-flex justify-content-between py-2">
              <span class="fw-semibold">Skipped Paid Paychecks:</span>
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
    setEditBasic(Number(p.basic_salary || 0).toFixed(2));
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

  const handleDownloadPdf = async () => {
    if (!payslipData) return;
    await downloadPayslipPdf(payslipData, { companyLogo, companyName });
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
                    <th>Generated On</th>
                    <th>Monthly Salary</th>
                    <th>Allowances</th>
                    <th>Deductions</th>
                    <th>Net Payout</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payrolls.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-5 text-secondary">
                        No payroll records found for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    payrolls.map((p) => {
                      const monthlySalary = Number(p.basic_salary || 0);
                      const calculatedDeductions = Number(p.deductions || 0);
                      const netSalary = Number(p.payable_salary ?? p.net_salary ?? 0);

                      return (
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
                          <td>
                            <div className="fw-medium text-dark small">{formatDate(p.created_at)}</div>
                            {p.paid_on && (
                              <small className="text-success d-block" style={{ fontSize: "0.72rem" }}>
                                Paid: {formatDate(p.paid_on)}
                              </small>
                            )}
                          </td>
                          <td>{formatCurrency(monthlySalary)}</td>
                          <td>{formatCurrency(p.allowances)}</td>
                          <td className="text-danger">
                            -{formatCurrency(calculatedDeductions)}
                            <Button
                              variant="link"
                              size="sm"
                              onClick={() => {
                                setDeductionData(p);
                                setShowDeductionModal(true);
                              }}
                              className="d-inline-flex align-items-center gap-1 ms-1 border-0 p-0"
                            >
                              <IconInfoCircle size={16} />
                            </Button>
                          </td>
                          <td>
                            <div className="fw-bold text-success">{formatCurrency(netSalary)}</div>
                            <small className="text-secondary d-block">Paid leave: {leaveTotal(p.attendance_summary, "paid")} day(s)</small>
                            <small className="text-danger">Unpaid days: {Number(p.attendance_summary?.unpaid_days || 0)}</small>
                          </td>
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
                      );
                    })
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
              Select a month and year to generate or recalculate payroll for active employees. The system uses attendance status, auto-marked holidays, Sunday unpaid days, leave, and half-day records to calculate deductions and payable salary.
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
                <Form.Label className="fw-semibold">Basic Salary (INR)</Form.Label>
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
      <Modal show={showPayslipModal} onHide={() => setShowPayslipModal(false)} size="xl" centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold fs-6">
            {payslipData?.employee_details?.full_name
              ? `Payslip - ${payslipData.employee_details.full_name} - ${payslipData.month_name || payslipData.month} ${payslipData.year}`
              : "Payslip Preview"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-3" style={{ background: "#f1f5f9" }}>
          {payslipData && <PayslipPreview payroll={payslipData} />}
        </Modal.Body>
        <Modal.Footer className="border-top">
          <Button variant="outline-secondary" onClick={() => setShowPayslipModal(false)}>
            Close
          </Button>
          <Button variant="outline-dark" onClick={handleDownloadPdf} className="d-flex align-items-center gap-2">
            <IconDownload size={16} /> Download PDF
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Deduction Details Modal */}
      <Modal show={showDeductionModal} onHide={() => setShowDeductionModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">Deduction Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {deductionData && (
            <div>
              <p>
                Here is a breakdown of the deductions for{" "}
                <strong>
                  {deductionData.employee_details.full_name} ({deductionData.month_name} {deductionData.year})
                </strong>
                .
              </p>
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Reason</th>
                    <th className="text-end">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {deductionData.deduction_details && Object.keys(deductionData.deduction_details).length > 0 ? (
                    Object.entries(deductionData.deduction_details).map(([reason, amount]) => (
                      <tr key={reason}>
                        <td>{reason.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</td>
                        <td className="text-end">{formatCurrency(amount as number)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} className="text-center text-muted">
                        No deduction details available.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="table-light">
                  <tr>
                    <td className="fw-bold">Total Deductions</td>
                    <td className="text-end fw-bold">{formatCurrency(deductionData.deductions)}</td>
                  </tr>
                </tfoot>
              </Table>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowDeductionModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Fragment>
  );
};

export default SalaryPage;
