"use client";
import {
  Card,
  Col,
  Row,
  Button,
  Form,
  Table,
  Spinner,
} from "react-bootstrap";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import axios from "axios";
import { IconBuilding, IconUsers } from "@tabler/icons-react";

interface Organization {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
}

const AdminDashboard = () => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalEmployees, setTotalEmployees] = useState(0);

  const fetchOrganizations = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await axios.get("http://127.0.0.1:8000/api/v1/organizations/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setOrganizations(response.data.results);
    } catch (err) {
      setError("Failed to fetch organizations.");
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await axios.get("http://127.0.0.1:8000/api/v1/employees/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setTotalEmployees(response.data.count);
    } catch (err) {
      console.error("Failed to fetch employees count.");
    }
  };

  useEffect(() => {
    fetchOrganizations();
    fetchEmployees();
  }, []);

  const onSubmit = async (data: any) => {
    try {
      const token = localStorage.getItem("authToken");
      await axios.post("http://127.0.0.1:8000/api/v1/organizations/", data, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      reset();
      fetchOrganizations();
    } catch (err) {
      setError("Failed to create organization.");
    }
  };

  return (
    <div>
      <div className="employee-self-hero mb-4">
        <h2 className="mb-0">Welcome, Super Admin</h2>
        <p className="text-secondary">
          Manage your organizations and employees from this central hub.
        </p>
      </div>

      <Row className="g-4 mb-4">
        <Col md={6} xl={4}>
          <div className="employee-self-stat">
            <div className="text-secondary small">Total Organizations</div>
            <div className="fw-bold fs-5">{organizations.length}</div>
          </div>
        </Col>
        <Col md={6} xl={4}>
          <div className="employee-self-stat">
            <div className="text-secondary small">Total Employees</div>
            <div className="fw-bold fs-5">{totalEmployees}</div>
          </div>
        </Col>
      </Row>

      <Row className="g-4">
        <Col xs={12} lg={4}>
          <Card className="h-100">
            <Card.Header>
              <h5 className="mb-0">Create Organization</h5>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleSubmit(onSubmit)}>
                <Form.Group className="mb-3" controlId="name">
                  <Form.Label>Organization Name</Form.Label>
                  <Form.Control
                    type="text"
                    {...register("name", { required: true })}
                    placeholder="Enter organization name"
                  />
                  {errors.name && (
                    <span className="text-danger">This field is required</span>
                  )}
                </Form.Group>
                <hr />
                <h5 className="mb-3">Administrator Details</h5>
                <Form.Group className="mb-3" controlId="admin_full_name">
                  <Form.Label>Full Name</Form.Label>
                  <Form.Control
                    type="text"
                    {...register("admin_full_name", { required: true })}
                    placeholder="Enter admin's full name"
                  />
                  {errors.admin_full_name && (
                    <span className="text-danger">This field is required</span>
                  )}
                </Form.Group>
                <Form.Group className="mb-3" controlId="admin_email">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    {...register("admin_email", { required: true })}
                    placeholder="Enter admin's email"
                  />
                  {errors.admin_email && (
                    <span className="text-danger">This field is required</span>
                  )}
                </Form.Group>
                <Form.Group className="mb-3" controlId="admin_password">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    {...register("admin_password", { required: true })}
                    placeholder="Enter a secure password"
                  />
                  {errors.admin_password && (
                    <span className="text-danger">This field is required</span>
                  )}
                </Form.Group>
                <Button variant="primary" type="submit">
                  Create Organization
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} lg={8}>
          <Card className="h-100">
            <Card.Header>
              <h5 className="mb-0">Organizations</h5>
            </Card.Header>
            <Card.Body>
              {loading ? (
                <div className="text-center">
                  <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </Spinner>
                </div>
              ) : error ? (
                <p className="text-danger">{error}</p>
              ) : (
                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Active</th>
                      <th>Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {organizations.map((org) => (
                      <tr key={org.id}>
                        <td>{org.id}</td>
                        <td>{org.name}</td>
                        <td>{org.is_active ? "Yes" : "No"}</td>
                        <td>{new Date(org.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <style jsx global>{`
        .employee-self-hero,
        .employee-self-stat {
          background: #fff;
          border: 1px solid #edf1f5;
          border-radius: 10px;
          box-shadow: 0 2px 8px rgba(16, 24, 40, 0.04);
        }

        .employee-self-hero {
          padding: 24px;
        }

        .employee-self-stat {
          padding: 18px;
          height: 100%;
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;