"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Image,
  Alert,
  Spinner,
} from "react-bootstrap";
import Link from "next/link";
import axios from "axios";

const AdminSignIn = () => {
  const [email, setEmail] = useState("superadmin@gmail.com");
  const [password, setPassword] = useState("superadmin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Clear local storage on component mount
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/api/v1/accounts/login/",
        {
          email,
          password,
        }
      );

      if (response.data && response.data.access) {
        const user = response.data.user;
        if (user && user.role === "SUPER_ADMIN") {
          localStorage.setItem("authToken", response.data.access);
          localStorage.setItem("user", JSON.stringify(user));
          router.push("/admin/dashboard");
        } else {
          setError("Access denied. Only administrators are allowed.");
        }
      } else {
        setError("Login failed. Please check your credentials.");
      }
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container
      fluid
      className="vh-100 d-flex align-items-center justify-content-center bg-light"
    >
      <Row>
        <Col md={12}>
          <Card style={{ width: "25rem" }} className="p-4 shadow-sm">
            <Card.Body>
              <div className="text-center mb-4">
                <Link href="/">
                  <Image
                    src={"/images/brand/logo/logo-icon.svg"}
                    className="mb-4"
                    alt="AttendStack Logo"
                    width="150"
                  />
                </Link>
                <p className="text-muted">Administrator Access</p>
              </div>

              {error && <Alert variant="danger">{error}</Alert>}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3" controlId="email">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="Enter email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3" controlId="password">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </Form.Group>

                <Button
                  variant="primary"
                  type="submit"
                  className="w-100"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        role="status"
                        aria-hidden="true"
                      />
                      <span className="ms-2">Signing In...</span>
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default AdminSignIn;