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
  IconDownload,
  IconEdit,
} from "@tabler/icons-react";
import { useCurrentEmployee } from "../useCurrentEmployee";
import { Spinner, Alert, Badge, Row, Col, Modal, Button } from "react-bootstrap";
import { useState } from "react";
import EmployeeFormWizard from "../../employees/components/EmployeeFormWizard";
import { EmployeeFormData } from "../../employees/components/EmployeeFormWizard";

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
    maximumFractionDigits: 0,
  }).format(Number(value));
};

const valueOrFallback = (value?: string | null) => {
  return value && value.trim() ? value : "Not provided";
};

const ProfileItem = ({ label, value, icon, linkUrl }: { label: string; value?: string | null; icon: React.ReactNode; linkUrl?: string | null }) => (
  <div className="my-profile-item border shadow-xs h-100 d-flex gap-3 align-items-start p-3 bg-white rounded-3 transition-all hover-lift">
    <div className="my-profile-icon d-flex align-items-center justify-content-center flex-shrink-0">
      {icon}
    </div>
    <div className="flex-grow-1">
      <span className="my-profile-label text-uppercase text-muted small fw-bold d-block mb-1">{label}</span>
      <span className="my-profile-value text-dark fw-semibold d-block">
        {valueOrFallback(value)}
      </span>
      {linkUrl && (
        <a 
          href={linkUrl} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="btn btn-link btn-sm text-primary p-0 d-inline-flex align-items-center gap-1 mt-2 fw-semibold text-decoration-none"
        >
          <IconDownload size={14} /> Download Document
        </a>
      )}
    </div>
  </div>
);

const ProfilePage = () => {
  const { employee, isLoading, error, refetch } = useCurrentEmployee();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleOpenEditModal = () => {
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
  };

  const handleSave = () => {
    handleCloseEditModal();
    refetch();
  };
  
  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-6 min-vh-50">
        <div className="text-center">
          <Spinner animation="border" variant="primary" role="status" className="mb-3">
            <span className="visually-hidden">Loading Profile...</span>
          </Spinner>
          <p className="text-secondary">Retrieving secure employee records...</p>
        </div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <Alert variant="danger" className="border-0 shadow-sm p-4">
        <h5 className="fw-bold mb-2">Failed to load profile</h5>
        <p className="mb-0">{error || "Unable to retrieve your personal employee profile."}</p>
      </Alert>
    );
  }

  const sections = [
    {
      title: "Personal Information",
      items: [
        { label: "Full Name", value: employee.full_name, icon: <IconUser size={18} /> },
        { label: "Email Address", value: employee.email, icon: <IconMail size={18} /> },
        { label: "Phone Number", value: employee.phone, icon: <IconPhone size={18} /> },
        { label: "Date of Birth", value: formatDate(employee.date_of_birth), icon: <IconCalendar size={18} /> },
        { 
          label: "Aadhaar Card", 
          value: employee.aadhaar_number, 
          icon: <IconId size={18} />,
          linkUrl: employee.aadhaar_document_url 
        },
        { label: "Permanent Address", value: employee.address, icon: <IconMapPin size={18} /> },
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
        { label: "Reporting Manager", value: employee.reporting_manager || "Admin Desk", icon: <IconUser size={18} /> },
      ],
    },
    {
      title: "Salary & Bank Credentials",
      items: [
        { label: "Annual CTC Package", value: formatCurrency(employee.annual_salary), icon: <IconWallet size={18} /> },
        { label: "Pay Frequency", value: employee.pay_frequency_label, icon: <IconCalendar size={18} /> },
        { label: "Bank Name", value: employee.bank_name, icon: <IconBuildingBank size={18} /> },
        { label: "Account Number", value: employee.bank_account_number, icon: <IconId size={18} /> },
        { label: "Tax ID / PAN Card", value: employee.tax_id, icon: <IconFileText size={18} /> },
      ],
    },
  ];

  return (
    <div className="employee-profile-container py-3">
      {/* Profile Header Card */}
      <div className="card border-0 shadow-sm mb-5 my-profile-header-card overflow-hidden position-relative">
        <div className="profile-glow"></div>
        <div className="card-body p-4 position-relative">
          <div className="d-flex flex-column flex-sm-row align-items-center gap-4 text-center text-sm-start">
            <img
              src={employee.profile_photo_url || "/images/avatar/avatar-fallback.jpg"}
              alt={employee.full_name}
              className="rounded-circle border border-4 border-white shadow-sm my-profile-avatar-img"
            />
            <div>
              <div className="d-flex flex-wrap justify-content-center justify-content-sm-start align-items-center gap-2 mb-2">
                <h2 className="fw-bold mb-0 text-dark heading-profile-name">{employee.full_name}</h2>
                <Badge bg="success" className="px-3 py-2 bg-success-subtle text-success border border-success-subtle rounded-pill font-monospace">
                  {employee.status_label}
                </Badge>
              </div>
              <p className="text-secondary fw-semibold mb-0 fs-5">
                {employee.designation} <span className="mx-1 text-muted">•</span> {employee.department}
              </p>
              <span className="small text-muted d-block mt-2">Corporate Portal Account Active</span>
            </div>
            <div className="ms-sm-auto">
              <Button variant="outline-primary" onClick={handleOpenEditModal} className="d-flex align-items-center gap-2">
                <IconEdit size={16} /> Edit Profile
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Sections rendering */}
      {sections.map((section) => (
        <div className="mb-5" key={section.title}>
          <h4 className="fw-bold mb-4 text-dark section-title-decor">{section.title}</h4>
          <Row className="g-4">
            {section.items.map((item) => (
              <Col md={6} xl={4} key={item.label}>
                <ProfileItem {...item} />
              </Col>
            ))}
          </Row>
        </div>
      ))}

      <Modal show={isEditModalOpen} onHide={handleCloseEditModal} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit Your Profile</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {employee && (
            <EmployeeFormWizard
              mode="edit"
              employeeId={employee.id}
              initialData={employee as unknown as Partial<EmployeeFormData>}
              onSave={handleSave}
              onCancel={handleCloseEditModal}
            />
          )}
        </Modal.Body>
      </Modal>

      <style jsx global>{`
        .employee-profile-container {
          font-family: 'Inter', sans-serif;
        }

        .my-profile-header-card {
          background: #ffffff;
          border: 1px solid #eef2f6 !important;
          border-radius: 16px;
        }

        .profile-glow {
          position: absolute;
          width: 250px;
          height: 250px;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.04) 0%, rgba(255, 255, 255, 0) 70%);
          right: -30px;
          top: -30px;
          pointer-events: none;
        }

        .my-profile-avatar-img {
          width: 104px;
          height: 104px;
          object-fit: cover;
        }

        .my-profile-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: #eeebff;
          color: #4f46e5;
        }

        .hover-lift {
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }

        .hover-lift:hover {
          transform: translateY(-2px);
          border-color: #4f46e5 !important;
          box-shadow: 0 6px 15px rgba(79, 70, 229, 0.05) !important;
        }

        .section-title-decor {
          font-family: 'Outfit', sans-serif;
          position: relative;
          padding-left: 12px;
          letter-spacing: -0.3px;
        }

        .section-title-decor::before {
          content: "";
          position: absolute;
          left: 0;
          top: 4px;
          bottom: 4px;
          width: 4px;
          background: #4f46e5;
          border-radius: 2px;
        }

        .heading-profile-name {
          font-family: 'Outfit', sans-serif;
          letter-spacing: -0.5px;
        }
      `}</style>
    </div>
  );
};

export default ProfilePage;