"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  IconAlertCircle,
  IconArrowLeft,
  IconBriefcase,
  IconBuildingBank,
  IconCalendar,
  IconEye,
  IconFileText,
  IconId,
  IconMail,
  IconMapPin,
  IconPhone,
  IconShieldCheck,
  IconUser,
  IconUsers,
  IconWallet,
  IconCalendarStats,
  IconEdit,
} from "@tabler/icons-react";

type Employee = {
  id: string;
  employee_id: string;
  full_name: string;
  email: string;
  phone: string;
  date_of_birth: string | null;
  aadhaar_number: string;
  address: string;
  profile_photo_url: string | null;
  aadhaar_document_url: string | null;
  pan_card_document_url: string | null;
  cv_document_url: string | null;
  account_exists: boolean;
  emergency_contact_name: string;
  emergency_contact_relationship: string;
  emergency_contact_phone: string;
  joining_date: string;
  department: string;
  designation: string;
  employment_type: string;
  employment_type_label: string;
  reporting_manager: string;
  status: "ACTIVE" | "PROVISION" | "INACTIVE" | "ON_LEAVE" | "TERMINATED";
  status_label: string;
  annual_salary: string;
  pay_frequency: string;
  pay_frequency_label: string;
  bank_name: string;
  bank_account_number: string;
  ifsc_code: string;
  tax_id: string;
  created_at: string;
  updated_at: string;
};

type SectionItem = {
  label: string;
  value?: string | null;
  icon?: React.ReactNode;
};

type EmployeeProfileClientProps = {
  employeeId?: string;
  employee?: {
    id?: string;
    avatar?: string;
  };
};

type LeavePolicy = {
  year: number;
  joining_date: string;
  is_prorated: boolean;
  eligible_months: number;
  casual_leave_days_override: string | null;
  sick_leave_days_override: string | null;
  company_casual_leave_days: number;
  company_sick_leave_days: number;
  balances: Array<{ leave_type: string; label: string; entitlement: number; used: number; remaining: number }>;
  leave_requests: Array<{
    id: number; leave_type_label: string; start_date: string; end_date: string;
    is_half_day: boolean; reason: string; status: string; status_label: string;
  }>;
};

const API_URL = `${process.env.NEXT_PUBLIC_API_ENDPOINT}/api/v1/employees/`;

const statusBadgeClass: Record<Employee["status"], string> = {
  ACTIVE: "bg-success-subtle text-success",
  PROVISION: "bg-info-subtle text-info",
  INACTIVE: "bg-secondary-subtle text-secondary",
  ON_LEAVE: "bg-warning-subtle text-warning",
  TERMINATED: "bg-danger-subtle text-danger",
};

const formatDate = (value?: string | null) => {
  if (!value) return "Not provided";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "Not provided";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const formatCurrency = (value?: string | null) => {
  if (!value) return "Not provided";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value));
};

const displayValue = (value?: string | null) => {
  return value && String(value).trim() ? value : "Not provided";
};

const InfoItem = ({ label, value, icon }: SectionItem) => (
  <div className="employee-info-item">
    <div className="employee-info-icon">{icon || <IconFileText size={18} />}</div>
    <div>
      <div className="employee-info-label">{label}</div>
      <div className="employee-info-value">{displayValue(value)}</div>
    </div>
  </div>
);

const InfoSection = ({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle?: string;
  items: SectionItem[];
}) => (
  <section className="employee-profile-section">
    <div className="mb-4">
      <h5 className="mb-1">{title}</h5>
      {subtitle && <p className="text-secondary mb-0">{subtitle}</p>}
    </div>
    <div className="row g-3">
      {items.map((item) => (
        <div className="col-md-6 col-xl-4" key={item.label}>
          <InfoItem {...item} />
        </div>
      ))}
    </div>
  </section>
);

