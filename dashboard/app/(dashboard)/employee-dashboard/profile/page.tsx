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
  IconEye,
  IconEdit,
} from "@tabler/icons-react";
import { useCurrentEmployee } from "../useCurrentEmployee";
import { Spinner, Alert, Badge, Row, Col, Button, Modal, Form } from "react-bootstrap";
import { useEffect, useState } from "react";

type PersonalInfoForm = {
  fullName: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  aadhaarNumber: string;
  taxId: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;
};

const emptyPersonalInfoForm: PersonalInfoForm = {
  fullName: "",
  phone: "",
  dateOfBirth: "",
  address: "",
  aadhaarNumber: "",
  taxId: "",
  emergencyContactName: "",
  emergencyContactRelationship: "",
  emergencyContactPhone: "",
};

const EMPLOYEE_PROFILE_API = `${process.env.NEXT_PUBLIC_API_ENDPOINT}/api/v1/employees/me/`;

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
          <IconEye size={14} /> Preview document
        </a>
      )}
    </div>
  </div>
);

const ProfilePage = () => {
  const { employee, isLoading, error, refetch } = useCurrentEmployee();
  const [settings, setSettings] = useState<any>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [personalForm, setPersonalForm] = useState<PersonalInfoForm>(emptyPersonalInfoForm);
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [aadhaarDocumentFile, setAadhaarDocumentFile] = useState<File | null>(null);
  const [panCardDocumentFile, setPanCardDocumentFile] = useState<File | null>(null);
  const [cvDocumentFile, setCvDocumentFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState("");

  useEffect(() => {
    const loadSettings = async () => {
      const token = localStorage.getItem("authToken");
      if (!token) return;
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_ENDPOINT}/api/v1/settings/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          // Settings can be an array or a single object. We need the object.
          const settingsData = Array.isArray(data) ? data[0] : data;
          setSettings(settingsData);
        }
      } catch (err) {
        console.error("Error loading settings:", err);
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    if (!profilePhotoFile) {
      setPhotoPreview(null);
      return;
    }

    const objectUrl = URL.createObjectURL(profilePhotoFile);
    setPhotoPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [profilePhotoFile]);

  const logoUrl = settings?.company_logo || null;

  const openEditModal = () => {
    if (!employee) return;
    setPersonalForm({
      fullName: employee.full_name || "",
      phone: employee.phone || "",
      dateOfBirth: employee.date_of_birth || "",
      address: employee.address || "",
      aadhaarNumber: employee.aadhaar_number || "",
      taxId: employee.tax_id || "",
      emergencyContactName: employee.emergency_contact_name || "",
      emergencyContactRelationship: employee.emergency_contact_relationship || "",
      emergencyContactPhone: employee.emergency_contact_phone || "",
    });
    setProfilePhotoFile(null);
    setAadhaarDocumentFile(null);
    setPanCardDocumentFile(null);
    setCvDocumentFile(null);
    setProfileSaveError("");
    setIsEditOpen(true);
  };

  const closeEditModal = () => {
    if (isSavingProfile) return;
    setIsEditOpen(false);
    setProfilePhotoFile(null);
    setAadhaarDocumentFile(null);
    setPanCardDocumentFile(null);
    setCvDocumentFile(null);
    setPhotoPreview(null);
    setProfileSaveError("");
  };

  const updatePersonalField = <TKey extends keyof PersonalInfoForm>(field: TKey, value: PersonalInfoForm[TKey]) => {
    setPersonalForm((current) => ({ ...current, [field]: value }));
    setProfileSaveError("");
  };

  const parseProfileError = async (response: Response) => {
    const body = await response.json().catch(() => null);
    if (!body) return "Unable to update your personal information.";
    if (typeof body.detail === "string") return body.detail;
    return Object.values(body).flat().join(" ");
  };

  const handlePersonalInfoSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setProfileSaveError("");

    if (!personalForm.fullName.trim()) {
      setProfileSaveError("Full name is required.");
      return;
    }

    if (personalForm.phone && !/^\+?[0-9]{10,15}$/.test(personalForm.phone.trim())) {
      setProfileSaveError("Enter a valid phone number.");
      return;
    }

    if (personalForm.aadhaarNumber && !/^[0-9]{12}$/.test(personalForm.aadhaarNumber.trim())) {
      setProfileSaveError("Enter a valid 12-digit Aadhaar number.");
      return;
    }

    if (personalForm.taxId && personalForm.taxId.trim().length < 6) {
      setProfileSaveError("Enter a valid PAN or tax ID.");
      return;
    }

    if (
      personalForm.emergencyContactPhone &&
      !/^\+?[0-9]{10,15}$/.test(personalForm.emergencyContactPhone.trim())
    ) {
      setProfileSaveError("Enter a valid emergency contact phone number.");
      return;
    }

    setIsSavingProfile(true);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Please sign in again to update your profile.");

      const body = new FormData();
      body.append("full_name", personalForm.fullName.trim());
      body.append("phone", personalForm.phone.trim());
      body.append("date_of_birth", personalForm.dateOfBirth);
      body.append("address", personalForm.address.trim());
      body.append("aadhaar_number", personalForm.aadhaarNumber.trim());
      body.append("tax_id", personalForm.taxId.trim());
      body.append("emergency_contact_name", personalForm.emergencyContactName.trim());
      body.append("emergency_contact_relationship", personalForm.emergencyContactRelationship.trim());
      body.append("emergency_contact_phone", personalForm.emergencyContactPhone.trim());
      if (profilePhotoFile instanceof File) {
        body.append("profile_photo", profilePhotoFile);
      }
      if (aadhaarDocumentFile instanceof File) body.append("aadhaar_document", aadhaarDocumentFile);
      if (panCardDocumentFile instanceof File) body.append("pan_card_document", panCardDocumentFile);
      if (cvDocumentFile instanceof File) body.append("cv_document", cvDocumentFile);

      const response = await fetch(EMPLOYEE_PROFILE_API, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body,
      });

      if (!response.ok) {
        throw new Error(await parseProfileError(response));
      }

      await refetch();
      closeEditModal();
    } catch (saveError) {
      setProfileSaveError(saveError instanceof Error ? saveError.message : "Unable to update your personal information.");
    } finally {
      setIsSavingProfile(false);
    }
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
        { label: "Company", value: "Bhatt Square Pvt Ltd", icon: <IconUser size={18} /> },
        { label: "Employment Type", value: employee.employment_type_label, icon: <IconFileText size={18} /> },
        { label: "Reporting Manager", value: employee.reporting_manager || "Admin Desk", icon: <IconUser size={18} /> },
      ],
    },
    {
      title: "Employee Documents",
      items: [
        { label: "CV / Resume", value: employee.cv_document_url ? "Uploaded" : undefined, icon: <IconFileText size={18} />, linkUrl: employee.cv_document_url },
        { label: "Aadhaar Document", value: employee.aadhaar_document_url ? "Uploaded" : undefined, icon: <IconId size={18} />, linkUrl: employee.aadhaar_document_url },
        { label: "PAN Card", value: employee.pan_card_document_url ? "Uploaded" : undefined, icon: <IconId size={18} />, linkUrl: employee.pan_card_document_url },
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
            <div className="flex-grow-1">
              <div className="d-flex flex-wrap justify-content-center justify-content-sm-start align-items-center gap-2 mb-2">
                <h2 className="fw-bold mb-0 text-dark heading-profile-name">{employee.full_name}</h2>
                <Badge bg="success" className="px-3 py-2 bg-success-subtle text-success border border-success-subtle rounded-pill font-monospace">
                  {employee.status_label}
                </Badge>
              </div>
              <p className="text-secondary fw-semibold mb-0 fs-5">
                {employee.designation} <span className="mx-1 text-muted">-</span> {employee.department}
              </p>
              <span className="small text-muted d-block mt-2">Corporate Portal Account Active</span>
              <Button
                variant="primary"
                size="sm"
                className="d-inline-flex align-items-center gap-2 mt-3"
                onClick={openEditModal}
              >
                <IconEdit size={16} /> Edit Personal Info
              </Button>
            </div>
            <div className="ms-sm-auto text-sm-end">
              {settings ? (
                <div className="d-flex align-items-center gap-3">
                  {logoUrl && (
                    <img
                      src={logoUrl}
                      alt={`${settings.company_name} Logo`}
                      className="bg-light rounded-2 p-1"
                      style={{ height: "48px", width: "48px", objectFit: "contain" }}
                    />
                  )}
                  <div>
                    <h6 className="fw-bold mb-0 text-dark">{settings.company_name || "Company"}</h6>
                    <a
                      href={settings.company_website || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-secondary mb-0 small text-decoration-none"
                    >
                      {settings.company_website ? "Visit Website" : "Corporate Profile"}
                    </a>
                  </div>
                </div>
              ) : (
                <div className="text-muted small">Loading company info...</div>
              )}
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

      <Modal show={isEditOpen} onHide={closeEditModal} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit Personal Information</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handlePersonalInfoSubmit}>
          <Modal.Body>
            {profileSaveError && <Alert variant="danger" className="border-0">{profileSaveError}</Alert>}

            <div className="employee-edit-photo-panel mb-4">
              <div className="employee-edit-avatar-wrap">
                <img
                  src={photoPreview || employee.profile_photo_url || "/images/avatar/avatar-fallback.jpg"}
                  alt={employee.full_name}
                  className="employee-edit-avatar"
                />
                <Form.Label htmlFor="employeeProfilePhoto" className="employee-edit-photo-action" title="Change profile photo">
                  <IconEdit size={15} />
                  <span className="visually-hidden">Change profile photo</span>
                </Form.Label>
                <Form.Control
                  id="employeeProfilePhoto"
                  type="file"
                  accept="image/*"
                  className="d-none"
                  onChange={(event) => {
                    const input = event.currentTarget as HTMLInputElement;
                    setProfilePhotoFile(input.files?.[0] || null);
                  }}
                />
              </div>
            </div>

            <div className="mb-4">
              <h6 className="fw-bold mb-1">Employee documents</h6>
              <p className="small text-secondary mb-3">Upload or replace your CV, Aadhaar document, and PAN card. Files are stored securely.</p>
              <Row className="g-3">
                <Col xs={12} md={4}>
                  <Form.Group controlId="employeeCvDocument">
                    <Form.Label className="fw-semibold">CV / Resume</Form.Label>
                    <Form.Control type="file" accept=".pdf,.doc,.docx" onChange={(event) => setCvDocumentFile((event.currentTarget as HTMLInputElement).files?.[0] || null)} />
                    <Form.Text>{cvDocumentFile?.name || (employee.cv_document_url ? "Current CV uploaded" : "PDF, DOC, or DOCX; max 10 MB")}</Form.Text>
                  </Form.Group>
                </Col>
                <Col xs={12} md={4}>
                  <Form.Group controlId="employeeAadhaarDocument">
                    <Form.Label className="fw-semibold">Aadhaar Document</Form.Label>
                    <Form.Control type="file" accept=".pdf,image/jpeg,image/png,image/webp" onChange={(event) => setAadhaarDocumentFile((event.currentTarget as HTMLInputElement).files?.[0] || null)} />
                    <Form.Text>{aadhaarDocumentFile?.name || (employee.aadhaar_document_url ? "Current Aadhaar uploaded" : "PDF or image; max 10 MB")}</Form.Text>
                  </Form.Group>
                </Col>
                <Col xs={12} md={4}>
                  <Form.Group controlId="employeePanCardDocument">
                    <Form.Label className="fw-semibold">PAN Card</Form.Label>
                    <Form.Control type="file" accept=".pdf,image/jpeg,image/png,image/webp" onChange={(event) => setPanCardDocumentFile((event.currentTarget as HTMLInputElement).files?.[0] || null)} />
                    <Form.Text>{panCardDocumentFile?.name || (employee.pan_card_document_url ? "Current PAN card uploaded" : "PDF or image; max 10 MB")}</Form.Text>
                  </Form.Group>
                </Col>
              </Row>
            </div>

            <Row className="g-3">
              <Col xs={12} md={6}>
                <Form.Group controlId="employeeFullName">
                  <Form.Label className="fw-semibold">Full Name</Form.Label>
                  <Form.Control
                    value={personalForm.fullName}
                    onChange={(event) => updatePersonalField("fullName", event.target.value)}
                    maxLength={150}
                    required
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group controlId="employeePhone">
                  <Form.Label className="fw-semibold">Phone Number</Form.Label>
                  <Form.Control
                    type="tel"
                    value={personalForm.phone}
                    onChange={(event) => updatePersonalField("phone", event.target.value)}
                    maxLength={15}
                    required
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group controlId="employeeAadhaarNumber">
                  <Form.Label className="fw-semibold">Aadhaar Number</Form.Label>
                  <Form.Control
                    type="text"
                    value={personalForm.aadhaarNumber}
                    onChange={(event) => updatePersonalField("aadhaarNumber", event.target.value.replace(/\D/g, "").slice(0, 12))}
                    maxLength={12}
                    placeholder="12-digit Aadhaar number"
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group controlId="employeeTaxId">
                  <Form.Label className="fw-semibold">Tax ID / PAN Number</Form.Label>
                  <Form.Control
                    type="text"
                    value={personalForm.taxId}
                    onChange={(event) => updatePersonalField("taxId", event.target.value.toUpperCase())}
                    maxLength={20}
                    placeholder="ABCDE1234F"
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group controlId="employeeDateOfBirth">
                  <Form.Label className="fw-semibold">Date of Birth</Form.Label>
                  <Form.Control
                    type="date"
                    value={personalForm.dateOfBirth}
                    onChange={(event) => updatePersonalField("dateOfBirth", event.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Form.Group controlId="employeeAddress">
                  <Form.Label className="fw-semibold">Address</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={personalForm.address}
                    onChange={(event) => updatePersonalField("address", event.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col xs={12}>
                <hr className="my-2" />
                <h6 className="fw-bold mb-0">Emergency Contact</h6>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group controlId="employeeEmergencyContactName">
                  <Form.Label className="fw-semibold">Contact Name</Form.Label>
                  <Form.Control
                    value={personalForm.emergencyContactName}
                    onChange={(event) => updatePersonalField("emergencyContactName", event.target.value)}
                    maxLength={150}
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group controlId="employeeEmergencyRelationship">
                  <Form.Label className="fw-semibold">Relationship</Form.Label>
                  <Form.Control
                    value={personalForm.emergencyContactRelationship}
                    onChange={(event) => updatePersonalField("emergencyContactRelationship", event.target.value)}
                    maxLength={80}
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group controlId="employeeEmergencyPhone">
                  <Form.Label className="fw-semibold">Contact Phone</Form.Label>
                  <Form.Control
                    type="tel"
                    value={personalForm.emergencyContactPhone}
                    onChange={(event) => updatePersonalField("emergencyContactPhone", event.target.value)}
                    maxLength={15}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={closeEditModal} disabled={isSavingProfile}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={isSavingProfile}>
              {isSavingProfile ? <><Spinner size="sm" animation="border" className="me-2" />Saving...</> : "Save Changes"}
            </Button>
          </Modal.Footer>
        </Form>
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

        .employee-edit-photo-panel {
          display: inline-block;
        }

        .employee-edit-avatar-wrap {
          position: relative;
          width: 76px;
          height: 76px;
        }

        .employee-edit-avatar {
          width: 76px;
          height: 76px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid #fff;
          box-shadow: 0 2px 8px rgba(16, 24, 40, 0.08);
          background: #fff;
        }

        .employee-edit-photo-action {
          position: absolute;
          right: -3px;
          bottom: -3px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          margin: 0;
          border: 2px solid #fff;
          border-radius: 50%;
          background: #0d6efd;
          color: #fff;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.2);
        }

        .employee-edit-photo-action:hover {
          background: #0b5ed7;
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
