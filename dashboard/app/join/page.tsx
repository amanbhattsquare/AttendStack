"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Container, Card, Row, Col, Button, Form, Alert, Badge, Spinner, InputGroup } from "react-bootstrap";
import { IconCheck, IconEye, IconEyeOff, IconBuildingSkyscraper, IconUserCheck, IconCalendarEvent, IconBriefcase, IconFileCheck } from "@tabler/icons-react";
import axios from "axios";
import Link from "next/link";

export default function EmployeeJoinPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const code = searchParams.get("code") || "";
  const emailParam = searchParams.get("email") || "";

  const [orgName, setOrgName] = useState<string | null>(null);
  const [email, setEmail] = useState(emailParam);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!code) {
      setVerifyingCode(false);
      return;
    }

    const verifyCode = async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_ENDPOINT || "http://localhost:8001";
        const res = await axios.get(`${apiBase}/api/v1/accounts/organization-code/?code=${code}`);
        if (res.data && res.data.organization_name) {
          setOrgName(res.data.organization_name);
        }
      } catch (err: unknown) {
        if (axios.isAxiosError(err) && err.response?.data?.detail) {
          setError(err.response.data.detail);
        }
      } finally {
        setVerifyingCode(false);
      }
    };

    verifyCode();
  }, [code]);

  const handleLoginOrActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_ENDPOINT || "http://localhost:8001";
      const response = await axios.post(`${apiBase}/api/v1/accounts/login/`, {
        email,
        password,
      });

      if (response.data && response.data.access) {
        localStorage.setItem("authToken", response.data.access);
        localStorage.setItem("refreshToken", response.data.refresh);
        localStorage.setItem("user", JSON.stringify(response.data.user));
        setSuccess(true);
        setTimeout(() => {
          router.push("/employee-dashboard");
        }, 1200);
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError("Invalid email or password. Use your temporary password sent via email.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="min-vh-100 d-flex align-items-center justify-content-center py-5">
      <Row className="justify-content-center w-100">
        <Col md={8} lg={6}>
          <Card className="shadow-sm border-0 rounded-4 overflow-hidden">
            <div className="bg-primary text-white p-4 text-center">
              <IconBuildingSkyscraper size={44} className="mb-2" />
              <h2 className="fw-bold h4 mb-1">
                {orgName ? `Welcome to ${orgName}` : "Join Your Organization"}
              </h2>
              <p className="mb-0 text-white-50 fs-6">
                Your Employee Profile is created and Day 1 attendance is ready.
              </p>
            </div>

            <Card.Body className="p-4 p-md-5">
              {verifyingCode ? (
                <div className="text-center py-4">
                  <Spinner animation="border" variant="primary" className="mb-3" />
                  <p className="text-muted">Loading organization details...</p>
                </div>
              ) : (
                <>
                  {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
                  {success && (
                    <Alert variant="success" className="mb-4 d-flex align-items-center gap-2">
                      <IconCheck size={20} />
                      <span>Account activated! Redirecting to Employee Dashboard...</span>
                    </Alert>
                  )}

                  <div className="bg-light p-3 rounded-3 mb-4">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="fw-bold text-dark d-flex align-items-center gap-2">
                        <IconUserCheck size={18} className="text-primary" />
                        Transferred Information
                      </span>
                      <Badge bg="success">Transferred from SimplyJob</Badge>
                    </div>

                    <Row className="g-2 fs-6 text-muted">
                      {emailParam && (
                        <Col sm={6}>
                          <strong>Email:</strong> {emailParam}
                        </Col>
                      )}
                      <Col sm={6}>
                        <IconBriefcase size={16} className="me-1" />
                        <strong>Profile:</strong> Pre-filled & Ready
                      </Col>
                      <Col sm={6}>
                        <IconFileCheck size={16} className="me-1" />
                        <strong>Documents:</strong> Resume Attached
                      </Col>
                      <Col sm={6}>
                        <IconCalendarEvent size={16} className="me-1" />
                        <strong>Attendance:</strong> Active Day 1
                      </Col>
                    </Row>
                  </div>

                  <Form onSubmit={handleLoginOrActivate}>
                    <Form.Group className="mb-3" controlId="joinEmail">
                      <Form.Label className="fw-semibold">Registered Email</Form.Label>
                      <Form.Control
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </Form.Group>

                    <Form.Group className="mb-4" controlId="joinPassword">
                      <Form.Label className="fw-semibold">Password / Temporary Code</Form.Label>
                      <InputGroup>
                        <Form.Control
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter temporary password sent to email"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                        <Button
                          variant="outline-secondary"
                          onClick={() => setShowPassword(!showPassword)}
                          type="button"
                        >
                          {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                        </Button>
                      </InputGroup>
                      <Form.Text className="text-muted">
                        Check your email or message from your employer for your login password.
                      </Form.Text>
                    </Form.Group>

                    <Button
                      variant="primary"
                      type="submit"
                      className="w-100 py-2 fs-6 fw-bold rounded-3"
                      disabled={loading || success}
                    >
                      {loading ? (
                        <>
                          <Spinner as="span" animation="border" size="sm" className="me-2" />
                          Activating Access...
                        </>
                      ) : (
                        "Activate & Start Day 1 Attendance"
                      )}
                    </Button>
                  </Form>

                  <div className="text-center mt-4">
                    <small className="text-muted">
                      Need help? <Link href="/forgot-password">Reset your password</Link> or contact your HR manager.
                    </small>
                  </div>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
