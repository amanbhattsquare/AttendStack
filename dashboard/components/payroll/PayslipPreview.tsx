"use client";

import { useEffect, useState } from "react";
import { useBranding } from "context/BrandingContext";
import { getPayslipLogoDisplayUrl } from "./logoUrl";

type PayslipPreviewProps = {
  payroll: any;
  title?: string;
};

const formatCurrency = (value: number | string | null | undefined) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

const formatDate = (value?: string | null) =>
  value ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value)) : "-";

const titleCase = (value: string) =>
  value.replace(/_/g, " ").replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());

const dash = (value?: string | number | null) =>
  value === null || value === undefined || value === "" ? "-" : value;

const buildPayslipNo = (payroll: any) => {
  const employeeId = payroll.employee_details?.employee_id || "EMP";
  const month = String(payroll.month || "").padStart(2, "0");
  return `PS-${payroll.year || "YYYY"}${month}-${employeeId}`;
};

const amountToWords = (amount: number): string => {
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const convert = (n: number): string => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ` ${ones[n % 10]}` : "");
    if (n < 1000) return `${ones[Math.floor(n / 100)]} Hundred${n % 100 ? ` ${convert(n % 100)}` : ""}`;
    if (n < 100000) return `${convert(Math.floor(n / 1000))} Thousand${n % 1000 ? ` ${convert(n % 1000)}` : ""}`;
    if (n < 10000000) return `${convert(Math.floor(n / 100000))} Lakh${n % 100000 ? ` ${convert(n % 100000)}` : ""}`;
    return `${convert(Math.floor(n / 10000000))} Crore${n % 10000000 ? ` ${convert(n % 10000000)}` : ""}`;
  };

  const rupees = Math.floor(Number(amount || 0));
  return `${rupees ? convert(rupees) : "Zero"} Rupees Only`;
};

