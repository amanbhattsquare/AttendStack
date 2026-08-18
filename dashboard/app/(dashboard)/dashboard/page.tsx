"use client";

import { Fragment, useEffect, useState, useMemo } from "react";
import { Badge, Card, Col, Row, Table, Spinner, Button, Modal } from "react-bootstrap";
import { IconUsers, IconListCheck, IconClock, IconSnowboarding, IconRefresh, IconBuildingBank, IconCopy, IconCheck, IconExternalLink } from "@tabler/icons-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import UpcomingIncrementsChartWidget from "components/UpcomingIncrementsChartWidget";
import ProjectDeliveryOverviewWidget from "components/dashboard/ProjectDeliveryOverviewWidget";
import { ApexOptions } from "apexcharts";

// SSR safe dynamic import for ApexCharts
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const BASE_URL = `${process.env.NEXT_PUBLIC_API_ENDPOINT}/api/v1`;

const authHeaders = (): HeadersInit => {
  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const formatDate = (value?: string | null) => {
  if (!value) return "--";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
};

const formatTime = (value?: string | null) => {
  if (!value) return "--";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit" }).format(date);
};

const DashboardPage = () => {
  const [todayRecords, setTodayRecords] = useState<any[]>([]);
  const [recentEmployees, setRecentEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = async () => {
    setIsLoading(true);
    setError("");
    try {
      // 1. Fetch today's live status for stats & check-ins
      const todayRes = await fetch(`${BASE_URL}/attendance/today/`, { headers: authHeaders() });
      if (!todayRes.ok) throw new Error("Failed to load today's statistics.");
      const todayData = await todayRes.json();
      setTodayRecords(todayData);

      // 2. Fetch recent employees
      const empRes = await fetch(`${BASE_URL}/employees/?ordering=-joining_date&limit=5`, { headers: authHeaders() });
      if (empRes.ok) {
        const empData = await empRes.json();
        setRecentEmployees(Array.isArray(empData) ? empData : empData.results || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data.");
    } finally {
      setIsLoading(false);
    }
  };

  const [showOrgModal, setShowOrgModal] = useState(false);
  const [organization, setOrganization] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const fetchOrg = async () => {
    try {
      let orgData: any = null;

      // 1. Try local storage cache first
      if (typeof window !== "undefined") {
        const cachedOrgStr = localStorage.getItem("organization");
        if (cachedOrgStr) {
          try {
            orgData = JSON.parse(cachedOrgStr);
          } catch {
            // Ignore parse error
          }
        }
      }

      // 2. Query direct user workspace organization from backend
      try {
        const meRes = await fetch(`${BASE_URL}/organizations/me/`, { headers: authHeaders() });
        if (meRes.ok) {
          orgData = await meRes.json();
        }
      } catch {
        // Fallback to list query
      }

      if (!orgData || !orgData.id) {
        const res = await fetch(`${BASE_URL}/organizations/?scope=me`, { headers: authHeaders() });
        if (res.ok) {
          const data = await res.json();
          const orgs = Array.isArray(data) ? data : data.results || [];
          if (orgs.length > 0) {
            orgData = orgs[0];
          }
        }
      }

      // 3. Fallback list query with smart filtering
      if (!orgData || !orgData.id) {
        const fallbackRes = await fetch(`${BASE_URL}/organizations/`, { headers: authHeaders() });
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          const orgs = Array.isArray(fallbackData) ? fallbackData : fallbackData.results || [];
          if (orgs.length > 0) {
            const storedUserStr = typeof window !== "undefined" ? localStorage.getItem("user") : null;
            const storedUser = storedUserStr ? JSON.parse(storedUserStr) : null;
            const userEmail = storedUser?.email?.toLowerCase() || "";

            orgData =
              (userEmail && orgs.find((o: any) => o.owner_email && o.owner_email.toLowerCase() === userEmail)) ||
              orgs.find((o: any) => (o.name || "").toLowerCase().includes("bhatt")) ||
              orgs[0];
          }
        }
      }

      if (orgData) {
        setOrganization(orgData);
        if (typeof window !== "undefined") {
          localStorage.setItem("organization", JSON.stringify(orgData));
        }
        const hasSeenModal = typeof window !== "undefined" ? sessionStorage.getItem("attendstack_org_popup_seen") : "true";
        if (!hasSeenModal) {
          setShowOrgModal(true);
          if (typeof window !== "undefined") sessionStorage.setItem("attendstack_org_popup_seen", "true");
        }
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchData();
    fetchOrg();
  }, []);

  // Personalized dynamic greeting
  const greeting = useMemo(() => {
    const hrs = new Date().getHours();
    if (hrs < 12) return "Good morning";
    if (hrs < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const isRecordPresent = (r: any) =>
    Boolean(r.check_in) ||
    ["Present", "Clocked In", "Clocked Out", "Half Day", "Half-day", "Late", "Late Entry"].includes(r.live_status) ||
    ["PRESENT", "LATE", "HALF_DAY"].includes(r.status);

  const isRecordLate = (r: any) =>
    ["Late", "Late Entry"].includes(r.live_status) || r.status === "LATE";

  const isRecordOnLeave = (r: any) =>
    ["Leave", "Paid Leave", "On Leave"].includes(r.live_status) ||
    ["LEAVE", "PAID_LEAVE"].includes(r.status);

  // Compute live KPIs
  const stats = useMemo(() => {
    const total = todayRecords.length;
    const present = todayRecords.filter(isRecordPresent).length;
    const late = todayRecords.filter(isRecordLate).length;
    const onLeave = todayRecords.filter(isRecordOnLeave).length;
    const onTimePresent = Math.max(present - late, 0);
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;

    return {
      total,
      present,
      onTimePresent,
      late,
      onLeave,
      rate,
    };
  }, [todayRecords]);

  // Compute department distribution and attendance data for table & chart
  const departmentStats = useMemo(() => {
    const summary: Record<string, { total: number; present: number; absent: number; leave: number }> = {};
    todayRecords.forEach((r) => {
      const dept = r.employee_department || "General";
      if (!summary[dept]) {
        summary[dept] = { total: 0, present: 0, absent: 0, leave: 0 };
      }
      summary[dept].total += 1;
      if (isRecordPresent(r)) {
        summary[dept].present += 1;
      } else if (isRecordOnLeave(r)) {
        summary[dept].leave += 1;
      } else {
        summary[dept].absent += 1;
      }
    });

    return Object.entries(summary).map(([name, counts]) => ({
      name,
      ...counts,
    }));
  }, [todayRecords]);

  // Donut Chart arrays
  const chartSeries = useMemo(() => departmentStats.map((d) => d.total), [departmentStats]);
  const chartLabels = useMemo(() => departmentStats.map((d) => d.name), [departmentStats]);

  const chartOptions: ApexOptions = {
    chart: {
      type: "donut",
    },
    labels: chartLabels,
    colors: ["#6366f1", "#10b981", "#f59e0b", "#06b6d4", "#8b5cf6", "#ec4899", "#6b7280"],
    legend: {
      position: "bottom",
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${Math.round(val)}%`,
    },
    plotOptions: {
      pie: {
        donut: {
          size: "65%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Workforce",
              formatter: () => String(stats.total),
            },
          },
        },
      },
    },
  };

  const absentCount = Math.max(stats.total - stats.present - stats.onLeave, 0);

  const attendanceChartSeries = [
    {
      name: "Employees",
      data: [stats.onTimePresent, stats.late, stats.onLeave, absentCount],
    },
  ];

  const attendanceChartOptions: ApexOptions = {
    chart: {
      type: "bar",
      toolbar: { show: false },
      fontFamily: "Inter, sans-serif",
    },
    plotOptions: {
      bar: {
        borderRadius: 8,
        columnWidth: "40%",
        distributed: true,
        dataLabels: {
          position: "top",
        },
      },
    },
    colors: ["#10b981", "#f59e0b", "#06b6d4", "#ef4444"],
    dataLabels: {
      enabled: true,
      offsetY: -20,
      style: {
        fontSize: "12px",
        colors: ["#374151"],
      },
    },
    xaxis: {
      categories: ["Present", "Late Entries", "On Leave", "Absent"],
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: {
          fontSize: "13px",
          fontWeight: 600,
        },
      },
    },
    yaxis: {
      labels: {
        show: true,
      },
    },
    grid: {
      borderColor: "#f1f5f9",
      strokeDashArray: 4,
    },
    legend: {
      show: false,
    },
    tooltip: {
      y: {
        formatter: (val: number) => `${val} employees`,
      },
    },
  };

  // Compute recent activity: Checked in employees sorted by check_in time descending
  const recentActivities = useMemo(() => {
    return todayRecords
      .filter((r) => r.check_in)
      .sort((a, b) => new Date(b.check_in).getTime() - new Date(a.check_in).getTime())
      .slice(0, 5)
      .map((r) => {
        let colorClass = "success";
        let desc = `${r.employee_name} checked in successfully.`;
        if (r.live_status === "Late Entry") {
          colorClass = "warning";
          desc = `${r.employee_name} checked in (Late Entry).`;
        } else if (r.live_status === "Half-day") {
          colorClass = "info";
          desc = `${r.employee_name} marked as Half-day.`;
        }
        return {
          description: desc,
          timestamp: formatTime(r.check_in),
          colorClass,
        };
      });
  }, [todayRecords]);

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "400px" }}>
        <Spinner animation="border" variant="primary" role="status">
          <span className="visually-hidden">Loading dashboard...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <Fragment>
      {/* Dynamic inline premium styles */}
      <style>{`
        .stat-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .stat-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 16px rgba(0,0,0,0.06) !important;
        }
        .activity-item {
          transition: background-color 0.2s ease;
        }
        .activity-item:hover {
          background-color: rgba(0, 0, 0, 0.015);
        }
        .activity-item:hover .activity-dot {
          transform: scale(1.3);
        }
        .activity-dot {
          transition: transform 0.25s ease;
        }
      `}</style>

      <div className="d-flex justify-content-between align-items-center mb-6">
        <div>
          <h2 className="mb-0 fw-bold">{greeting}, Admin</h2>
          <p className="text-secondary mb-0">Overview of company workforce, attendance, and recent activities.</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Button variant="primary" size="sm" onClick={() => setShowOrgModal(true)} className="d-flex align-items-center gap-2 px-3 shadow-sm fw-semibold">
            <IconBuildingBank size={16} /> My Company Org ID ({organization?.invite_code || "ORG-ID"})
          </Button>
          <Button variant="outline-primary" size="sm" onClick={fetchData} className="d-flex align-items-center gap-2 px-3 shadow-sm">
            <IconRefresh size={16} /> Sync Data
          </Button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Stats row */}
      <Row className="g-6 mb-6">
        {/* Total Employees */}
        <Col xl={3} md={6}>
          <Card className="card-lg bg-light-primary border-0 stat-card">
            <Card.Body className="d-flex flex-column gap-6">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="fw-semibold text-dark">Total Employees</div>
                </div>
                <div className="text-primary"><IconUsers size={24} strokeWidth={1.5} /></div>
              </div>
              <div className="lh-1 d-flex flex-column gap-2">
                <div className="fs-1 fw-bold text-dark">{stats.total}</div>
                <p className="mb-0 small">
                  <span className="text-primary me-1 fw-semibold">Active</span>
                  <span className="text-secondary">Workforce</span>
                </p>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Attendance Rate */}
        <Col xl={3} md={6}>
          <Card className="card-lg bg-light-success border-0 stat-card">
            <Card.Body className="d-flex flex-column gap-6">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="fw-semibold text-dark">Attendance Rate</div>
                </div>
                <div className="text-success"><IconListCheck size={24} strokeWidth={1.5} /></div>
              </div>
              <div className="lh-1 d-flex flex-column gap-2">
                <div className="fs-1 fw-bold text-dark">{stats.rate}%</div>
                <p className="mb-0 small">
                  <span className="text-success me-1 fw-semibold">{stats.present}/{stats.total}</span>
                  <span className="text-secondary">Present today</span>
                </p>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Late Entries */}
        <Col xl={3} md={6}>
          <Card className="card-lg bg-light-warning border-0 stat-card">
            <Card.Body className="d-flex flex-column gap-6">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="fw-semibold text-dark">Late Entries</div>
                </div>
                <div className="text-warning"><IconClock size={24} strokeWidth={1.5} /></div>
              </div>
              <div className="lh-1 d-flex flex-column gap-2">
                <div className="fs-1 fw-bold text-dark">{stats.late}</div>
                <p className="mb-0 small">
                  <span className="text-warning me-1 fw-semibold">After 10:00 AM</span>
                  <span className="text-secondary">cutoff</span>
                </p>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* On Leave Today */}
        <Col xl={3} md={6}>
          <Card className="card-lg bg-light-info border-0 stat-card">
            <Card.Body className="d-flex flex-column gap-6">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="fw-semibold text-dark">On Leave Today</div>
                </div>
                <div className="text-info"><IconSnowboarding size={24} strokeWidth={1.5} /></div>
              </div>
              <div className="lh-1 d-flex flex-column gap-2">
                <div className="fs-1 fw-bold text-dark">{stats.onLeave}</div>
                <p className="mb-0 small">
                  <span className="text-info me-1 fw-semibold">Approved</span>
                  <span className="text-secondary">time-off today</span>
                </p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Project Delivery Overview & Live Tasks Section */}
      <ProjectDeliveryOverviewWidget />

      <Row className="g-6 mb-6">
        {/* Left column: Recent Joiners & workforce breakdown chart */}
        <Col xl={8}>
          {/* Workforce Distribution Chart & Breakdown Card */}
          <Card className="border-0 shadow-sm mb-6">
            <Card.Header className="bg-white py-4">
              <h5 className="mb-0 fw-bold">Workforce Department Analytics</h5>
            </Card.Header>
            <Card.Body>
              {chartSeries.length > 0 ? (
                <Row className="align-items-center g-4">
                  {/* Left: Donut Chart */}
                  <Col lg={5} className="d-flex justify-content-center">
                    <div style={{ width: "100%", maxWidth: "320px" }}>
                      <Chart options={chartOptions} series={chartSeries} type="donut" height={320} />
                    </div>
                  </Col>
                  {/* Right: Detailed Department Breakdown Table */}
                  <Col lg={7}>
                    <div className="border rounded">
                      <Table hover responsive className="align-middle mb-0 text-nowrap">
                        <thead className="table-light">
                          <tr>
                            <th>Department</th>
                            <th className="text-center">Total Staff</th>
                            <th className="text-center">Present</th>
                            <th className="text-center">Absent</th>
                            <th className="text-center">On Leave</th>
                          </tr>
                        </thead>
                        <tbody>
                          {departmentStats.map((dept, index) => (
                            <tr key={index}>
                              <td className="fw-semibold text-dark">{dept.name}</td>
                              <td className="text-center">{dept.total}</td>
                              <td className="text-center text-success fw-medium">{dept.present}</td>
                              <td className="text-center text-danger">{dept.absent}</td>
                              <td className="text-center text-secondary">{dept.leave}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  </Col>
                </Row>
              ) : (
                <div className="text-muted text-center py-5">No workforce analytics available.</div>
              )}
            </Card.Body>
          </Card>

          {/* Today's Attendance Overview Graph Card */}
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white d-flex justify-content-between align-items-center py-4">
              <div>
                <h5 className="mb-0 fw-bold">Today's Attendance Overview</h5>
                <small className="text-secondary">Interactive bar graph showing live attendance breakdown</small>
              </div>
              <Link href="/attendance" className="btn btn-outline-primary btn-sm px-3">
                View Detailed Records
              </Link>
            </Card.Header>
            <Card.Body className="pt-2 pb-4">
              <Chart
                options={attendanceChartOptions}
                series={attendanceChartSeries}
                type="bar"
                height={280}
              />
            </Card.Body>
          </Card>
        </Col>

        {/* Right column: Recent activities feed */}
        <Col xl={4}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white py-4">
              <h5 className="mb-0 fw-bold">Today's Activity Feed</h5>
            </Card.Header>
            <Card.Body className="d-flex flex-column justify-content-between">
              <div>
                {recentActivities.length === 0 ? (
                  <div className="text-muted text-center py-5">
                    No check-in activities recorded today yet.
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-4">
                    {recentActivities.map((act, index) => (
                      <div key={index} className="d-flex gap-3 align-items-start p-2 rounded activity-item">
                        <div className="mt-1">
                          <span className={`badge bg-light-${act.colorClass} p-2 rounded-circle d-flex align-items-center justify-content-center activity-dot`}>
                            <span className={`bg-${act.colorClass} rounded-circle`} style={{ width: "8px", height: "8px" }} />
                          </span>
                        </div>
                        <div>
                          <div className="fw-semibold text-dark fs-5">{act.description}</div>
                          <small className="text-muted d-block mt-1">{act.timestamp}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="d-grid mt-6">
                <Link href="/attendance" className="btn btn-light text-primary fw-semibold">
                  View Live Attendance Status
                </Link>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Upcoming Employee Salary Increments Strategy Line Chart */}
      <UpcomingIncrementsChartWidget />

      {/* AttendStack Org ID Onboarding Modal */}
      <Modal show={showOrgModal} onHide={() => setShowOrgModal(false)} centered backdrop="static" size="lg">
        <Modal.Header closeButton className="bg-primary text-white border-0 py-3">
          <Modal.Title className="fw-bold d-flex align-items-center gap-2 text-white">
            <IconBuildingBank size={24} />
            Company Organization ID & SimplyJob Integration
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <div className="text-center mb-4">
            <Badge bg="success-subtle" text="success" className="mb-2 px-3 py-2 fs-6 rounded-pill fw-semibold">
              Company Account Ready
            </Badge>
            <h3 className="fw-bold text-dark mb-1">{organization?.name || "Your Company Workspace"}</h3>
            <p className="text-secondary small">
              Here is your official AttendStack Organization ID. Copy this ID and paste it into SimplyJob to sync your hired candidates seamlessly.
            </p>
          </div>

          <Card className="border-primary border-2 bg-primary-subtle text-center p-4 mb-4 shadow-sm">
            <div className="text-uppercase small fw-bold text-primary mb-2">Your AttendStack Organization ID</div>
            <div className="display-6 font-monospace fw-bold text-primary mb-3 letter-spacing-1">
              {organization?.invite_code || "Generating..."}
            </div>
            <div className="d-flex justify-content-center gap-2 flex-wrap">
              <Button
                variant={copied ? "success" : "primary"}
                className="fw-bold px-4 py-2"
                onClick={() => {
                  if (organization?.invite_code) {
                    navigator.clipboard.writeText(organization.invite_code);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 3000);
                  }
                }}
              >
                {copied ? <><IconCheck size={18} className="me-1" /> Copied to Clipboard!</> : <><IconCopy size={18} className="me-1" /> Copy Org ID</>}
              </Button>
              <Button
                variant="outline-primary"
                className="fw-bold px-4 py-2"
                onClick={() => {
                  if (organization?.invite_code) {
                    navigator.clipboard.writeText(organization.invite_code);
                  }
                  const simplyJobUrl = process.env.NEXT_PUBLIC_SIMPLYJOB_URL || (typeof window !== "undefined" && window.location.hostname === "localhost" ? "http://localhost:3009" : "https://simplyjob.in");
                  window.open(`${simplyJobUrl}/company/hired-employees`, "_blank");
                }}
              >
                <IconExternalLink size={18} className="me-1" /> Copy & Open SimplyJob
              </Button>
            </div>
          </Card>

          <div className="bg-light p-3 rounded border">
            <h6 className="fw-bold mb-2 text-dark">📋 3 Quick Steps to Link SimplyJob:</h6>
            <ol className="small text-secondary mb-0 ps-3">
              <li className="mb-1">Click <strong>Copy Org ID</strong> above{organization?.invite_code ? <> (<code>{organization.invite_code}</code>)</> : null}.</li>
              <li className="mb-1">Open <strong>SimplyJob Hired Employees</strong> workspace.</li>
              <li className="mb-1">Paste this Org ID in the <strong>AttendStack Organization ID</strong> field and click <strong>Save Org ID</strong>.</li>
              <li>Now when you hire candidates on SimplyJob, clicking <strong>Invite</strong> will auto-fill your company Org ID!</li>
            </ol>
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0 pb-3 pe-4">
          <Button variant="secondary" onClick={() => setShowOrgModal(false)}>
            Got it, Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Fragment>
  );
};

export default DashboardPage;
