"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Alert, Button, Card, Col, Container, Form, InputGroup, Row, Spinner } from "react-bootstrap";
import { IconBuildingCommunity, IconCamera, IconCircleCheck, IconEye, IconEyeOff, IconLock, IconUserCheck, IconX } from "@tabler/icons-react";

const apiRoot = (process.env.NEXT_PUBLIC_API_ENDPOINT || "").replace(/\/$/, "");

type EmployeeFormData = {
  organization_code: string;
  full_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  aadhaar_number: string;
  address: string;
  bank_name: string;
  bank_account_number: string;
  ifsc_code: string;
  tax_id: string;
  emergency_contact_name: string;
  emergency_contact_relationship: string;
  emergency_contact_phone: string;
  password: string;
  confirm_password: string;
};

type FieldErrors = Partial<Record<keyof EmployeeFormData, string>>;

const initialForm: EmployeeFormData = {
  organization_code: "", full_name: "", email: "", phone: "", date_of_birth: "", aadhaar_number: "", address: "", bank_name: "", bank_account_number: "", ifsc_code: "", tax_id: "",
  emergency_contact_name: "", emergency_contact_relationship: "", emergency_contact_phone: "",
  password: "", confirm_password: "",
};

const errorMessage = (error: unknown) => {
  if (!axios.isAxiosError(error)) return "We could not create your account. Please try again.";
  const data = error.response?.data;
  if (typeof data?.detail === "string") return data.detail;
  if (data && typeof data === "object") {
    const first = Object.values(data).flat().find((item) => typeof item === "string");
    if (typeof first === "string") return first;
  }
  return "Please check your details and try again.";
};

