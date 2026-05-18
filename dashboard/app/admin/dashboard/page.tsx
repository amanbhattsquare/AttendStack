"use client";
import {
  Card,
  Col,
  Row,
} from "react-bootstrap";
import { useEffect, useState } from "react";
import axios from "axios";
import { IconBuilding, IconUsers } from "@tabler/icons-react";
import DashboardStats from "components/dashboard/DashboardStats";
import { AdminDashboardStatsData } from "data/AdminDashboardData";
import { DashboardStatType } from "types/DashboardTypes";
import EmployeesByOrgChart from "components/dashboard/EmployeesByOrgChart";
import ActivityLog from "components/dashboard/ActivityLog";
import { activityLog as activityLogData, DashboardStatsData } from "data/DashboardData";

interface Organization {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
  employee_count: number;
}

const AdminDashboard = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [stats, setStats] = useState<DashboardStatType[]>([]);
  const [chartData, setChartData] = useState<{ x: string; y: number }[]>([]);

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
      console.error("Failed to fetch organizations.", err);
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

  useEffect(() => {
    const adminStats = AdminDashboardStatsData.filter(
      (stat) => stat.title === "Total Employees"
    ).map((stat) => {
      return { ...stat, value: totalEmployees.toString() };
    });

    const filteredDashboardStats = DashboardStatsData.filter(
      (stat) => stat.title !== "Total Employees"
    );

    setStats([...adminStats, ...filteredDashboardStats]);

    setChartData(
      organizations.map((org) => ({
        x: org.name,
        y: org.employee_count,
      }))
    );
  }, [organizations, totalEmployees]);

  return (
    <div>
      <div className="mb-6">
        <h2 className="mb-0 fw-bold">Admin Dashboard</h2>
        <p className="text-secondary mb-0">Overview of company workforce, attendance, and recent activities.</p>
      </div>
      <Row className="g-6 mb-6">
        <DashboardStats stats={stats} />
      </Row>

      <Row className="g-4 mb-4">
        <Col xs={12} lg={8}>
          <EmployeesByOrgChart data={chartData} />
        </Col>
        <Col xs={12} lg={4}>
          <ActivityLog />
        </Col>
      </Row>
    </div>
  );
};

export default AdminDashboard;