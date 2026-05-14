"use client";
// import node module libraries
import Image from "next/image";
import {
  Card,
  CardBody,
  CardHeader,
  Table,
  Button,
  Form,
  Col,
  Row,
  Badge,
  Dropdown,
} from "react-bootstrap";
import { Fragment, useState, useMemo } from "react";
import { v4 as uuid } from "uuid";
import { IconUsers, IconUserCheck, IconUserOff, IconUserExclamation, IconDotsVertical } from "@tabler/icons-react";

// import widget/custom components
import DashboardStats from "components/dashboard/DashboardStats";



const TodaysAttendanceClient = () => {
  const [nameQuery, setNameQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [todayStatusData, setTodayStatusData] = useState(
    [
      {
        id: 1,
        employee: {
          name: "Aniruddh Bhatt",
          email: "aniruddh@example.com",
          avatar: "/images/avatar/avatar-1.jpg",
        },
        status: "Clocked In",
        clockInTime: "09:01 AM",
      },
      {
        id: 2,
        employee: {
          name: "Jane Smith",
          email: "jane@example.com",
          avatar: "/images/avatar/avatar-2.jpg",
        },
        status: "Clocked In",
        clockInTime: "09:05 AM",
      },
      {
        id: 3,
        employee: {
          name: "Peter Jones",
          email: "peter@example.com",
          avatar: "/images/avatar/avatar-3.jpg",
        },
        status: "Absent",
        clockInTime: "-",
      },
      {
        id: 4,
        employee: {
          name: "Mary Johnson",
          email: "mary@example.com",
          avatar: "/images/avatar/avatar-4.jpg",
        },
        status: "On Leave",
        clockInTime: "-",
      },
      {
        id: 5,
        employee: {
          name: "James Brown",
          email: "james@example.com",
          avatar: "/images/avatar/avatar-5.jpg",
        },
        status: "Clocked Out",
        clockInTime: "08:58 AM",
      },
      {
        id: 6,
        employee: {
          name: "Patricia Williams",
          email: "patricia@example.com",
          avatar: "/images/avatar/avatar-6.jpg",
        },
        status: "Clocked In",
        clockInTime: "09:15 AM",
      },
      {
        id: 7,
        employee: {
          name: "Robert Davis",
          email: "robert@example.com",
          avatar: "/images/avatar/avatar-7.jpg",
        },
        status: "Absent",
        clockInTime: "-",
      },
    ].map((item) => ({ ...item, clockOutTime: "--" }))
  );

  const handleStatusChange = (employeeId, newStatus) => {
    setTodayStatusData((currentData) =>
      currentData.map((employee) => {
        if (employee.id === employeeId) {
          const newClockInTime =
            newStatus === "Clocked In" && employee.status !== "Clocked In"
              ? new Date().toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })
              : newStatus === "Clocked In"
              ? employee.clockInTime
              : "--";

          const newClockOutTime =
            newStatus === "Clocked Out"
              ? new Date().toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })
              : employee.clockOutTime;

          return {
            ...employee,
            status: newStatus,
            clockInTime: newClockInTime,
            clockOutTime: newClockOutTime,
          };
        }
        return employee;
      })
    );
  };

  const summaryStats = useMemo(() => {
    const total = todayStatusData.length;
    const present = todayStatusData.filter(e => e.status === 'Clocked In').length;
    const absent = todayStatusData.filter(e => e.status === 'Absent').length;
    const onLeave = todayStatusData.filter(e => e.status === 'On Leave').length;
    
    return [
        { id: uuid(), title: "Total Employees", value: String(total), icon: <IconUsers size={24} strokeWidth={1.5} />, bgColor: "bg-gradient-primary", textColor: "text-primary-emphasis", bottomValue: "", description: "All Employees" },
        { id: uuid(), title: "Present Today", value: String(present), icon: <IconUserCheck size={24} strokeWidth={1.5} />, bgColor: "bg-gradient-success", textColor: "text-success-emphasis", bottomValue: `${Math.round((present/total)*100)}%`, description: "of workforce" },
        { id: uuid(), title: "Absent Today", value: String(absent), icon: <IconUserOff size={24} strokeWidth={1.5} />, bgColor: "bg-gradient-danger", textColor: "text-danger-emphasis", bottomValue: "", description: "Marked as absent" },
        { id: uuid(), title: "On Leave Today", value: String(onLeave), icon: <IconUserExclamation size={24} strokeWidth={1.5} />, bgColor: "bg-gradient-warning", textColor: "text-warning-emphasis", bottomValue: `${Math.round((onLeave/total)*100)}%`, description: "of workforce" },
    ];
  }, [todayStatusData]);

  const filteredEmployees = useMemo(() => {
    let result = todayStatusData;

    if (nameQuery) {
      result = result.filter(
        (employee) =>
          employee.employee.name
            .toLowerCase()
            .includes(nameQuery.toLowerCase()) ||
          employee.employee.email
            .toLowerCase()
            .includes(nameQuery.toLowerCase())
      );
    }

    if (statusFilter !== "All") {
      result = result.filter((employee) => employee.status === statusFilter);
    }

    return result;
  }, [nameQuery, statusFilter, todayStatusData]);

  const getStatusBadge = (status) => {
      switch (status) {
        case "Clocked In":
          return "text-success bg-success";
        case "Clocked Out":
          return "text-secondary bg-secondary";
        case "Absent":
          return "text-danger bg-danger";
        case "On Leave":
          return "text-info bg-info";
        default:
          return "text-warning bg-warning";
      }
    };

  return (
    <Fragment>
      <style>
        {`
          .dropdown-toggle-no-caret::after {
            display: none !important;
          }
        `}
      </style>
      {/* Summary Cards */}
      <Row className="g-6 mb-6">
        <DashboardStats stats={summaryStats} />
      </Row>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardBody>
          <Row className="align-items-end">
            <Col md={5} xs={12} className="mb-2 mb-md-0">
              <Form.Group controlId="employeeNameSearch">
                <Form.Label>Search by Employee Name</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g., Jane Smith"
                  value={nameQuery}
                  onChange={(e) => setNameQuery(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={5} xs={12} className="mb-2 mb-md-0">
              <Form.Group controlId="statusFilter">
                <Form.Label>Filter by Status</Form.Label>
                <Form.Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="All">All</option>
                  <option value="Clocked In">Clocked In</option>
                  <option value="Clocked Out">Clocked Out</option>
                  <option value="Absent">Absent</option>
                  <option value="On Leave">On Leave</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2} xs={12} className="d-grid">
                <Button variant="primary">Search</Button>
            </Col>
          </Row>
        </CardBody>
      </Card>

      {/* Employee Status Table */}
      <Card>
        <CardHeader>
          <h4 className="mb-0">Today's Live Status</h4>
        </CardHeader>
        <CardBody>
          <Table hover responsive className="text-nowrap">
            <thead>
              <tr>
                <th>Sr. No.</th>
                <th>Employee Name</th>
                <th>Status</th>
                <th>Clock In Time</th>
                <th>Clock Out Time</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((employee, index) => (
                <tr key={employee.id}>
                  <td>{index + 1}</td>
                  <td>
                    <div className="d-flex align-items-center">
                      <Image
                        src={employee.employee.avatar}
                        alt=""
                        height={40}
                        width={40}
                        className="rounded-circle me-2"
                      />
                      <div>
                        <div className="fw-semibold">{employee.employee.name}</div>
                        <div className="text-muted">{employee.employee.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <Badge
                      className={`${getStatusBadge(
                        employee.status
                      )} bg-opacity-10`}
                    >
                      {employee.status}
                    </Badge>
                  </td>
                  <td>{employee.clockInTime}</td>
                  <td>{employee.clockOutTime}</td>
                  <td>
                    <Dropdown>
                      <Dropdown.Toggle
                          variant="ghost"
                          size="sm"
                          id="dropdown-basic"
                          className="dropdown-toggle-no-caret"
                        >
                          <IconDotsVertical size={16} />
                        </Dropdown.Toggle>

                      <Dropdown.Menu>
                        <Dropdown.Item onClick={() => handleStatusChange(employee.id, 'Clocked In')}>
                          Mark as Present
                        </Dropdown.Item>
                        <Dropdown.Item onClick={() => handleStatusChange(employee.id, 'Clocked Out')}>
                          Mark as Clocked Out
                        </Dropdown.Item>
                        <Dropdown.Item onClick={() => handleStatusChange(employee.id, 'Absent')}>
                          Mark as Absent
                        </Dropdown.Item>
                        <Dropdown.Item onClick={() => handleStatusChange(employee.id, 'On Leave')}>
                          Mark as On Leave
                        </Dropdown.Item>
                      </Dropdown.Menu>
                    </Dropdown>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardBody>
      </Card>
    </Fragment>
  );
};

export default TodaysAttendanceClient;