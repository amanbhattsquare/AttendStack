"use client";
import { Card, Table, Badge } from "react-bootstrap";

const MyAttendanceClient = () => {
  // Dummy data for attendance records
  const attendanceRecords = [
    {
      date: "2024-05-13",
      checkIn: "09:05 AM",
      checkOut: "06:10 PM",
      totalHours: "9h 5m",
      status: "Present",
    },
    {
      date: "2024-05-12",
      checkIn: "09:15 AM",
      checkOut: "06:00 PM",
      totalHours: "8h 45m",
      status: "Late Entry",
    },
    {
      date: "2024-05-11",
      checkIn: "--:--",
      checkOut: "--:--",
      totalHours: "0h 0m",
      status: "Absent",
    },
    {
      date: "2024-05-10",
      checkIn: "10:00 AM",
      checkOut: "02:00 PM",
      totalHours: "4h 0m",
      status: "Half-day",
    },
    {
      date: "2024-05-09",
      checkIn: "--:--",
      checkOut: "--:--",
      totalHours: "0h 0m",
      status: "On Leave",
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

  return (
    <Card>
      <Card.Header>
        <h4 className="mb-0">My Attendance Records</h4>
      </Card.Header>
      <Card.Body>
        <Table hover responsive className="text-nowrap">
          <thead className="table-light">
            <tr>
              <th>Date</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Total Hours</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {attendanceRecords.map((record, index) => (
              <tr key={index}>
                <td>{record.date}</td>
                <td>{record.checkIn}</td>
                <td>{record.checkOut}</td>
                <td>{record.totalHours}</td>
                <td>
                  <Badge bg={getStatusBadge(record.status)}>
                    {record.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  );
};

export default MyAttendanceClient;