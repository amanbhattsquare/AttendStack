"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Alert,
  Spinner,
  InputGroup,
  Image,
  Badge,
} from "react-bootstrap";
import {
  IconEye,
  IconEyeOff,
  IconShieldCheck,
  IconCheck,
  IconArrowLeft,
} from "@tabler/icons-react";
import axios from "axios";
import Link from "next/link";

export default function SuperAdminLoginPage() {
  const [email, setEmail] = useState("superadmin@attendstack.com");
  const [password, setPassword] = useState("SuperAdmin@123");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleFillCredentials = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email || !password) {
      setError("Email and password are required.");
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_ENDPOINT}/api/v1/accounts/login/`,
        {
          email,
          password,
        }
      );

      if (response.data && response.data.access) {
        const user = response.data.user;
        if (user && (user.role === "SUPER_ADMIN" || user.is_superuser)) {
          localStorage.setItem("authToken", response.data.access);
          localStorage.setItem("refreshToken", response.data.refresh);
          localStorage.setItem("user", JSON.stringify(user));
          router.push("/super-admin/dashboard");
        } else {
          setError("Access denied. This account does not have Super Admin privileges.");
        }
      } else {
        setError("Login failed. Please check your Super Admin credentials.");
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && typeof err.response?.data?.detail === "string") {
        setError(err.response.data.detail);
      } else {
        setError("An unexpected authentication error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light py-5">
      <Container>
        <Row className="justify-content-center">
          <Col md={12} className="d-flex justify-content-center">
            <Card
              style={{ width: "min(26rem, calc(100vw - 2rem))" }}
              className="p-4 shadow-sm border-0 rounded-4"
            >
              <Card.Body>
                <div className="text-center mb-4">
                  <Link href="/" aria-label="AttendStack Home">
                    <Image
                      src="/images/brand/logo/logo.png"
                      className="mb-3 rounded-3"
                      alt="AttendStack Logo"
                      style={{ height: "60px", width: "auto", objectFit: "contain" }}
                    />
                  </Link>
                  <div className="d-flex justify-content-center mb-2">
                    <Badge bg="warning" text="dark" className="font-monospace px-3 py-1 rounded-pill fw-bold" style={{ letterSpacing: "0.05em", fontSize: "0.7rem" }}>
                      SUPER ADMIN SYSTEM GATEWAY
                    </Badge>
                  </div>
                  <h1 className="h4 fw-bold text-dark mb-1">Super Admin Login</h1>
                  <p className="text-muted small mb-0">Platform master authentication for multi-tenant control</p>
                </div>

                {error && (
                  <Alert variant="danger" className="py-2 px-3 small border-0 shadow-xs mb-3">
                    {error}
                  </Alert>
                )}

                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3" controlId="superAdminEmail">
                    <Form.Label className="small fw-semibold text-secondary">Super Admin Email</Form.Label>
                    <Form.Control
                      type="email"
                      placeholder="superadmin@attendstack.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </Form.Group>

                  <Form.Group className="mb-4" controlId="superAdminPassword">
                    <Form.Label className="small fw-semibold text-secondary">Password</Form.Label>
                    <InputGroup>
                      <Form.Control
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                      />
                      <Button
                        type="button"
                        variant="outline-secondary"
                        onClick={() => setShowPassword((visible) => !visible)}
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                      </Button>
                    </InputGroup>
                  </Form.Group>

                  <Button
                    variant="warning"
                    type="submit"
                    className="w-100 fw-bold text-dark py-2.5 shadow-sm rounded-3 mb-3 d-flex align-items-center justify-content-center gap-2"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Signing In...
                      </>
                    ) : (
                      <>
                        <IconShieldCheck size={20} />
                        Sign In to Super Admin Panel
                      </>
                    )}
                  </Button>
                </Form>

                {/* Pre-fill Helper Box */}
                <div className="p-3 rounded-3 mt-3 bg-light border">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="small text-secondary font-monospace fw-bold">Default Super Admin Credentials:</span>
                  </div>
                  <div className="d-grid gap-1.5">
                    <Button
                      size="sm"
                      variant="outline-secondary"
                      className="text-start py-1 px-2 font-monospace text-dark bg-white"
                      style={{ fontSize: "0.75rem" }}
                      onClick={() => handleFillCredentials("superadmin@attendstack.com", "SuperAdmin@123")}
                    >
                      <IconCheck size={14} className="text-success me-1" />
                      superadmin@attendstack.com / SuperAdmin@123
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-secondary"
                      className="text-start py-1 px-2 font-monospace text-dark bg-white"
                      style={{ fontSize: "0.75rem" }}
                      onClick={() => handleFillCredentials("admin@gmail.com", "SuperAdmin@123")}
                    >
                      <IconCheck size={14} className="text-success me-1" />
                      admin@gmail.com / SuperAdmin@123
                    </Button>
                  </div>
                </div>

                <div className="text-center mt-4">
                  <Link href="/sign-in" className="text-secondary small text-decoration-none d-inline-flex align-items-center gap-1">
                    <IconArrowLeft size={16} /> Back to Employee & Company Login
                  </Link>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
}
