"use client";
import {
  Card,
  Table,
  Badge,
  Row,
  Col,
  Form,
  Button,
  Pagination,
} from "react-bootstrap";
import { useState } from "react";

import CustomPagination from "../../../../components/shared/CustomPagination";

const AttendanceReportClient = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 5;

  // Dummy data for attendance records
  const attendanceRecords = [
    {
      date: "2024-05-13",
      checkIn: "09:05 AM",
      checkOut: "06:10 PM",
      status: "Present",
    },
    {
      date: "2024-05-12",
      checkIn: "09:15 AM",
      checkOut: "06:00 PM",
      status: "Late Entry",
    },
    {
      date: "2024-05-11",
      checkIn: "--:--",
      checkOut: "--:--",
      status: "Absent",
    },
    {
      date: "2024-05-10",
      checkIn: "10:00 AM",
      checkOut: "02:00 PM",
      status: "Half-day",
    },
    {
      date: "2024-05-09",
      checkIn: "--:--",
      checkOut: "--:--",
      status: "On Leave",
    },
    // Add more records to test pagination
    {
      date: "2024-05-08",
      checkIn: "09:00 AM",
      checkOut: "06:00 PM",
      status: "Present",
    },
    {
      date: "2024-05-07",
      checkIn: "09:05 AM",
      checkOut: "06:05 PM",
      status: "Present",
    },
    {
      date: "2024-05-06",
      checkIn: "09:10 AM",
      checkOut: "06:00 PM",
      status: "Late Entry",
    },
    {
      date: "2024-05-05",
      checkIn: "--:--",
      checkOut: "--:--",
      status: "Absent",
    },
    {
      date: "2024-05-04",
      checkIn: "10:00 AM",
      checkOut: "02:00 PM",
      status: "Half-day",
    },
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case "Present":
        return "success";
      case "Late Entry":
        return "warning";
      case "Absent":
        return "danger";
      case "Half-day":
        return "info";
      case "On Leave":
        return "secondary";
      default:
        return "light";
    }
  };

  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = attendanceRecords.slice(
    indexOfFirstRecord,
    indexOfLastRecord
  );

  const totalPages = Math.ceil(attendanceRecords.length / recordsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  return (
    <Card>
      <Card.Header>
        <h4 className="mb-0">Attendance Report</h4>
      </Card.Header>
      <Card.Body>
        <Form className="mb-4">
          <Row className="g-3">
            <Col md={4}>
              <Form.Group>
                <Form.Label>From Date</Form.Label>
                <Form.Control type="date" />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>To Date</Form.Label>
                <Form.Control type="date" />
              </Form.Group>
            </Col>
            <Col md={4} className="d-flex align-items-end">
              <Button variant="primary" type="submit">
                Generate Report
              </Button>
            </Col>
          </Row>
        </Form>
        <Table hover responsive className="text-nowrap">
          <thead className="table-light">
            <tr>
              <th>Sr. No.</th>
              <th>Date</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {currentRecords.map((record, index) => (
              <tr key={index}>
                <td>{indexOfFirstRecord + index + 1}</td>
                <td>{record.date}</td>
                <td>{record.checkIn}</td>
                <td>{record.checkOut}</td>
                <td>
                  <Badge bg={getStatusBadge(record.status)}>
                    {record.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        <CustomPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </Card.Body>
    </Card>
  );
};

export default AttendanceReportClient;