export default function EmployeeRegistrationPage() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [success, setSuccess] = useState(false);
  const [organizationName, setOrganizationName] = useState("");
  const [organizationCodeStatus, setOrganizationCodeStatus] = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const [profilePhotoError, setProfilePhotoError] = useState("");
  const [aadhaarDocument, setAadhaarDocument] = useState<File | null>(null);
  const [panCardDocument, setPanCardDocument] = useState<File | null>(null);
  const [cvDocument, setCvDocument] = useState<File | null>(null);

  const update = (key: keyof EmployeeFormData, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
  };

  useEffect(() => {
    if (!success) return;
    const redirectTimer = window.setTimeout(() => router.replace("/sign-in"), 3000);
    return () => window.clearTimeout(redirectTimer);
  }, [success, router]);

  useEffect(() => () => {
    if (profilePhotoPreview) URL.revokeObjectURL(profilePhotoPreview);
  }, [profilePhotoPreview]);

  const updateProfilePhoto = (file?: File) => {
    setProfilePhotoError("");
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setProfilePhotoError("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProfilePhotoError("Your photo must be 5 MB or smaller.");
      return;
    }
    setProfilePhoto(file);
    setProfilePhotoPreview(URL.createObjectURL(file));
  };

  const removeProfilePhoto = () => {
    setProfilePhoto(null);
    setProfilePhotoPreview(null);
    setProfilePhotoError("");
  };

  useEffect(() => {
    const code = form.organization_code.trim().toUpperCase();
    const isCompleteCode = /^ORG-[A-HJ-NP-Z2-9]{8}$/.test(code);

    setOrganizationName("");
    if (!isCompleteCode) {
      setOrganizationCodeStatus(code ? "invalid" : "idle");
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setOrganizationCodeStatus("checking");
      try {
        const response = await axios.get(`${apiRoot}/api/v1/accounts/organization-code/`, {
          params: { code },
          signal: controller.signal,
        });
        setOrganizationName(response.data.organization_name);
        setOrganizationCodeStatus("valid");
      } catch (requestError) {
        if (!axios.isCancel(requestError) && !controller.signal.aborted) {
          setOrganizationCodeStatus("invalid");
        }
      }
    }, 400);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [form.organization_code]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const nextErrors: FieldErrors = {};
    const email = form.email.trim();
    const phone = form.phone.trim();

    if (!form.organization_code.trim()) nextErrors.organization_code = "Organization code is required.";
    else if (organizationCodeStatus !== "valid") nextErrors.organization_code = "Enter a valid active organization code.";
    if (form.full_name.trim().split(/\s+/).filter(Boolean).length < 2) nextErrors.full_name = "Enter your first and last name.";
    if (!/^\S+@\S+\.\S+$/.test(email)) nextErrors.email = "Enter a valid email address.";
    if (!/^\+?[0-9]{10,15}$/.test(phone)) nextErrors.phone = "Enter a valid 10 to 15 digit phone number.";
    if (form.password.length < 8) nextErrors.password = "Use at least 8 characters.";
    if (form.confirm_password !== form.password) nextErrors.confirm_password = "Passwords do not match.";

    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      setError("Please correct the highlighted fields before creating your account.");
      return;
    }
    if (organizationCodeStatus !== "valid") {
      return;
    }
    setLoading(true);
    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (key !== "date_of_birth" || value) payload.append(key, value);
    });
    if (profilePhoto) payload.append("profile_photo", profilePhoto);
    if (aadhaarDocument) payload.append("aadhaar_document", aadhaarDocument);
    if (panCardDocument) payload.append("pan_card_document", panCardDocument);
    if (cvDocument) payload.append("cv_document", cvDocument);

    try {
      await axios.post(`${apiRoot}/api/v1/accounts/register-employee/`, payload);
      setSuccess(true);
    } catch (requestError) {
      if (axios.isAxiosError(requestError) && requestError.response?.data && typeof requestError.response.data === "object") {
        const apiErrors: FieldErrors = {};
        Object.entries(requestError.response.data).forEach(([key, value]) => {
          if (key in initialForm && Array.isArray(value) && typeof value[0] === "string") {
            apiErrors[key as keyof EmployeeFormData] = value[0];
          }
        });
        setFieldErrors(apiErrors);
      }
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container fluid className="min-vh-100 py-5 d-flex align-items-center" style={{ background: "radial-gradient(circle, rgba(248,250,252,1) 0%, rgba(238,244,255,1) 100%)" }}>
      <Row className="justify-content-center w-100 mx-0">
        <Col lg={8} xl={7}>
          <Card className="border-0 shadow-lg rounded-4 overflow-hidden">
            <Card.Body className="p-4 p-md-5">
              <div className="text-center mb-4">
                <span className="bg-primary-subtle text-primary rounded-3 p-3 d-inline-block mb-3"><IconUserCheck size={32} /></span>
                <h1 className="h3 mb-1">Create Your Employee Account</h1>
                <p className="text-secondary mb-0">Join your team by using the organization code provided by your employer.</p>
              </div>

              {success ? (
                <div className="text-center p-4">
                  <IconCircleCheck size={48} className="text-success mb-3" />
                  <h2 className="h4 fw-bold">Account Created Successfully!</h2>
                  <p className="text-secondary mb-4">Welcome aboard! We're thrilled to have you. You will be redirected to the sign-in page shortly.</p>
                  <Link href="/sign-in" className="btn btn-primary">Sign In Now</Link>
                </div>
              ) : (
                <Form onSubmit={submit} noValidate>
                  {error && <Alert variant="danger" className="mb-4 border-0"><strong>Please review your form.</strong> {error}</Alert>}

                  <div className="rounded-3 border bg-body-tertiary p-3 mb-4 d-flex gap-3">
                    <IconBuildingCommunity className="text-primary flex-shrink-0 mt-1" size={21} />
                    <div><strong>Organization code required</strong><p className="small text-secondary mb-0">Ask your HR or organization owner for their current code. This keeps your account connected to the right company.</p></div>
                  </div>

                  <Row className="g-3">
                    <Col md={6}><Form.Group controlId="organization-code"><Form.Label>Organization code</Form.Label><Form.Control value={form.organization_code} onChange={(e) => update("organization_code", e.target.value.toUpperCase())} placeholder="ORG-XXXXXXXX" required autoCapitalize="characters" isValid={organizationCodeStatus === "valid"} isInvalid={Boolean(fieldErrors.organization_code) || (organizationCodeStatus === "invalid" && form.organization_code.length > 0)} /><Form.Text className={organizationCodeStatus === "valid" ? "text-success" : undefined}>{organizationCodeStatus === "checking" ? "Verifying organization…" : organizationCodeStatus === "valid" ? "Organization verified" : ""}</Form.Text><Form.Control.Feedback type="invalid">{fieldErrors.organization_code || "Enter a valid active organization code."}</Form.Control.Feedback></Form.Group></Col>
                    <Col md={6}><Form.Group controlId="organization-name"><Form.Label>Company name</Form.Label><Form.Control value={organizationName} readOnly placeholder="Appears after your code is verified" aria-describedby="organization-name-help" isValid={organizationCodeStatus === "valid"} /><Form.Text id="organization-name-help">This confirms the company you will join.</Form.Text></Form.Group></Col>
                    <Col md={6}><Form.Group controlId="full-name"><Form.Label>Full name</Form.Label><Form.Control value={form.full_name} onChange={(e) => update("full_name", e.target.value)} placeholder="e.g., Priya Sharma" autoComplete="name" required isInvalid={Boolean(fieldErrors.full_name)} /><Form.Control.Feedback type="invalid">{fieldErrors.full_name}</Form.Control.Feedback></Form.Group></Col>
                    <Col md={6}><Form.Group controlId="email"><Form.Label>Work email <span className="text-secondary fw-normal">(used to sign in)</span></Form.Label><Form.Control type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="you@company.com" autoComplete="email" required aria-describedby="email-login-help" isInvalid={Boolean(fieldErrors.email)} /><Form.Control.Feedback type="invalid">{fieldErrors.email}</Form.Control.Feedback><Form.Text id="email-login-help">Use an email address you can access. You will use it to sign in to AttendStack.</Form.Text></Form.Group></Col>
                    <Col md={6}><Form.Group controlId="phone"><Form.Label>Phone number</Form.Label><Form.Control type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="9876543210" autoComplete="tel" required isInvalid={Boolean(fieldErrors.phone)} /><Form.Control.Feedback type="invalid">{fieldErrors.phone}</Form.Control.Feedback></Form.Group></Col>
                    <Col md={6}><Form.Group controlId="dob"><Form.Label>Date of birth <span className="text-secondary">(optional)</span></Form.Label><Form.Control type="date" value={form.date_of_birth} onChange={(e) => update("date_of_birth", e.target.value)} autoComplete="bday" /></Form.Group></Col>
                    <Col md={6}><Form.Group controlId="address"><Form.Label>Address <span className="text-secondary">(optional)</span></Form.Label><Form.Control value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="City, State, PIN code" autoComplete="street-address" /></Form.Group></Col>
                  </Row>

                  <h2 className="h6 mt-4 mb-3">Emergency contact <span className="text-secondary fw-normal">(optional)</span></h2>
                  <Row className="g-3">
                    <Col md={4}><Form.Control aria-label="Emergency contact name" placeholder="Full name" value={form.emergency_contact_name} onChange={(e) => update("emergency_contact_name", e.target.value)} /></Col>
                    <Col md={4}><Form.Control aria-label="Relationship" placeholder="Relationship" value={form.emergency_contact_relationship} onChange={(e) => update("emergency_contact_relationship", e.target.value)} /></Col>
                    <Col md={4}><Form.Control type="tel" aria-label="Emergency contact phone" placeholder="Phone number" value={form.emergency_contact_phone} onChange={(e) => update("emergency_contact_phone", e.target.value)} /></Col>
                  </Row>

                  <Form.Group className="mt-4" controlId="profile-photo"><Form.Label>Professional profile photo <span className="text-secondary">(recommended)</span></Form.Label><div className="d-flex flex-column flex-sm-row align-items-sm-center gap-3 rounded-3 border bg-body-tertiary p-3">{profilePhotoPreview ? <img src={profilePhotoPreview} alt="Profile photo preview" className="rounded-circle border object-fit-cover" width={72} height={72} /> : <span className="d-inline-flex align-items-center justify-content-center rounded-circle bg-primary-subtle text-primary" style={{ width: 72, height: 72 }}><IconCamera size={27} /></span>}<div className="flex-grow-1"><Form.Control type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => updateProfilePhoto((e.target as HTMLInputElement).files?.[0])} aria-describedby="profile-photo-help profile-photo-error" /><Form.Text id="profile-photo-help">Use a clear headshot. JPEG, PNG, or WebP; maximum 5 MB.</Form.Text>{profilePhotoError && <div id="profile-photo-error" className="small text-danger mt-1">{profilePhotoError}</div>}</div>{profilePhotoPreview && <Button type="button" variant="outline-secondary" size="sm" onClick={removeProfilePhoto}><IconX size={16} className="me-1" />Remove</Button>}</div></Form.Group>

                  <h2 className="h6 mt-4 mb-3">Identity and bank details</h2>
                  <p className="small text-secondary mb-3">These details are stored securely and help your company complete payroll setup.</p>
                  <Row className="g-3">
                    <Col md={6}><Form.Group controlId="aadhaar-number"><Form.Label>Aadhaar number</Form.Label><Form.Control inputMode="numeric" value={form.aadhaar_number} onChange={(e) => update("aadhaar_number", e.target.value.replace(/\D/g, "").slice(0, 12))} placeholder="12-digit Aadhaar number" maxLength={12} /><Form.Text>Enter digits only.</Form.Text></Form.Group></Col>
                    <Col md={6}><Form.Group controlId="tax-id"><Form.Label>Tax ID / PAN number</Form.Label><Form.Control value={form.tax_id} onChange={(e) => update("tax_id", e.target.value.toUpperCase())} placeholder="ABCDE1234F" maxLength={20} /></Form.Group></Col>
                    <Col md={6}><Form.Group controlId="bank-name"><Form.Label>Bank name</Form.Label><Form.Control value={form.bank_name} onChange={(e) => update("bank_name", e.target.value)} placeholder="e.g., HDFC Bank" autoComplete="off" /></Form.Group></Col>
                    <Col md={6}><Form.Group controlId="bank-account-number"><Form.Label>Bank account number</Form.Label><Form.Control value={form.bank_account_number} onChange={(e) => update("bank_account_number", e.target.value.replace(/\s/g, ""))} placeholder="Enter your account number" inputMode="numeric" autoComplete="off" /></Form.Group></Col>
                    <Col md={6}><Form.Group controlId="ifsc-code"><Form.Label>IFSC code</Form.Label><Form.Control value={form.ifsc_code} onChange={(e) => update("ifsc_code", e.target.value.toUpperCase().replace(/\s/g, ""))} placeholder="HDFC0001234" maxLength={11} autoCapitalize="characters" /></Form.Group></Col>
                  </Row>

                  <h2 className="h6 mt-4 mb-3">Employee documents</h2>
                  <p className="small text-secondary mb-3">Upload clear copies for company verification. Each file can be up to 10 MB.</p>
                  <Row className="g-3">
                    <Col md={4}><Form.Group controlId="aadhaar-document"><Form.Label>Aadhaar document</Form.Label><Form.Control type="file" accept=".pdf,image/jpeg,image/png,image/webp" onChange={(e) => setAadhaarDocument((e.target as HTMLInputElement).files?.[0] || null)} /><Form.Text>{aadhaarDocument?.name || "PDF, JPG, PNG, or WebP"}</Form.Text></Form.Group></Col>
                    <Col md={4}><Form.Group controlId="pan-card-document"><Form.Label>PAN card</Form.Label><Form.Control type="file" accept=".pdf,image/jpeg,image/png,image/webp" onChange={(e) => setPanCardDocument((e.target as HTMLInputElement).files?.[0] || null)} /><Form.Text>{panCardDocument?.name || "PDF, JPG, PNG, or WebP"}</Form.Text></Form.Group></Col>
                    <Col md={4}><Form.Group controlId="cv-document"><Form.Label>CV / Resume</Form.Label><Form.Control type="file" accept=".pdf,.doc,.docx" onChange={(e) => setCvDocument((e.target as HTMLInputElement).files?.[0] || null)} /><Form.Text>{cvDocument?.name || "PDF, DOC, or DOCX"}</Form.Text></Form.Group></Col>
                  </Row>

                  <h2 className="h6 mt-4 mb-3">Secure your account</h2>
                  <Row className="g-3">
                    <Col md={6}><Form.Group controlId="password"><Form.Label>Password</Form.Label><InputGroup><Form.Control type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => update("password", e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" minLength={8} required isInvalid={Boolean(fieldErrors.password)} /><Button type="button" variant="outline-secondary" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}</Button></InputGroup><Form.Control.Feedback type="invalid" className="d-block">{fieldErrors.password}</Form.Control.Feedback></Form.Group></Col>
                    <Col md={6}><Form.Group controlId="confirm-password"><Form.Label>Confirm password</Form.Label><Form.Control type={showPassword ? "text" : "password"} value={form.confirm_password} onChange={(e) => update("confirm_password", e.target.value)} placeholder="Re-enter your password" autoComplete="new-password" minLength={8} required isInvalid={Boolean(fieldErrors.confirm_password)} /><Form.Control.Feedback type="invalid">{fieldErrors.confirm_password}</Form.Control.Feedback></Form.Group></Col>
                  </Row>

                  <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-3 mt-4 pt-3 border-top">
                    <small className="text-secondary d-flex align-items-center gap-1"><IconLock size={15} /> Your salary and job details cannot be entered here.</small>
                    <Button type="submit" disabled={loading}>{loading ? <><Spinner size="sm" className="me-2" />Creating account…</> : "Create employee account"}</Button>
                  </div>
                </Form>
              )}
              {!success && <p className="text-center text-secondary small mt-4 mb-0">Already have an account? <Link href="/sign-in">Sign in</Link></p>}
            </Card.Body>
          </Card>
          <p className="text-center text-secondary small mt-3 mb-0">Setting up a company? <Link href="/register-organization">Create an organization workspace</Link></p>
        </Col>
      </Row>
    </Container>
  );
}