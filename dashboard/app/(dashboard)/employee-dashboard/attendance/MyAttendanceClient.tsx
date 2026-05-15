"use client";
import { Card, Table, Badge, Button, Col, Row } from "react-bootstrap";
import { useState, useEffect } from "react";
import CustomPagination from "../../../../components/shared/CustomPagination";

const MyAttendanceClient = () => {
  const [checkInTime, setCheckInTime] = useState<Date | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentPage, setCurrentPage] = useState(1);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const recordsPerPage = 5;
  const userId = "user_123"; // Hardcoded for now

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    const fetchAttendance = async () => {
      try {
        const response = await fetch(`/api/attendance?userId=${userId}`);
        if (response.ok) {
          const data = await response.json();
          setAttendanceRecords(data);
          // Logic to set checkInTime and checkOutTime from the latest record
          if (data.length > 0) {
            const lastRecord = data[data.length - 1];
            if (lastRecord.action === 'check-in') {
              setCheckInTime(new Date(lastRecord.timestamp));
            } else if (lastRecord.action === 'check-out') {
              const checkInRecord = data.find(rec => rec.action === 'check-in');
              if (checkInRecord) {
                setCheckInTime(new Date(checkInRecord.timestamp));
              }
              setCheckOutTime(new Date(lastRecord.timestamp));
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch attendance", error);
      }
    };

    fetchAttendance();

    return () => clearInterval(timer);
  }, [userId]);

  const handleCheckIn = async () => {
    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'check-in' }),
      });
      if (response.ok) {
        const { record } = await response.json();
        setCheckInTime(new Date(record.timestamp));
        setAttendanceRecords(prev => [...prev, record]);
      }
    } catch (error) {
      console.error("Failed to check in", error);
    }
  };

  const handleCheckOut = async () => {
    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'check-out' }),
      });
      if (response.ok) {
        const { record } = await response.json();
        setCheckOutTime(new Date(record.timestamp));
        setAttendanceRecords(prev => [...prev, record]);
      }
    } catch (error) {
      console.error("Failed to check out", error);
    }
  };

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
                  <td>{new Date(record.timestamp).toLocaleDateString()}</td>
                  <td>{record.action === 'check-in' ? new Date(record.timestamp).toLocaleTimeString() : '--:--'}</td>
                  <td>{record.action === 'check-out' ? new Date(record.timestamp).toLocaleTimeString() : '--:--'}</td>
                  <td>
                    <Badge bg={getStatusBadge("Present")}>
                      Present
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