const EmployeeProfileClient = ({ employeeId, employee: legacyEmployee }: EmployeeProfileClientProps) => {
  const resolvedEmployeeId = employeeId || legacyEmployee?.id || "";
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [leavePolicy, setLeavePolicy] = useState<LeavePolicy | null>(null);
  const [isEditingLeavePolicy, setIsEditingLeavePolicy] = useState(false);
  const [casualOverride, setCasualOverride] = useState("");
  const [sickOverride, setSickOverride] = useState("");
  const [isSavingLeavePolicy, setIsSavingLeavePolicy] = useState(false);
  const [leavePolicyError, setLeavePolicyError] = useState("");

  useEffect(() => {
    const loadEmployee = async () => {
      setIsLoading(true);
      setError("");

      try {
        if (!resolvedEmployeeId) {
          throw new Error("Employee ID is missing from the profile route.");
        }

        const token = localStorage.getItem("authToken");
        const response = await fetch(`${API_URL}${resolvedEmployeeId}/`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (response.status === 404) {
          throw new Error("Employee profile was not found.");
        }
        if (response.status === 401 || response.status === 403) {
          throw new Error("You are not authorized to view this employee profile.");
        }
        if (!response.ok) {
          throw new Error("Unable to load employee profile.");
        }

        setEmployee((await response.json()) as Employee);
        const leaveResponse = await fetch(`${API_URL}${resolvedEmployeeId}/leave-policy/`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (leaveResponse.ok) {
          const policy = (await leaveResponse.json()) as LeavePolicy;
          setLeavePolicy(policy);
          setCasualOverride(policy.casual_leave_days_override ?? "");
          setSickOverride(policy.sick_leave_days_override ?? "");
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load employee profile.");
      } finally {
        setIsLoading(false);
      }
    };

    loadEmployee();
  }, [resolvedEmployeeId]);

  const saveLeavePolicy = async () => {
    setIsSavingLeavePolicy(true);
    setLeavePolicyError("");
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_URL}${resolvedEmployeeId}/leave-policy/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          casual_leave_days_override: casualOverride === "" ? null : Number(casualOverride),
          sick_leave_days_override: sickOverride === "" ? null : Number(sickOverride),
        }),
      });
      if (!response.ok) throw new Error("Unable to update employee leave entitlement.");
      const policy = (await response.json()) as LeavePolicy;
      setLeavePolicy(policy);
      setCasualOverride(policy.casual_leave_days_override ?? "");
      setSickOverride(policy.sick_leave_days_override ?? "");
      setIsEditingLeavePolicy(false);
    } catch (saveError) {
      setLeavePolicyError(saveError instanceof Error ? saveError.message : "Unable to update leave entitlement.");
    } finally {
      setIsSavingLeavePolicy(false);
    }
  };

  const sections = useMemo(() => {
    if (!employee) return [];

    return [
      {
        title: "Personal Information",
        subtitle: "Identity and contact details captured from the employee form.",
        items: [
          { label: "Full Name", value: employee.full_name, icon: <IconUser size={18} /> },
          { label: "Email Address", value: employee.email, icon: <IconMail size={18} /> },
          { label: "Phone Number", value: employee.phone, icon: <IconPhone size={18} /> },
          { label: "Date of Birth", value: formatDate(employee.date_of_birth), icon: <IconCalendar size={18} /> },
          { label: "Aadhaar Number", value: employee.aadhaar_number, icon: <IconId size={18} /> },
          { label: "Address", value: employee.address, icon: <IconMapPin size={18} /> },
        ],
      },
      {
        title: "Emergency Contact",
        subtitle: "People to contact if urgent assistance is needed.",
        items: [
          { label: "Contact Name", value: employee.emergency_contact_name, icon: <IconUsers size={18} /> },
          { label: "Relationship", value: employee.emergency_contact_relationship, icon: <IconShieldCheck size={18} /> },
          { label: "Contact Phone", value: employee.emergency_contact_phone, icon: <IconPhone size={18} /> },
        ],
      },
      {
        title: "Employment Details",
        subtitle: "Role, department, manager, and employment status.",
        items: [
          { label: "Employee ID", value: employee.employee_id, icon: <IconId size={18} /> },
          { label: "Joining Date", value: formatDate(employee.joining_date), icon: <IconCalendar size={18} /> },
          { label: "Department", value: employee.department, icon: <IconBriefcase size={18} /> },
          { label: "Designation", value: employee.designation, icon: <IconBriefcase size={18} /> },
          { label: "Company", value: "Bhatt Square Pvt Ltd", icon: <IconBriefcase size={18} /> },
          { label: "Employment Type", value: employee.employment_type_label || employee.employment_type, icon: <IconUsers size={18} /> },
          { label: "Reporting Manager", value: employee.reporting_manager, icon: <IconUser size={18} /> },
          { label: "Login Account", value: employee.account_exists ? "Created" : "Not created", icon: <IconShieldCheck size={18} /> },
        ],
      },
      {
        title: "Salary & Bank",
        subtitle: "Payroll and bank details saved for this employee.",
        items: [
          { label: "Annual Salary", value: formatCurrency(employee.annual_salary), icon: <IconWallet size={18} /> },
          { label: "Pay Frequency", value: employee.pay_frequency_label || employee.pay_frequency, icon: <IconCalendar size={18} /> },
          { label: "Bank Name", value: employee.bank_name, icon: <IconBuildingBank size={18} /> },
          { label: "Bank Account Number", value: employee.bank_account_number, icon: <IconId size={18} /> },
          { label: "IFSC Code", value: employee.ifsc_code, icon: <IconBuildingBank size={18} /> },
          { label: "Tax ID / PAN", value: employee.tax_id, icon: <IconFileText size={18} /> },
        ],
      },
      {
        title: "System Details",
        subtitle: "Record timestamps from AttendStack.",
        items: [
          { label: "Created At", value: formatDateTime(employee.created_at), icon: <IconCalendar size={18} /> },
          { label: "Last Updated", value: formatDateTime(employee.updated_at), icon: <IconCalendar size={18} /> },
        ],
      },
    ];
  }, [employee]);

  if (isLoading) {
    return (
      <div className="card border-0 shadow-sm">
        <div className="card-body py-5 text-center text-secondary">Loading employee profile...</div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="card border-0 shadow-sm">
        <div className="card-body p-4">
          <div className="alert alert-danger d-flex align-items-center gap-2 mb-4">
            <IconAlertCircle size={20} />
            <span>{error || "Employee profile could not be loaded."}</span>
          </div>
          <Link href="/employees" className="btn btn-outline-secondary d-inline-flex align-items-center gap-2">
            <IconArrowLeft size={18} /> Back to Employees
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="employee-profile">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <Link href="/employees" className="btn btn-outline-secondary d-inline-flex align-items-center gap-2">
          <IconArrowLeft size={18} /> Back
        </Link>
      </div>

      <div className="employee-profile-header mb-4">
        <div className="d-flex flex-column flex-md-row align-items-md-center gap-4">
          <img
            src={employee.profile_photo_url || "/images/avatar/avatar-fallback.jpg"}
            alt={employee.full_name}
            className="employee-profile-avatar"
          />
          <div className="flex-grow-1">
            <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
              <h2 className="mb-0">{employee.full_name}</h2>
              <span className={`badge ${statusBadgeClass[employee.status] || "bg-secondary-subtle text-secondary"}`}>
                {employee.status_label}
              </span>
            </div>
            <p className="text-secondary mb-2">{employee.designation} - {employee.department}</p>
            <div className="d-flex flex-wrap gap-3 text-secondary small">
              <span className="d-inline-flex align-items-center gap-1"><IconId size={16} /> {employee.employee_id}</span>
              <span className="d-inline-flex align-items-center gap-1"><IconMail size={16} /> {employee.email}</span>
              <span className="d-inline-flex align-items-center gap-1"><IconPhone size={16} /> {employee.phone}</span>
            </div>
          </div>
        </div>
      </div>

      <section className="employee-profile-section">
        <div className="mb-4">
          <h5 className="mb-1">Documents</h5>
          <p className="text-secondary mb-0">Uploaded files attached during employee onboarding.</p>
        </div>
        <div className="row g-3">
          <div className="col-md-6">
            <div className="employee-document-tile">
              <div>
                <div className="employee-info-label">Profile Photo</div>
                <div className="employee-info-value">{employee.profile_photo_url ? "Uploaded" : "Not uploaded"}</div>
              </div>
              {employee.profile_photo_url && (
                <a href={employee.profile_photo_url} target="_blank" rel="noreferrer" className="btn btn-light btn-sm d-inline-flex align-items-center gap-2">
                  <IconEye size={16} /> Preview
                </a>
              )}
            </div>
          </div>
          <div className="col-md-6">
            <div className="employee-document-tile">
              <div>
                <div className="employee-info-label">PAN Card</div>
                <div className="employee-info-value">{employee.pan_card_document_url ? "Uploaded" : "Not uploaded"}</div>
              </div>
              {employee.pan_card_document_url && (
                <a href={employee.pan_card_document_url} target="_blank" rel="noreferrer" className="btn btn-light btn-sm d-inline-flex align-items-center gap-2">
                  <IconEye size={16} /> Preview
                </a>
              )}
            </div>
          </div>
          <div className="col-md-6">
            <div className="employee-document-tile">
              <div>
                <div className="employee-info-label">CV / Resume</div>
                <div className="employee-info-value">{employee.cv_document_url ? "Uploaded" : "Not uploaded"}</div>
              </div>
              {employee.cv_document_url && (
                <a href={employee.cv_document_url} target="_blank" rel="noreferrer" className="btn btn-light btn-sm d-inline-flex align-items-center gap-2">
                  <IconEye size={16} /> Preview
                </a>
              )}
            </div>
          </div>
          <div className="col-md-6">
            <div className="employee-document-tile">
              <div>
                <div className="employee-info-label">Aadhaar Document</div>
                <div className="employee-info-value">{employee.aadhaar_document_url ? "Uploaded" : "Not uploaded"}</div>
              </div>
              {employee.aadhaar_document_url && (
                <a href={employee.aadhaar_document_url} target="_blank" rel="noreferrer" className="btn btn-light btn-sm d-inline-flex align-items-center gap-2">
                  <IconEye size={16} /> Preview
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {sections.map((section) => (
        <InfoSection key={section.title} {...section} />
      ))}

      {leavePolicy && (
        <section className="employee-profile-section" id="leave-entitlement">
          <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-4">
            <div>
              <h5 className="mb-1">Paid Leave Entitlement</h5>
              <p className="text-secondary mb-0">
                {leavePolicy.year} balances based on company policy
                {leavePolicy.is_prorated ? `, prorated across ${leavePolicy.eligible_months} eligible months from the joining month.` : "."}
              </p>
            </div>
            <button className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-2" onClick={() => setIsEditingLeavePolicy(!isEditingLeavePolicy)}>
              <IconEdit size={16} /> {isEditingLeavePolicy ? "Cancel" : "Edit Entitlement"}
            </button>
          </div>

          {isEditingLeavePolicy && (
            <div className="row g-3 align-items-end border-bottom pb-4 mb-4">
              {leavePolicyError && <div className="col-12"><div className="alert alert-danger mb-0">{leavePolicyError}</div></div>}
              <div className="col-md-5">
                <label className="form-label small fw-semibold">Annual Casual / PL Override</label>
                <input type="number" min="0" max="365" step="0.5" className="form-control" value={casualOverride} onChange={(event) => setCasualOverride(event.target.value)} placeholder={`Company default: ${leavePolicy.company_casual_leave_days}`} />
                <div className="form-text">Leave blank to follow company policy.</div>
              </div>
              <div className="col-md-5">
                <label className="form-label small fw-semibold">Annual Sick Leave Override</label>
                <input type="number" min="0" max="365" step="0.5" className="form-control" value={sickOverride} onChange={(event) => setSickOverride(event.target.value)} placeholder={`Company default: ${leavePolicy.company_sick_leave_days}`} />
                <div className="form-text">Leave blank to follow company policy.</div>
              </div>
              <div className="col-md-2">
                <button className="btn btn-primary w-100" onClick={saveLeavePolicy} disabled={isSavingLeavePolicy}>
                  {isSavingLeavePolicy ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          )}

          <div className="row g-3 mb-4">
            {leavePolicy.balances.map((balance) => (
              <div className="col-sm-6 col-xl-4" key={balance.leave_type}>
                <div className="employee-info-item">
                  <div className="employee-info-icon"><IconCalendarStats size={18} /></div>
                  <div>
                    <div className="employee-info-label">{balance.label}</div>
                    <div className="employee-info-value">{balance.remaining} of {balance.entitlement} days remaining</div>
                    <div className="small text-secondary">{balance.used} days used</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <h6 className="mb-3">Leave Applications</h6>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light"><tr><th>Type</th><th>Period</th><th>Reason</th><th>Status</th></tr></thead>
              <tbody>
                {leavePolicy.leave_requests.length ? leavePolicy.leave_requests.map((leave) => (
                  <tr key={leave.id}>
                    <td>{leave.leave_type_label}{leave.is_half_day ? " (Half day)" : ""}</td>
                    <td>{formatDate(leave.start_date)} - {formatDate(leave.end_date)}</td>
                    <td className="text-break" style={{ maxWidth: 360 }}>{leave.reason}</td>
                    <td><span className={`badge ${leave.status === "APPROVED" ? "bg-success-subtle text-success" : leave.status === "REJECTED" ? "bg-danger-subtle text-danger" : "bg-warning-subtle text-warning"}`}>{leave.status_label}</span></td>
                  </tr>
                )) : <tr><td colSpan={4} className="text-center text-secondary py-4">No leave applications found.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <style jsx global>{`
        .employee-profile-header,
        .employee-profile-section {
          background: #fff;
          border: 1px solid #edf1f5;
          border-radius: 10px;
          box-shadow: 0 2px 8px rgba(16, 24, 40, 0.04);
          padding: 24px;
        }

        .employee-profile-section {
          margin-bottom: 24px;
        }

        .employee-profile-avatar {
          width: 112px;
          height: 112px;
          border-radius: 50%;
          object-fit: cover;
          border: 4px solid #f3f7fa;
          background: #f8fafc;
        }

        .employee-info-item,
        .employee-document-tile {
          min-height: 86px;
          height: 100%;
          border: 1px solid #edf1f5;
          border-radius: 8px;
          padding: 14px;
          display: flex;
          gap: 12px;
          align-items: flex-start;
          background: #fbfcfe;
        }

        .employee-document-tile {
          align-items: center;
          justify-content: space-between;
        }

        .employee-info-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
          color: #0ea66b;
          background: #eaf8f1;
        }

        .employee-info-label {
          color: #6b7a8c;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          margin-bottom: 4px;
        }

        .employee-info-value {
          color: #0f172a;
          font-weight: 600;
          overflow-wrap: anywhere;
        }
      `}</style>
    </div>
  );
};

export default EmployeeProfileClient;