const PayslipPreview = ({ payroll }: PayslipPreviewProps) => {
  const { companyLogo, companyName } = useBranding();
  const [logoFailed, setLogoFailed] = useState(false);
  const employee = payroll.employee_details || {};
  const logoUrl = getPayslipLogoDisplayUrl(companyLogo);
  const deductionRows = Object.entries(payroll.deduction_details || {});
  const basicSalary = Number(payroll.basic_salary || 0);
  const allowances = Number(payroll.allowances || 0);
  const grossEarnings = basicSalary + allowances;
  const totalDeductions = Number(payroll.deductions || 0);
  const netPay = Number(payroll.payable_salary ?? payroll.net_salary ?? 0);
  const status = payroll.status || "PENDING";
  const period = `${payroll.month_name || payroll.month || ""} ${payroll.year || ""}`.trim();
  const payslipNo = buildPayslipNo(payroll);

  useEffect(() => {
    setLogoFailed(false);
  }, [logoUrl]);

  return (
    <div id="payslip-print-area" className="payslip-a4">
      <header className="payslip-header">
        <div className="payslip-brand">
          <div className="payslip-logo-box">
            {logoUrl && !logoFailed ? (
              <img src={logoUrl} alt="" className="payslip-logo-img" onError={() => setLogoFailed(true)} />
            ) : (
              <span>{(companyName || "A").slice(0, 1)}</span>
            )}
          </div>
          <div>
            <div className="payslip-company">{companyName || "AttendStack"}</div>
            <div className="payslip-subtitle">Human Resources - Payroll Department</div>
          </div>
        </div>
        <div className="payslip-title-wrap">
          <div className="payslip-title">Salary Slip</div>
          <div className="payslip-period">{period}</div>
          <div className={`payslip-status ${status === "PAID" ? "paid" : "pending"}`}>{status}</div>
        </div>
      </header>

      <section className="payslip-meta">
        <Info label="Payslip No." value={payslipNo} />
        <Info label="Pay Period" value={period} />
        <Info label="Generated On" value={formatDate(payroll.updated_at || payroll.created_at)} />
        <Info label="Payment Date" value={formatDate(payroll.paid_on)} />
      </section>

      <SectionTitle title="Employee Details" />
      <section className="payslip-info-grid">
        <Info label="Employee Name" value={employee.full_name} strong />
        <Info label="Employee ID" value={employee.employee_id} />
        <Info label="Email Address" value={employee.email} />
        <Info label="Department" value={employee.department} />
        <Info label="Designation" value={employee.designation} />
        <Info label="Annual CTC" value={formatCurrency(employee.annual_salary)} />
      </section>

      <SectionTitle title="Salary Computation" />
      <section className="payslip-tables">
        <div className="payslip-card earnings">
          <div className="payslip-card-title">Earnings</div>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <AmountRow label="Basic / Monthly Salary" amount={basicSalary} />
              <AmountRow label="Allowances & Incentives" amount={allowances} />
            </tbody>
            <tfoot>
              <AmountRow label="Gross Earnings" amount={grossEarnings} total />
            </tfoot>
          </table>
        </div>

        <div className="payslip-card deductions">
          <div className="payslip-card-title">Deductions</div>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {deductionRows.length > 0 ? (
                deductionRows.map(([reason, amount]) => (
                  <AmountRow key={reason} label={titleCase(reason)} amount={Number(amount || 0)} deduction />
                ))
              ) : (
                <AmountRow label="Total Deductions" amount={totalDeductions} deduction />
              )}
            </tbody>
            <tfoot>
              <AmountRow label="Total Deductions" amount={totalDeductions} deduction total />
            </tfoot>
          </table>
        </div>
      </section>

      <section className="payslip-net">
        <div>
          <div className="net-label">Net Salary Payable</div>
          <div className="net-amount">{formatCurrency(netPay)}</div>
          <div className="net-words">{amountToWords(netPay)}</div>
        </div>
        <div className="net-summary">
          <div><span>Gross Earnings</span><strong>{formatCurrency(grossEarnings)}</strong></div>
          <div><span>Total Deductions</span><strong>- {formatCurrency(totalDeductions)}</strong></div>
          <div><span>Net Payable</span><strong>{formatCurrency(netPay)}</strong></div>
        </div>
      </section>

      <section className="payslip-signatures">
        <div>
          <span />
          <strong>Employee Signature & Date</strong>
          <small>{dash(employee.full_name)}</small>
        </div>
        <div className="text-end">
          <span />
          <strong>Authorized Signatory</strong>
          <small>{companyName || "AttendStack"}</small>
        </div>
      </section>

      <footer className="payslip-footer">
        This is a system-generated salary slip. For corrections, tax declarations, or payroll queries, please contact HR.
        <br />
        Powered by AttendStack - Payroll Management System
      </footer>

      <style jsx global>{`
        .payslip-a4 {
          background: #ffffff;
          box-shadow: 0 4px 32px rgba(15, 23, 42, 0.12);
          color: #111827;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 11px;
          line-height: 1.4;
          margin: 0 auto;
          min-height: 297mm;
          overflow: hidden;
          width: 210mm;
          max-width: 100%;
        }
        .payslip-header {
          align-items: flex-start;
          background: #0f172a;
          border-bottom: 3px solid #06b6d4;
          display: flex;
          justify-content: space-between;
          padding: 22px 28px 18px;
        }
        .payslip-brand {
          align-items: center;
          display: flex;
          gap: 14px;
          min-width: 0;
        }
        .payslip-logo-box {
          align-items: center;
          background: #ffffff;
          border-radius: 8px;
          display: flex;
          flex: 0 0 auto;
          height: 48px;
          justify-content: center;
          overflow: hidden;
          width: 48px;
        }
        .payslip-logo-box span {
          color: #0f172a;
          font-size: 24px;
          font-weight: 900;
        }
        .payslip-logo-img {
          height: 100%;
          object-fit: contain;
          padding: 4px;
          width: 100%;
        }
        .payslip-company {
          color: #ffffff;
          font-size: 18px;
          font-weight: 800;
          letter-spacing: 0;
          white-space: normal;
        }
        .payslip-subtitle {
          color: #cbd5e1;
          font-size: 10px;
          margin-top: 2px;
        }
        .payslip-title-wrap {
          color: #ffffff;
          text-align: right;
        }
        .payslip-title {
          font-size: 24px;
          font-weight: 900;
          letter-spacing: 0;
          text-transform: uppercase;
        }
        .payslip-period {
          color: #cbd5e1;
          font-size: 10px;
          font-weight: 700;
          margin-top: 3px;
          text-transform: uppercase;
        }
        .payslip-status {
          display: inline-block;
          font-size: 10px;
          font-weight: 800;
          margin-top: 5px;
        }
        .payslip-status.paid { color: #86efac; }
        .payslip-status.pending { color: #fde047; }
        .payslip-meta,
        .payslip-info-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
        }
        .payslip-info-grid {
          grid-template-columns: repeat(3, 1fr);
          margin: 0 28px;
        }
        .payslip-meta {
          background: #f8fafc;
          border-bottom: 1px solid #d8dee7;
        }
        .info-cell {
          border-bottom: 1px solid #d8dee7;
          border-right: 1px solid #d8dee7;
          min-width: 0;
          padding: 10px 12px;
        }
        .payslip-info-grid .info-cell {
          border-top: 1px solid #d8dee7;
        }
        .info-cell:nth-child(4n) {
          border-right: 0;
        }
        .payslip-info-grid .info-cell:nth-child(3n) {
          border-right: 0;
        }
        .info-cell span {
          color: #64748b;
          display: block;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0;
          text-transform: uppercase;
        }
        .info-cell strong {
          color: #111827;
          display: block;
          font-size: 11px;
          margin-top: 3px;
          overflow-wrap: anywhere;
        }
        .info-cell strong.emphasis {
          font-size: 12px;
        }
        .section-title {
          border-bottom: 2px solid #111827;
          color: #111827;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0;
          margin: 22px 28px 12px;
          padding-bottom: 6px;
          text-transform: uppercase;
        }
        .payslip-tables {
          display: grid;
          gap: 14px;
          grid-template-columns: 1fr 1fr;
          margin: 0 28px;
        }
        .payslip-card {
          border: 1px solid #d8dee7;
          border-radius: 6px;
          overflow: hidden;
        }
        .payslip-card-title {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0;
          padding: 8px 12px;
          text-transform: uppercase;
        }
        .payslip-card.earnings .payslip-card-title {
          background: #eff6ff;
          color: #1d4ed8;
        }
        .payslip-card.deductions .payslip-card-title {
          background: #fff1f2;
          color: #be123c;
        }
        .payslip-card table {
          border-collapse: collapse;
          width: 100%;
        }
        .payslip-card th,
        .payslip-card td {
          border-top: 1px solid #e8edf3;
          padding: 8px 12px;
        }
        .payslip-card th {
          color: #64748b;
          font-size: 9px;
          text-align: left;
          text-transform: uppercase;
        }
        .payslip-card th:last-child,
        .payslip-card td:last-child {
          text-align: right;
          white-space: nowrap;
        }
        .amount-deduction {
          color: #be123c;
        }
        tfoot td {
          background: #f8fafc;
          font-weight: 800;
        }
        .payslip-net {
          align-items: flex-start;
          background: #0f172a;
          border-radius: 8px;
          color: #ffffff;
          display: flex;
          justify-content: space-between;
          margin: 18px 28px 0;
          padding: 18px 22px;
        }
        .net-label {
          color: #cbd5e1;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0;
          text-transform: uppercase;
        }
        .net-amount {
          font-size: 28px;
          font-weight: 900;
          margin-top: 2px;
        }
        .net-words {
          color: #94a3b8;
          font-size: 9px;
          margin-top: 3px;
          max-width: 330px;
        }
        .net-summary {
          min-width: 190px;
        }
        .net-summary div {
          display: flex;
          gap: 24px;
          justify-content: space-between;
          padding: 4px 0;
        }
        .net-summary span {
          color: #cbd5e1;
        }
        .net-summary strong {
          color: #86efac;
        }
        .payslip-signatures {
          display: flex;
          justify-content: space-between;
          margin: 34px 28px 0;
        }
        .payslip-signatures > div {
          min-width: 190px;
        }
        .payslip-signatures span {
          border-top: 1px solid #98a2b3;
          display: block;
          margin-bottom: 7px;
        }
        .payslip-signatures strong,
        .payslip-signatures small {
          display: block;
        }
        .payslip-signatures strong {
          color: #64748b;
          font-size: 9px;
          text-transform: uppercase;
        }
        .payslip-signatures small {
          color: #111827;
          font-size: 10px;
          margin-top: 2px;
        }
        .payslip-footer {
          border-top: 2px solid #06b6d4;
          color: #64748b;
          font-size: 9px;
          line-height: 1.6;
          margin: 20px 28px 0;
          padding-top: 10px;
          text-align: center;
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          html,
          body {
            height: 100%;
            margin: 0;
            padding: 0;
          }
          body * {
            visibility: hidden !important;
          }
          #payslip-print-area,
          #payslip-print-area * {
            visibility: visible !important;
          }
          #payslip-print-area {
            box-shadow: none !important;
            height: 297mm !important;
            left: 0 !important;
            margin: 0 !important;
            min-height: 297mm !important;
            overflow: hidden !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            position: absolute !important;
            top: 0 !important;
            width: 210mm !important;
          }
          .modal-header,
          .modal-footer,
          .btn-close {
            display: none !important;
          }
          .modal-content,
          .modal-dialog,
          .modal {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            margin: 0 !important;
            max-width: 100% !important;
            overflow: visible !important;
          }
          .payslip-header,
          .payslip-card-title,
          tfoot td,
          .payslip-net,
          .payslip-meta {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
};

const SectionTitle = ({ title }: { title: string }) => <div className="section-title">{title}</div>;

const Info = ({ label, value, strong = false }: { label: string; value: any; strong?: boolean }) => (
  <div className="info-cell">
    <span>{label}</span>
    <strong className={strong ? "emphasis" : ""}>{dash(value)}</strong>
  </div>
);

const AmountRow = ({
  label,
  amount,
  deduction = false,
  total = false,
}: {
  label: string;
  amount: number;
  deduction?: boolean;
  total?: boolean;
}) => (
  <tr>
    <td>{label}</td>
    <td className={deduction ? "amount-deduction" : ""}>
      {deduction && Number(amount || 0) > 0 ? "- " : ""}
      {total || Number(amount || 0) > 0 ? formatCurrency(amount) : "-"}
    </td>
  </tr>
);

export default PayslipPreview;
