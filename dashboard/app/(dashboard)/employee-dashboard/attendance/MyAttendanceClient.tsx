"use client";
import { Card, Table, Badge, Button, Col, Row } from "react-bootstrap";
import { useState, useEffect } from "react";
import CustomPagination from "../../../../components/shared/CustomPagination";

const MyAttendanceClient = () => {
  const [checkInTime, setCheckInTime] = useState<Date | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 5;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCheckIn = () => {
    setCheckInTime(new Date());
  };

  const handleCheckOut = () => {
    setCheckOutTime(new Date());
  };
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
  ];

  const getStatusBadge = (status: string) => {
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

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  return (
    <div>
      <Row>
        <Col>
          <Card className="mb-4">
            <Card.Header>
              <h4 className="mb-0">Mark Attendance</h4>
            </Card.Header>
            <Card.Body>
              <div className="text-center">
                <h4 className="mb-0">
                  {currentTime.toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </h4>
                <h1 className="display-3 fw-bold">
                  {currentTime.toLocaleTimeString()}
                </h1>
              </div>
              <hr className="my-4" />
              <Row>
                <Col md={6} className="mb-3 mb-md-0">
                  <Card>
                    <Card.Body className="text-center">
                      <h5 className="text-muted">Check In</h5>
                      <p className="fw-bold fs-4">
                        {checkInTime
                          ? checkInTime.toLocaleTimeString()
                          : "--:--"}
                      </p>
                      <Button
                        variant="success"
                        className="w-100"
                        onClick={handleCheckIn}
                        disabled={!!checkInTime}
                      >
                        Check In
                      </Button>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card>
                    <Card.Body className="text-center">
                      <h5 className="text-muted">Check Out</h5>
                      <p className="fw-bold fs-4">
                        {checkOutTime
                          ? checkOutTime.toLocaleTimeString()
                          : "--:--"}
                      </p>
                      <Button
                        variant="danger"
                        className="w-100"
                        onClick={handleCheckOut}
                        disabled={!checkInTime || !!checkOutTime}
                      >
                        Check Out
                      </Button>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <Card>
        <Card.Header>
          <h4 className="mb-0">My Attendance Records</h4>
        </Card.Header>
        <Card.Body>
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
    </div>
  );
};

export default MyAttendanceClient;