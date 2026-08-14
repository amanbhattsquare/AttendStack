"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  Modal,
  Row,
  Spinner,
  Table,
  ProgressBar,
} from "react-bootstrap";
import {
  IconBuildingSkyscraper,
  IconShieldCheck,
  IconUsers,
  IconCalendarEvent,
  IconPlus,
  IconRefresh,
  IconArrowUpRight,
  IconActivity,
  IconCheck,
  IconAlertTriangle,
  IconCopy,
  IconChartBar,
} from "@tabler/icons-react";
import { ApexOptions } from "apexcharts";
import apiClient from "app/services/api";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

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

  // Modal States
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [onboardName, setOnboardName] = useState("");
  const [onboardLoading, setOnboardLoading] = useState(false);
  const [onboardSuccessMsg, setOnboardSuccessMsg] = useState("");

  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminSuccessMsg, setAdminSuccessMsg] = useState("");

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiClient.get("/api/v1/organizations/superadmin-overview/");
      setData(response.data);
    } catch {
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

  // Chart data setup for tenant companies
  const companyChartLabels = useMemo(() => {
    return (data?.organizations || []).slice(0, 6).map((o) => o.name);
  }, [data]);

  const companyWorkforceSeries = useMemo(() => {
    const workforce = (data?.organizations || []).slice(0, 6).map((o) => o.employee_count);
    const checkIns = (data?.organizations || []).slice(0, 6).map((o) => o.today_attendance_count);
    return [
      { name: "Total Staff", data: workforce },
      { name: "Today Check-ins", data: checkIns },
    ];
  }, [data]);

  const companyChartOptions: ApexOptions = {
    chart: {
      type: "bar",
      toolbar: { show: false },
      fontFamily: "Inter, sans-serif",
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "45%",
        borderRadius: 6,
      },
    },
    colors: ["#3b82f6", "#10b981"],
    dataLabels: { enabled: false },
    stroke: { show: true, width: 2, colors: ["transparent"] },
    xaxis: {
      categories: companyChartLabels,
      labels: { style: { fontSize: "12px", fontWeight: 500 } },
    },
    yaxis: {
      title: { text: "Employees" },
    },
    fill: { opacity: 1 },
    tooltip: {
      y: { formatter: (val: number) => `${val} staff members` },
    },
    grid: {
      borderColor: "#f1f5f9",
      strokeDashArray: 4,
    },
    legend: {
      position: "top",
      horizontalAlign: "right",
    },
  };

  // Onboard Company Handler
  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardName.trim()) return;
    setOnboardLoading(true);
    setOnboardSuccessMsg("");
    try {
      const response = await apiClient.post("/api/v1/organizations/", {
        name: onboardName.trim(),
      });
      setOnboardSuccessMsg(`Company "${response.data.name}" successfully onboarded! Invite Code: ${response.data.invite_code}`);
      setOnboardName("");
      loadOverview();
    } catch {
      alert("Failed to onboard company. Please try again.");
    } finally {
      setOnboardLoading(false);
    }
  };

  // Add HR Admin Handler
  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail.trim() || !adminPassword.trim() || !selectedOrgId) return;
    setAdminLoading(true);
    setAdminSuccessMsg("");
    try {
      await apiClient.post(`/api/v1/organizations/${selectedOrgId}/assign_owner/`, {
        name: adminName.trim() || adminEmail.split("@")[0],
        email: adminEmail.trim(),
        password: adminPassword.trim(),
      });
      setAdminSuccessMsg(`HR Owner account created and assigned successfully for ${adminEmail}!`);
      setAdminName("");
      setAdminEmail("");
      setAdminPassword("");
      setSelectedOrgId("");
      loadOverview();
    } catch {
      alert("Failed to create HR Administrator account. Verify details and try again.");
    } finally {
      setAdminLoading(false);
    }
  };

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
            <Button
              variant="warning"
              size="lg"
              className="fw-bold px-4 py-2.5 shadow-sm d-flex align-items-center gap-2 text-dark rounded-3"
              onClick={() => {
                setOnboardSuccessMsg("");
                setShowOnboardModal(true);
              }}
            >
              <IconPlus size={20} />
              Onboard Company
            </Button>
            <Button
              variant="outline-light"
              size="lg"
              className="fw-semibold px-4 py-2.5 d-flex align-items-center gap-2 rounded-3"
              onClick={() => {
                setAdminSuccessMsg("");
                setShowAdminModal(true);
              }}
            >
              <IconShieldCheck size={20} />
              Add HR Administrator
            </Button>
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

      {/* Analytics Chart Row */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Header className="bg-white border-0 py-3.5 d-flex align-items-center justify-content-between">
          <div>
            <h5 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
              <IconChartBar className="text-primary" size={22} />
              Tenant Workforce & Attendance Performance Graph
            </h5>
            <span className="text-secondary small">Comparison of registered workforce vs today's check-ins per tenant</span>
          </div>
        </Card.Header>
        <Card.Body className="pt-2 pb-4">
          {companyChartLabels.length > 0 ? (
            <Chart
              options={companyChartOptions}
              series={companyWorkforceSeries}
              type="bar"
              height={260}
            />
          ) : (
            <div className="text-center py-4 text-secondary">No tenant company analytics available yet.</div>
          )}
        </Card.Body>
      </Card>

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
                  <Button size="sm" variant="primary" onClick={() => setShowOnboardModal(true)}>
                    Onboard First Company
                  </Button>
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
                    <span className="fw-semibold text-dark small">Database Engine</span>
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

      {/* Onboard Company Modal */}
      <Modal show={showOnboardModal} onHide={() => setShowOnboardModal(false)} centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold">Onboard New Company Tenant</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleOnboardSubmit}>
          <Modal.Body className="pt-3">
            {onboardSuccessMsg && <Alert variant="success">{onboardSuccessMsg}</Alert>}
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold small">Company Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g. Acme Corporation"
                value={onboardName}
                onChange={(e) => setOnboardName(e.target.value)}
                required
              />
              <Form.Text className="text-muted">
                An automatic Onboarding Code (ORG-XXXXXXXX) will be generated.
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="border-0 pt-0">
            <Button variant="secondary" size="sm" onClick={() => setShowOnboardModal(false)}>
              Close
            </Button>
            <Button variant="warning" size="sm" type="submit" disabled={onboardLoading} className="fw-bold text-dark">
              {onboardLoading ? <Spinner size="sm" /> : "Onboard Company"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Add HR Administrator Modal */}
      <Modal show={showAdminModal} onHide={() => setShowAdminModal(false)} centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold">Create & Assign HR Administrator</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleAdminSubmit}>
          <Modal.Body className="pt-3">
            {adminSuccessMsg && <Alert variant="success">{adminSuccessMsg}</Alert>}
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold small">Select Company Tenant</Form.Label>
              <Form.Select
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                required
              >
                <option value="">-- Choose Company --</option>
                {(data?.organizations || []).map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.invite_code})
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold small">Full Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g. Jane Doe"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold small">Email Address</Form.Label>
              <Form.Control
                type="email"
                placeholder="admin@company.com"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold small">Initial Password</Form.Label>
              <Form.Control
                type="password"
                placeholder="Enter password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="border-0 pt-0">
            <Button variant="secondary" size="sm" onClick={() => setShowAdminModal(false)}>
              Close
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={adminLoading} className="fw-bold">
              {adminLoading ? <Spinner size="sm" /> : "Create & Assign HR Owner"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
}
