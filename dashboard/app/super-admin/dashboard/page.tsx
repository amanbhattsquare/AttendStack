"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Row,
  Spinner,
  Table,
  ProgressBar,
} from "react-bootstrap";
import {
  IconBuildingSkyscraper,
  IconShieldCheck,
  IconUsers,
  IconUserCheck,
  IconCalendarEvent,
  IconPlus,
  IconRefresh,
  IconArrowUpRight,
  IconActivity,
  IconCheck,
  IconAlertTriangle,
  IconEye,
  IconCopy,
} from "@tabler/icons-react";
import apiClient from "app/services/api";

type OverviewData = {
  summary: {
    total_companies: number;
    active_companies: number;
    inactive_companies: number;
    total_users: number;
    total_hrs: number;
    total_employees: number;
    today_attendance: number;
    pending_leaves: number;
  };
  organizations: Array<{
    id: number;
    name: string;
    invite_code: string;
    owner_name: string | null;
    owner_email: string | null;
    is_active: boolean;
    created_at: string;
    employee_count: number;
    active_employee_count: number;
    today_attendance_count: number;
  }>;
};

export default function SuperAdminDashboardPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiClient.get("/api/v1/organizations/superadmin-overview/");
      setData(response.data);
    } catch (err: any) {
      setError("Unable to load live Super Admin statistics. Please refresh or verify credentials.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
    const interval = setInterval(loadOverview, 60000);
    return () => clearInterval(interval);
  }, [loadOverview]);

  const copyInviteCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const attendancePercentage = useMemo(() => {
    if (!data?.summary?.total_employees) return 0;
    return Math.round((data.summary.today_attendance / data.summary.total_employees) * 100);
  }, [data]);

  return (
    <Container fluid className="py-4 super-admin-dashboard-page">
      {/* Top Banner Control Hub */}
      <Card className="border-0 shadow-sm mb-4 bg-dark text-white rounded-4 overflow-hidden" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)" }}>
        <Card.Body className="p-4 p-lg-5 d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-4">
          <div>
            <div className="d-flex align-items-center gap-2 mb-2">
              <Badge bg="warning" text="dark" className="fw-bold font-monospace px-3 py-1.5 rounded-pill" style={{ letterSpacing: "0.05em" }}>
                SUPER ADMIN SYSTEM
              </Badge>
              <span className="text-white-50 small d-flex align-items-center gap-1">
                <IconActivity size={14} className="text-success" /> Live Multi-Tenant Control Engine
              </span>
            </div>
            <h2 className="display-6 fw-bold text-white mb-2">Platform Master Overview</h2>
            <p className="text-white-50 mb-0 max-w-2xl">
              Welcome to your dedicated Super Admin Command Center. Manage all company accounts, onboard HR owners, monitor global workforce metrics, and control tenant permissions.
            </p>
          </div>
          <div className="d-flex flex-wrap align-items-center gap-2.5">
            <Link href="/super-admin/companies" className="btn btn-warning btn-lg fw-bold px-4 py-2.5 shadow-sm d-flex align-items-center gap-2 text-dark rounded-3">
              <IconPlus size={20} />
              Onboard Company
            </Link>
            <Link href="/super-admin/admins" className="btn btn-outline-light btn-lg fw-semibold px-4 py-2.5 d-flex align-items-center gap-2 rounded-3">
              <IconShieldCheck size={20} />
              Add HR Administrator
            </Link>
          </div>
        </Card.Body>
      </Card>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError("")} className="border-0 shadow-sm d-flex align-items-center gap-2 mb-4">
          <IconAlertTriangle size={20} />
          {error}
        </Alert>
      )}

      {/* Primary Platform Metric Cards */}
      <Row className="g-3.5 mb-4">
        <Col xs={12} sm={6} xl={3}>
          <Card className="border-0 shadow-sm h-100 stat-card">
            <Card.Body className="p-3.5 d-flex align-items-center gap-3">
              <div className="rounded-3 p-3 bg-primary-subtle text-primary d-flex align-items-center justify-content-center">
                <IconBuildingSkyscraper size={30} />
              </div>
              <div>
                <span className="text-secondary small fw-bold text-uppercase d-block mb-0.5">Total Companies</span>
                <h3 className="mb-0 fw-bold text-dark">{loading ? <Spinner size="sm" /> : data?.summary?.total_companies ?? 0}</h3>
                <span className="text-success small fw-medium">{data?.summary?.active_companies ?? 0} Active Tenants</span>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} xl={3}>
          <Card className="border-0 shadow-sm h-100 stat-card">
            <Card.Body className="p-3.5 d-flex align-items-center gap-3">
              <div className="rounded-3 p-3 bg-info-subtle text-info d-flex align-items-center justify-content-center">
                <IconUsers size={30} />
              </div>
              <div>
                <span className="text-secondary small fw-bold text-uppercase d-block mb-0.5">Global Workforce</span>
                <h3 className="mb-0 fw-bold text-dark">{loading ? <Spinner size="sm" /> : data?.summary?.total_employees ?? 0}</h3>
                <span className="text-info small fw-medium">Employees across orgs</span>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} xl={3}>
          <Card className="border-0 shadow-sm h-100 stat-card">
            <Card.Body className="p-3.5 d-flex align-items-center gap-3">
              <div className="rounded-3 p-3 bg-success-subtle text-success d-flex align-items-center justify-content-center">
                <IconCalendarEvent size={30} />
              </div>
              <div>
                <span className="text-secondary small fw-bold text-uppercase d-block mb-0.5">Today Check-ins</span>
                <h3 className="mb-0 fw-bold text-dark">{loading ? <Spinner size="sm" /> : data?.summary?.today_attendance ?? 0}</h3>
                <span className="text-success small fw-medium">{attendancePercentage}% attendance rate</span>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} xl={3}>
          <Card className="border-0 shadow-sm h-100 stat-card">
            <Card.Body className="p-3.5 d-flex align-items-center gap-3">
              <div className="rounded-3 p-3 bg-warning-subtle text-warning d-flex align-items-center justify-content-center">
                <IconShieldCheck size={30} />
              </div>
              <div>
                <span className="text-secondary small fw-bold text-uppercase d-block mb-0.5">HR Managers</span>
                <h3 className="mb-0 fw-bold text-dark">{loading ? <Spinner size="sm" /> : data?.summary?.total_hrs ?? 0}</h3>
                <span className="text-warning-emphasis small fw-medium">Active tenant managers</span>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Main Content Grid */}
      <Row className="g-4 mb-4">
        {/* Managed Companies Quick Directory */}
        <Col xs={12} lg={8}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white border-0 py-3.5 d-flex align-items-center justify-content-between">
              <div>
                <h5 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                  <IconBuildingSkyscraper className="text-primary" size={22} />
                  Registered Company Tenants
                </h5>
                <span className="text-secondary small">Live view of companies and onboarding access codes</span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <Button size="sm" variant="outline-secondary" onClick={loadOverview} disabled={loading}>
                  <IconRefresh size={15} className={loading ? "spin" : ""} />
                </Button>
                <Link href="/super-admin/companies" className="btn btn-primary btn-sm px-3 fw-semibold">
                  Manage All Companies <IconArrowUpRight size={16} />
                </Link>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                </div>
              ) : !data?.organizations || data.organizations.length === 0 ? (
                <div className="text-center py-5">
                  <p className="text-secondary mb-2">No tenant companies created yet.</p>
                  <Link href="/super-admin/companies" className="btn btn-primary btn-sm">
                    Onboard First Company
                  </Link>
                </div>
              ) : (
                <Table responsive hover className="align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-4">Company</th>
                      <th>HR Owner</th>
                      <th>Onboarding Code</th>
                      <th>Workforce</th>
                      <th>Today Check-ins</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.organizations.slice(0, 6).map((org) => (
                      <tr key={org.id}>
                        <td className="ps-4">
                          <div className="d-flex align-items-center gap-2">
                            <div className="rounded bg-primary-subtle text-primary fw-bold d-flex align-items-center justify-content-center" style={{ width: 34, height: 34 }}>
                              {org.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <strong className="text-dark d-block fs-6">{org.name}</strong>
                              <span className="text-secondary small">ID: #{org.id}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div>
                            <span className="fw-semibold text-dark d-block">{org.owner_name || "Unassigned"}</span>
                            <small className="text-secondary">{org.owner_email || "No email"}</small>
                          </div>
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-1.5">
                            <code className="fw-bold text-primary bg-primary-subtle px-2 py-0.5 rounded font-monospace">
                              {org.invite_code}
                            </code>
                            <Button
                              size="sm"
                              variant="light"
                              className="p-1 border shadow-xs"
                              onClick={() => copyInviteCode(org.invite_code)}
                              title="Copy Code"
                            >
                              {copiedCode === org.invite_code ? <IconCheck size={13} className="text-success" /> : <IconCopy size={13} className="text-secondary" />}
                            </Button>
                          </div>
                        </td>
                        <td>
                          <span className="fw-bold text-dark">{org.employee_count}</span>
                          <span className="text-secondary small"> ({org.active_employee_count} active)</span>
                        </td>
                        <td>
                          <Badge bg="info-subtle" text="info" className="border border-info-subtle px-2.5 py-1">
                            {org.today_attendance_count} present
                          </Badge>
                        </td>
                        <td>
                          <Badge bg={org.is_active ? "success" : "danger"} className="px-2.5 py-1 rounded-pill">
                            {org.is_active ? "Active" : "Suspended"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Platform Control & System Health Column */}
        <Col xs={12} lg={4}>
          <Card className="border-0 shadow-sm mb-4">
            <Card.Header className="bg-white border-0 py-3.5">
              <h5 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                <IconActivity className="text-success" size={22} />
                Platform System Health
              </h5>
            </Card.Header>
            <Card.Body className="pt-0">
              <div className="p-3 bg-light rounded-3 mb-3 border">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="small fw-semibold text-secondary">Attendance Rate Platform-wide</span>
                  <span className="fw-bold text-dark">{attendancePercentage}%</span>
                </div>
                <ProgressBar variant={attendancePercentage >= 50 ? "success" : "warning"} now={attendancePercentage} style={{ height: 8 }} />
              </div>

              <div className="d-flex flex-column gap-2.5">
                <div className="d-flex align-items-center justify-content-between p-2.5 border rounded">
                  <div className="d-flex align-items-center gap-2">
                    <div className="rounded-circle bg-success p-1" />
                    <span className="fw-semibold text-dark small">Django REST Backend API</span>
                  </div>
                  <Badge bg="success-subtle" text="success">Operational</Badge>
                </div>

                <div className="d-flex align-items-center justify-content-between p-2.5 border rounded">
                  <div className="d-flex align-items-center gap-2">
                    <div className="rounded-circle bg-success p-1" />
                    <span className="fw-semibold text-dark small">Database (SQLite/PostgreSQL)</span>
                  </div>
                  <Badge bg="success-subtle" text="success">Healthy</Badge>
                </div>

                <div className="d-flex align-items-center justify-content-between p-2.5 border rounded">
                  <div className="d-flex align-items-center gap-2">
                    <div className="rounded-circle bg-success p-1" />
                    <span className="fw-semibold text-dark small">JWT Auth Token Refresh</span>
                  </div>
                  <Badge bg="success-subtle" text="success">Active</Badge>
                </div>

                <div className="d-flex align-items-center justify-content-between p-2.5 border rounded">
                  <div className="d-flex align-items-center gap-2">
                    <div className="rounded-circle bg-info p-1" />
                    <span className="fw-semibold text-dark small">SimplyJob SSO Integration</span>
                  </div>
                  <Badge bg="info-subtle" text="info">Ready</Badge>
                </div>
              </div>
            </Card.Body>
          </Card>

          {/* Quick Shortcuts */}
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4 text-center">
              <IconShieldCheck size={36} className="text-warning mb-2" />
              <h6 className="fw-bold text-dark mb-1">Super Admin Quick Actions</h6>
              <p className="text-secondary small mb-3">Manage company tenants, create HR admins, or view audit logs.</p>
              <div className="d-grid gap-2">
                <Link href="/super-admin/companies" className="btn btn-outline-primary btn-sm fw-semibold">
                  <IconBuildingSkyscraper size={16} className="me-1" /> Companies Workspace Manager
                </Link>
                <Link href="/super-admin/admins" className="btn btn-outline-warning btn-sm fw-semibold text-dark">
                  <IconShieldCheck size={16} className="me-1" /> Manage HR & Admin Accounts
                </Link>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

    </Container>
  );
}
