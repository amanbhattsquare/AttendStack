"use client";

import {
  IconBuildingBank,
  IconCalendar,
  IconFileText,
  IconId,
  IconMail,
  IconMapPin,
  IconPhone,
  IconShieldCheck,
  IconUser,
  IconWallet,
} from "@tabler/icons-react";
import { useCurrentEmployee } from "../useCurrentEmployee";

const formatDate = (value?: string | null) => {
  if (!value) return "Not provided";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
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

const valueOrFallback = (value?: string | null) => {
  return value && value.trim() ? value : "Not provided";
};

const ProfileItem = ({ label, value, icon }: { label: string; value?: string | null; icon: React.ReactNode }) => (
  <div className="my-profile-item">
    <span className="my-profile-icon">{icon}</span>
    <span>
      <span className="my-profile-label">{label}</span>
      <span className="my-profile-value">{valueOrFallback(value)}</span>
    </span>
  </div>
);

const ProfilePage = () => {
  const { employee, isLoading, error } = useCurrentEmployee();

  if (isLoading) {
    return <div className="card border-0 shadow-sm"><div className="card-body py-5 text-center text-secondary">Loading your profile...</div></div>;
  }

  if (error || !employee) {
    return <div className="alert alert-danger">{error || "Unable to load your profile."}</div>;
  }

  const sections = [
    {
      title: "Personal Information",
      items: [
        { label: "Full Name", value: employee.full_name, icon: <IconUser size={18} /> },
        { label: "Email", value: employee.email, icon: <IconMail size={18} /> },
        { label: "Phone", value: employee.phone, icon: <IconPhone size={18} /> },
        { label: "Date of Birth", value: formatDate(employee.date_of_birth), icon: <IconCalendar size={18} /> },
        { label: "Aadhaar Number", value: employee.aadhaar_number, icon: <IconId size={18} /> },
        { label: "Address", value: employee.address, icon: <IconMapPin size={18} /> },
      ],
    },
    {
      title: "Employment Details",
      items: [
        { label: "Employee ID", value: employee.employee_id, icon: <IconId size={18} /> },
        { label: "Joining Date", value: formatDate(employee.joining_date), icon: <IconCalendar size={18} /> },
        { label: "Department", value: employee.department, icon: <IconShieldCheck size={18} /> },
        { label: "Designation", value: employee.designation, icon: <IconUser size={18} /> },
        { label: "Employment Type", value: employee.employment_type_label, icon: <IconFileText size={18} /> },
        { label: "Reporting Manager", value: employee.reporting_manager, icon: <IconUser size={18} /> },
      ],
    },
    {
      title: "Salary & Bank",
      items: [
        { label: "Annual Salary", value: formatCurrency(employee.annual_salary), icon: <IconWallet size={18} /> },
        { label: "Pay Frequency", value: employee.pay_frequency_label, icon: <IconCalendar size={18} /> },
        { label: "Bank Name", value: employee.bank_name, icon: <IconBuildingBank size={18} /> },
        { label: "Account Number", value: employee.bank_account_number, icon: <IconId size={18} /> },
        { label: "Tax ID / PAN", value: employee.tax_id, icon: <IconFileText size={18} /> },
      ],
    },
  ];

  return (
    <div>
      <div className="my-profile-header mb-4">
        <img
          src={employee.profile_photo_url || "/images/avatar/avatar-fallback.jpg"}
          alt={employee.full_name}
          className="my-profile-avatar"
        />
        <div>
          <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
            <h2 className="mb-0">{employee.full_name}</h2>
            <span className="badge bg-success-subtle text-success">{employee.status_label}</span>
          </div>
          <p className="text-secondary mb-0">{employee.designation} - {employee.department}</p>
        </div>
      </div>

      {sections.map((section) => (
        <section className="my-profile-section" key={section.title}>
          <h5 className="mb-4">{section.title}</h5>
          <div className="row g-3">
            {section.items.map((item) => (
              <div className="col-md-6 col-xl-4" key={item.label}>
                <ProfileItem {...item} />
              </div>
            ))}
          </div>
        </section>
      ))}

      <style jsx global>{`
        .my-profile-header,
        .my-profile-section {
          background: #fff;
          border: 1px solid #edf1f5;
          border-radius: 10px;
          box-shadow: 0 2px 8px rgba(16, 24, 40, 0.04);
          padding: 24px;
        }

        .my-profile-header {
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .my-profile-section {
          margin-bottom: 24px;
        }

        .my-profile-avatar {
          width: 96px;
          height: 96px;
          border-radius: 50%;
          object-fit: cover;
          border: 4px solid #f3f7fa;
        }

        .my-profile-item {
          min-height: 84px;
          height: 100%;
          display: flex;
          gap: 12px;
          align-items: flex-start;
          background: #fbfcfe;
          border: 1px solid #edf1f5;
          border-radius: 8px;
          padding: 14px;
        }

        .my-profile-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: #eaf8f1;
          color: #0ea66b;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
        }

        .my-profile-label,
        .my-profile-value {
          display: block;
        }

        .my-profile-label {
          color: #6b7a8c;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .my-profile-value {
          color: #0f172a;
          font-weight: 600;
          overflow-wrap: anywhere;
        }
      `}</style>
    </div>
  );
};

export default ProfilePage;
