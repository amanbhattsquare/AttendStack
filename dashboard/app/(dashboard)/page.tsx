"use client";

import { Fragment, useEffect, useState, useMemo } from "react";
import { Badge, Card, Col, Row, Table, Spinner, Button } from "react-bootstrap";
import { IconUsers, IconListCheck, IconClock, IconSnowboarding, IconRefresh } from "@tabler/icons-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";

// SSR safe dynamic import for ApexCharts
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const BASE_URL = `${process.env.NEXT_PUBLIC_API_ENDPOINT}/api/v1`;

const authHeaders = (): HeadersInit => {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));

const formatTime = (value?: string | null) =>
  value ? new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "--";

const HomePage = () => {
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

  useEffect(() => {
    fetchData();
  }, []);

  // Personalized dynamic greeting
  const greeting = useMemo(() => {
    const hrs = new Date().getHours();
    if (hrs < 12) return "Good morning";
    if (hrs < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  // Compute live KPIs
  const stats = useMemo(() => {
    const total = todayRecords.length;
    const present = todayRecords.filter(
      (r) => r.live_status === "Present" || r.live_status === "Late Entry" || r.live_status === "Half-day"
    ).length;
    const late = todayRecords.filter((r) => r.live_status === "Late Entry").length;
    const onLeave = todayRecords.filter((r) => r.live_status === "On Leave").length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;

    return {
      total,
      present,
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
      if (r.live_status === "Present" || r.live_status === "Late Entry" || r.live_status === "Half-day") {
        summary[dept].present += 1;
      } else if (r.live_status === "On Leave") {
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
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          border: none !important;
          cursor: pointer;
        }
        .stat-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 14px 28px rgba(0,0,0,0.08), 0 10px 10px rgba(0,0,0,0.06) !important;
        }
        .bg-gradient-primary {
          background: linear-gradient(135deg, #6366f1 0%, #3b82f6 100%) !important;
        }
        .bg-gradient-success {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
        }
        .bg-gradient-warning {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%) !important;
        }
        .bg-gradient-info {
          background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%) !important;
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
          <h2 className="mb-0 fw-bold">{greeting}, Admin! 👋</h2>
          <p className="text-secondary mb-0">Overview of company workforce, attendance, and recent activities.</p>
        </div>
        <Button variant="outline-primary" size="sm" onClick={fetchData} className="d-flex align-items-center gap-2 px-3 shadow-sm">
          <IconRefresh size={16} /> Sync Data
        </Button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Stats row */}
      <Row className="g-6 mb-6">
        {/* Total Employees */}
        <Col xl={3} md={6}>
          <Card className="card-lg bg-gradient-primary stat-card shadow-sm">
            <Card.Body className="d-flex flex-column gap-6">
              <div className="d-flex justify-content-between align-items-center">
                <div className="fw-semibold text-white fs-4">Total Employees</div>
                <div className="text-white"><IconUsers size={24} strokeWidth={1.5} /></div>
              </div>
              <div className="lh-1">
                <div className="fs-1 fw-bold text-white mb-2">{stats.total}</div>
                <p className="mb-0 text-white opacity-75">Active Workforce</p>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Attendance Rate */}
        <Col xl={3} md={6}>
          <Card className="card-lg bg-gradient-success stat-card shadow-sm">
            <Card.Body className="d-flex flex-column gap-6">
              <div className="d-flex justify-content-between align-items-center">
                <div className="fw-semibold text-white fs-4">Attendance Rate</div>
                <div className="text-white"><IconListCheck size={24} strokeWidth={1.5} /></div>
              </div>
              <div className="lh-1">
                <div className="fs-1 fw-bold text-white mb-2">{stats.rate}%</div>
                <p className="mb-0 text-white opacity-75">Present today ({stats.present}/{stats.total})</p>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Late Entries */}
        <Col xl={3} md={6}>
          <Card className="card-lg bg-gradient-warning stat-card shadow-sm">
            <Card.Body className="d-flex flex-column gap-6">
              <div className="d-flex justify-content-between align-items-center">
                <div className="fw-semibold text-white fs-4">Late Entries</div>
                <div className="text-white"><IconClock size={24} strokeWidth={1.5} /></div>
              </div>
              <div className="lh-1">
                <div className="fs-1 fw-bold text-white mb-2">{stats.late}</div>
                <p className="mb-0 text-white opacity-75">After 10:00 AM cutoff</p>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* On Leave Today */}
        <Col xl={3} md={6}>
          <Card className="card-lg bg-gradient-info stat-card shadow-sm">
            <Card.Body className="d-flex flex-column gap-6">
              <div className="d-flex justify-content-between align-items-center">
                <div className="fw-semibold text-white fs-4">On Leave Today</div>
                <div className="text-white"><IconSnowboarding size={24} strokeWidth={1.5} /></div>
              </div>
              <div className="lh-1">
                <div className="fs-1 fw-bold text-white mb-2">{stats.onLeave}</div>
                <p className="mb-0 text-white opacity-75">Approved time-off today</p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

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

          {/* Recent Joiners Table */}
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white d-flex justify-content-between align-items-center py-4">
              <h5 className="mb-0 fw-bold">Recent Hires</h5>
              <Link href="/employees" className="btn btn-outline-primary btn-sm px-3">
                Manage Employees
              </Link>
            </Card.Header>
            <Card.Body className="p-0">
              <Table hover responsive className="text-nowrap align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Employee</th>
                    <th>ID</th>
                    <th>Department</th>
                    <th>Date Joined</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-secondary">
                        No employees found.
                      </td>
                    </tr>
                  ) : (
                    recentEmployees.map((emp) => (
                      <tr key={emp.id}>
                        <td>
                          <div className="d-flex align-items-center">
                            <img
                              src={emp.profile_photo || "/images/avatar/avatar-fallback.jpg"}
                              alt={emp.full_name}
                              className="avatar avatar-sm rounded-circle me-3"
                            />
                            <div>
                              <div className="fw-semibold">{emp.full_name}</div>
                              <small className="text-muted">{emp.email}</small>
                            </div>
                          </div>
                        </td>
                        <td>{emp.employee_id || "--"}</td>
                        <td>{emp.department || "General"}</td>
                        <td>{formatDate(emp.joining_date)}</td>
                        <td>
                          <Badge bg={emp.status === "ACTIVE" ? "success" : "secondary"}>
                            {emp.status}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
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
    </Fragment>
  );
};

export default HomePage;