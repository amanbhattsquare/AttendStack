"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { Alert, Button, Card, Col, Container, Form, InputGroup, Row, Spinner } from "react-bootstrap";
import { IconBuilding, IconCopy, IconEye, IconEyeOff, IconShieldCheck } from "@tabler/icons-react";

const apiRoot = (process.env.NEXT_PUBLIC_API_ENDPOINT || "").replace(/\/$/, "");

export default function OrganizationRegistrationPage() {
  const [form, setForm] = useState({ organization_name: "", full_name: "", email: "", phone: "", password: "", confirm_password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await axios.post(`${apiRoot}/api/v1/accounts/register-organization/`, form);
      setInviteCode(response.data.organization.invite_code);
    } catch (requestError) {
      const data = axios.isAxiosError(requestError) ? requestError.response?.data : null;
      const firstError = data && typeof data === "object" ? Object.values(data).flat().find((value) => typeof value === "string") : null;
      setError(typeof firstError === "string" ? firstError : "Please check your details and try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(inviteCode);
  };

  return (
    <Container fluid className="min-vh-100 bg-light py-5 d-flex align-items-center">
      <Row className="justify-content-center w-100 mx-0"><Col md={9} lg={7} xl={6}>
        <Card className="border-0 shadow-sm"><Card.Body className="p-4 p-md-5">
          <div className="text-center mb-4"><span className="d-inline-flex p-3 rounded-3 bg-primary-subtle text-primary mb-3"><IconBuilding size={29} /></span><h1 className="h3 mb-2">Create your organization workspace</h1><p className="text-secondary mb-0">Set up the company owner account and receive a secure code for employee onboarding.</p></div>
          {inviteCode ? (
            <Alert variant="success" className="mb-0 text-center"><IconShieldCheck size={28} className="mb-2" /><h2 className="h5">Your workspace is ready</h2><p>Share this organization code only with employees who should join your workspace.</p><InputGroup className="mb-3"><Form.Control value={inviteCode} readOnly className="text-center fw-bold" /><Button variant="success" onClick={copyCode} aria-label="Copy organization code"><IconCopy size={18} /></Button></InputGroup><Link href="/admin/sign-in" className="btn btn-success">Sign in to your company workspace</Link></Alert>
          ) : <Form onSubmit={submit} noValidate>{error && <Alert variant="danger">{error}</Alert>}<Row className="g-3"><Col xs={12}><Form.Group controlId="organization-name"><Form.Label>Organization name</Form.Label><Form.Control value={form.organization_name} onChange={(e) => update("organization_name", e.target.value)} autoComplete="organization" required /></Form.Group></Col><Col md={6}><Form.Group controlId="owner-name"><Form.Label>Your full name</Form.Label><Form.Control value={form.full_name} onChange={(e) => update("full_name", e.target.value)} autoComplete="name" required /></Form.Group></Col><Col md={6}><Form.Group controlId="owner-phone"><Form.Label>Phone number</Form.Label><Form.Control type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} autoComplete="tel" required /></Form.Group></Col><Col xs={12}><Form.Group controlId="owner-email"><Form.Label>Work email</Form.Label><Form.Control type="email" value={form.email} onChange={(e) => update("email", e.target.value)} autoComplete="email" required /></Form.Group></Col><Col md={6}><Form.Group controlId="owner-password"><Form.Label>Password</Form.Label><InputGroup><Form.Control type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => update("password", e.target.value)} autoComplete="new-password" minLength={8} required /><Button type="button" variant="outline-secondary" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}</Button></InputGroup></Form.Group></Col><Col md={6}><Form.Group controlId="owner-confirm-password"><Form.Label>Confirm password</Form.Label><Form.Control type={showPassword ? "text" : "password"} value={form.confirm_password} onChange={(e) => update("confirm_password", e.target.value)} autoComplete="new-password" minLength={8} required /></Form.Group></Col></Row><Button type="submit" className="w-100 mt-4" disabled={loading}>{loading ? <><Spinner size="sm" className="me-2" />Creating workspace…</> : "Create organization"}</Button></Form>}
          {!inviteCode && <p className="text-center text-secondary small mt-4 mb-0">Already have a company account? <Link href="/admin/sign-in">Company sign in</Link></p>}
        </Card.Body></Card>
        <p className="text-center text-secondary small mt-3 mb-0">Joining an existing company? <Link href="/register">Create an employee account</Link></p>
      </Col></Row>
    </Container>
  );
}
