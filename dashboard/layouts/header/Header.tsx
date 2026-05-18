"use client";
//import node module libraries
import React, { Fragment, useState, useEffect } from "react";
import Link from "next/link";
import { useMediaQuery } from "react-responsive";
import {
  IconArrowBarLeft,
  IconArrowBarRight,
  IconBell,
  IconMenu2,
  IconSearch,
} from "@tabler/icons-react";
import { Container, ListGroup, Navbar, Button } from "react-bootstrap";

//import custom components
import UserMenu from "./UserMenu";
import Flex from "components/common/Flex";
import NoficationList from "components/common/NoficationList";
import OffcanvasSidebar from "layouts/OffcanvasSidebar";

//import custom hooks
import useMenu from "hooks/useMenu";

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  timeLabel: string;
  type: "attendance" | "holiday" | "payroll" | "system";
  unread: boolean;
}

const Header = () => {
  const [isNoficationOpen, setIsNotificationOpen] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toggleMenuHandler, handleCollapsed } = useMenu();

  const isTablet = useMediaQuery({ maxWidth: 990 });

  const loadDynamicNotifications = async () => {
    const token = localStorage.getItem("authToken");
    const userData = localStorage.getItem("user");
    if (!token || !userData) return;

    try {
      const parsedUser = JSON.parse(userData);
      const isEmployee = parsedUser.role === "EMPLOYEE";
      const generatedNotifications: NotificationItem[] = [];

      // 1. Fetch holidays (applicable to everyone)
      try {
        const holidaysRes = await fetch("http://127.0.0.1:8000/api/v1/holidays/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (holidaysRes.ok) {
          const holidays = await holidaysRes.json();
          const holidayList = Array.isArray(holidays) ? holidays : holidays.results || [];
          const todayStr = new Date().toISOString().split("T")[0];
          // Find upcoming holidays
          const upcoming = holidayList
            .filter((h: any) => h.date >= todayStr)
            .sort((a: any, b: any) => a.date.localeCompare(b.date))
            .slice(0, 2);

          upcoming.forEach((holiday: any) => {
            generatedNotifications.push({
              id: `holiday-${holiday.id}`,
              title: "Upcoming Holiday",
              description: `${holiday.name} is scheduled on ${new Date(holiday.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}.`,
              timeLabel: "Holiday Calendar",
              type: "holiday",
              unread: true,
            });
          });
        }
      } catch (err) {
        console.error("Error loading holiday notices", err);
      }

      // 2. Fetch Employee Specific Attendance and Payroll Logs
      if (isEmployee) {
        // Attendance
        try {
          const attendanceRes = await fetch("http://127.0.0.1:8000/api/v1/attendance/me/", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (attendanceRes.ok) {
            const records = await attendanceRes.json();
            const attendanceList = Array.isArray(records) ? records : records.results || [];
            const recent = attendanceList.slice(0, 2);
            recent.forEach((record: any) => {
              const formattedDate = new Date(record.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
              generatedNotifications.push({
                id: `attendance-${record.id}`,
                title: "Attendance Logged",
                description: `Your daily log for ${formattedDate} is recorded as ${record.status_label || record.status}.`,
                timeLabel: record.check_in ? `Punched at ${new Date(record.check_in).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : "Absent",
                type: "attendance",
                unread: true,
              });
            });
          }
        } catch (err) {
          console.error("Error loading attendance notices", err);
        }

        // Payslips
        try {
          const payrollRes = await fetch("http://127.0.0.1:8000/api/v1/payroll/", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (payrollRes.ok) {
            const payrolls = await payrollRes.json();
            const payrollList = Array.isArray(payrolls) ? payrolls : payrolls.results || [];
            if (payrollList.length > 0) {
              const latest = payrollList[0];
              generatedNotifications.push({
                id: `payroll-${latest.id}`,
                title: "Payslip Processed",
                description: `Your monthly salary payslip for ${latest.month_name || latest.month} ${latest.year} has been released.`,
                timeLabel: "Payroll Alert",
                type: "payroll",
                unread: true,
              });
            }
          }
        } catch (err) {
          console.error("Error loading payroll notices", err);
        }
      } else {
        // 3. Admin System Setting Notice
        generatedNotifications.push({
          id: "admin-system-timing",
          title: "Timing Synced",
          description: "Standard corporate timing check-in limits set to 10:00 AM and check-out to 06:00 PM.",
          timeLabel: "Settings Check",
          type: "system",
          unread: false,
        });
      }

      // 4. Default portal welcoming item
      generatedNotifications.push({
        id: "system-welcome",
        title: "Welcome to AttendStack",
        description: "Keep tracking your logs daily and check your dashboard regularly for holiday schedules.",
        timeLabel: "System Welcome",
        type: "system",
        unread: false,
      });

      setNotifications(generatedNotifications);
      setUnreadCount(generatedNotifications.filter((n) => n.unread).length);
    } catch (err) {
      console.error("Error loading dynamic notifications", err);
    }
  };

  useEffect(() => {
    loadDynamicNotifications();
  }, []);

  // Recalculate unread whenever notifications change
  useEffect(() => {
    setUnreadCount(notifications.filter((n) => n.unread).length);
  }, [notifications]);

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  return (
    <Fragment>
      <Navbar expand="lg" className="navbar-glass px-0 px-lg-4">
        <Container fluid className="px-lg-0">
          <Flex alignItems="center" className="gap-4">
            {isTablet && (
              <div
                className="d-block d-lg-none"
                style={{ cursor: "pointer" }}
                onClick={() => toggleMenuHandler(true)}
              >
                <IconMenu2 size={24} />
              </div>
            )}
            {isTablet || (
              <div>
                <Link href={"#"} className="sidebar-toggle d-flex p-3">
                  <span
                    className="collapse-mini"
                    onClick={() => handleCollapsed("expanded")}
                  >
                    <IconArrowBarLeft
                      size={20}
                      strokeWidth={1.5}
                      className="text-secondary"
                    />
                  </span>
                  <span
                    className="collapse-expanded"
                    onClick={() => handleCollapsed("collapsed")}
                  >
                    <IconArrowBarRight
                      size={20}
                      strokeWidth={1.5}
                      className="text-secondary"
                    />
                  </span>
                </Link>
              </div>
            )}
          </Flex>
          <ListGroup
            bsPrefix="list-unstyled"
            as={"ul"}
            className="d-flex align-items-center mb-0 gap-2"
          >
            <ListGroup.Item as="li">
              <Button variant="white">
                <span>
                  <IconSearch size={16} />
                </span>
                <small className="ms-1">⌘K</small>
              </Button>
            </ListGroup.Item>

            <ListGroup.Item as="li">
              <Button
                variant="ghost"
                className="position-relative btn-icon rounded-circle"
                onClick={() => setIsNotificationOpen(true)}
              >
                <IconBell size={20} />
                {unreadCount > 0 && (
                  <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger mt-2 ms-n2">
                    {unreadCount}
                    <span className="visually-hidden">unread messages</span>
                  </span>
                )}
              </Button>
            </ListGroup.Item>
            <ListGroup.Item as="li">
              <UserMenu />
            </ListGroup.Item>
          </ListGroup>
        </Container>
      </Navbar>
      <NoficationList
        isOpen={isNoficationOpen}
        onClose={() => setIsNotificationOpen(false)}
        notifications={notifications}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
      />
      {isTablet && <OffcanvasSidebar />}
    </Fragment>
  );
};

export default Header;
