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
  const [attendanceChartData, setAttendanceChartData] = useState<{ status: string; count: number; color: string }[]>([]);
  const [activityLogs, setActivityLogs] = useState<{ description: string; timestamp: string; colorClass: string }[]>([]);

  const fetchAttendances = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await axios.get("http://127.0.0.1:8000/api/v1/attendance/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const records = Array.isArray(response.data) ? response.data : (response.data.results || []);
      
      // Process for Chart: Today's Overview
      const todayStr = new Date().toISOString().split("T")[0];
      const todaysRecords = records.filter((r: any) => r.date === todayStr);
      
      let presentCount = 0;
      let absentCount = 0;
      let lateCount = 0;
      let leaveCount = 0;

      todaysRecords.forEach((r: any) => {
        if (r.status === "PRESENT") presentCount++;
        else if (r.status === "ABSENT") absentCount++;
        else if (r.status === "LATE") lateCount++;
        else if (r.status === "ON_LEAVE" || r.status === "PAID_LEAVE") leaveCount++;
        else if (r.status === "HALF_DAY") presentCount++; // counted as present for pie chart simplicity, or split it
      });

      setAttendanceChartData([
        { status: "Present", count: presentCount, color: "#10b981" }, // success green
        { status: "Late", count: lateCount, color: "#f59e0b" }, // warning yellow
        { status: "Absent", count: absentCount, color: "#ef4444" }, // danger red
        { status: "On Leave", count: leaveCount, color: "#64748b" }, // secondary gray
      ]);

      // Process for Activity Log (Latest 5 records based on created/updated or just first 5)
      // Since it's a list of records, we will create events like "Aman checked in"
      const recentRecords = [...records].reverse().slice(0, 5);
      const logs = recentRecords.map((r: any) => {
        const timeStr = r.check_in 
          ? new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).format(new Date(r.check_in))
          : new Intl.DateTimeFormat("en-IN", { month: "short", day: "2-digit" }).format(new Date(r.date));
        
        let desc = `${r.employee_name || 'Employee'} marked attendance`;
        let color = "primary";
        
        if (r.status === "PRESENT" || r.status === "HALF_DAY") {
          desc = `${r.employee_name || 'Employee'} checked in at ${timeStr}`;
          color = "success";
        } else if (r.status === "LATE") {
          desc = `${r.employee_name || 'Employee'} checked in late at ${timeStr}`;
          color = "warning";
        } else if (r.status === "ON_LEAVE" || r.status === "PAID_LEAVE") {
          desc = `${r.employee_name || 'Employee'} is on leave`;
          color = "secondary";
        } else if (r.status === "ABSENT") {
          desc = `${r.employee_name || 'Employee'} was marked absent`;
          color = "danger";
        }
        
        return {
          description: desc,
          timestamp: new Date(r.date).toLocaleDateString("en-IN", { month: "short", day: "2-digit", year: "numeric" }),
          colorClass: color
        };
      });
      setActivityLogs(logs);

    } catch (err) {
      console.error("Failed to fetch attendances.", err);
    }
  };

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
    fetchAttendances();
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
          <EmployeesByOrgChart data={attendanceChartData} />
        </Col>
        <Col xs={12} lg={4}>
          <ActivityLog logs={activityLogs} />
        </Col>
      </Row>
    </div>
  );
};

export default AdminDashboard;