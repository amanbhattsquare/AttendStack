"use client";
// import node module libraries
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
  Pagination,
} from "react-bootstrap";
import { Fragment, useState, useMemo } from "react";
import { IconSearch, IconRefresh } from "@tabler/icons-react";
import Image from "next/image";
import { v4 as uuid } from "uuid";

// Helper function to generate more realistic dummy data for a full year
const generateDummyData = () => {
  const employees = [
    { name: "Aniruddh Bhatt", employeeId: "EMP001", avatar: "/images/avatar/avatar-1.jpg" },
    { name: "Jane Smith", employeeId: "EMP002", avatar: "/images/avatar/avatar-2.jpg" },
    { name: "Peter Jones", employeeId: "EMP003", avatar: "/images/avatar/avatar-3.jpg" },
    { name: "Maria Garcia", employeeId: "EMP004", avatar: "/images/avatar/avatar-4.jpg" },
  ];
  const records = [];
  const currentYear = new Date().getFullYear();
  const statuses = ["Present", "Absent", "Half-day", "On Leave", "Paid Leave"];

  for (let month = 0; month < 12; month++) {
    const daysInMonth = new Date(currentYear, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      for (const emp of employees) {
        const date = `${currentYear}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        let clockIn = "-";
        let clockOut = "-";
        let totalHours = "-";

        if (status === "Present" || status === "Half-day") {
          const clockInHour = status === "Present" ? 9 : 10;
          const clockInTime = new Date(0, 0, 0, clockInHour, Math.floor(Math.random() * 15));
          clockIn = clockInTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

          const clockOutHour = status === "Present" ? 18 : 14;
          const clockOutTime = new Date(0, 0, 0, clockOutHour, Math.floor(Math.random() * 15));
          clockOut = clockOutTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
          
          const hours = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);
          totalHours = `${Math.floor(hours)}h ${Math.floor((hours % 1) * 60)}m`;
        }

        records.push({
          id: uuid(),
          date,
          name: emp.name,
          employeeId: emp.employeeId,
          avatar: emp.avatar,
          clockIn,
          clockOut,
          totalHours,
          status,
        });
      }
    }
  }
  return records;
};

const allDummyRecords = generateDummyData();

const AttendanceRecordsClient = () => {
  const [nameQuery, setNameQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 31;

  const handleResetFilters = () => {
    setNameQuery("");
    setStatusFilter("All");
    setSelectedYear(new Date().getFullYear());
    setSelectedMonth(new Date().getMonth() + 1);
    setSelectedDay('All');
    setCurrentPage(1);
  };



  // Memoize records for the selected month and year
  const monthlyRecords = useMemo(() => {
    return allDummyRecords.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate.getFullYear() === selectedYear && recordDate.getMonth() + 1 === selectedMonth;
    });
  }, [selectedYear, selectedMonth]);

  // Memoize filtered records for table display
  const filteredRecords = useMemo(() => {
    let result = monthlyRecords;

    if (nameQuery) {
      result = result.filter((record) =>
        record.name.toLowerCase().includes(nameQuery.toLowerCase()) ||
        record.employeeId.toLowerCase().includes(nameQuery.toLowerCase())
      );
    }

    if (statusFilter !== "All") {
      result = result.filter((record) => record.status === statusFilter);
    }

    if (selectedDay !== 'All') {
      result = result.filter(record => new Date(record.date).getDate() === parseInt(selectedDay));
    }

    return result;
  }, [monthlyRecords, nameQuery, statusFilter, selectedDay]);

  // Paginate records
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredRecords.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);


  // Memoize summary stats for each employee
  const employeeSummary = useMemo(() => {
    const summary = {};
    monthlyRecords.forEach(record => {
      if (!summary[record.employeeId]) {
        summary[record.employeeId] = {
          id: record.employeeId,
          name: record.name,
          avatar: record.avatar,
          present: 0,
          absent: 0,
          halfDay: 0,
          onLeave: 0,
          paidLeave: 0,
        };
      }
      switch (record.status) {
        case 'Present':
          summary[record.employeeId].present++;
          break;
        case 'Absent':
          summary[record.employeeId].absent++;
          break;
        case 'Half-day':
          summary[record.employeeId].halfDay++;
          break;
        case 'On Leave':
          summary[record.employeeId].onLeave++;
          break;
        case 'Paid Leave':
          summary[record.employeeId].paidLeave++;
          break;
        default:
          break;
      }
    });
    return Object.values(summary);
  }, [monthlyRecords]);

  const getStatusBadge = (status) => {
    switch (status) {
      case "Present":
        return "success";
      case "Absent":
        return "danger";
      case "Half-day":
        return "warning";
      case "On Leave":
        return "info";
      case "Paid Leave":
        return "primary";
      default:
        return "secondary";
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const months = [
    { value: 1, name: 'January' }, { value: 2, name: 'February' }, { value: 3, name: 'March' },
    { value: 4, name: 'April' }, { value: 5, name: 'May' }, { value: 6, name: 'June' },
    { value: 7, name: 'July' }, { value: 8, name: 'August' }, { value: 9, name: 'September' },
    { value: 10, name: 'October' }, { value: 11, name: 'November' }, { value: 12, name: 'December' }
  ];

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <Fragment>
      <Card className="mb-4">
        <CardBody>
          <Row className="align-items-end">
            <Col md={2} xs={12} className="mb-2 mb-md-0">
              <Form.Group controlId="yearFilter">
                <Form.Label>Year</Form.Label>
                <Form.Select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>
                  {years.map(year => <option key={year} value={year}>{year}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2} xs={12} className="mb-2 mb-md-0">
              <Form.Group controlId="monthFilter">
                <Form.Label>Month</Form.Label>
                <Form.Select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))}>
                  {months.map(month => <option key={month.value} value={month.value}>{month.name}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2} xs={12} className="mb-2 mb-md-0">
              <Form.Group controlId="dayFilter">
                <Form.Label>Day</Form.Label>
                <Form.Select value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)}>
                  <option value="All">All</option>
                  {days.map(day => <option key={day} value={day}>{day}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3} xs={12} className="mb-2 mb-md-0">
              <Form.Group controlId="employeeName">
                <Form.Label>Search by Employee</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Name or ID"
                  value={nameQuery}
                  onChange={(e) => setNameQuery(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={2} xs={12} className="mb-2 mb-md-0">
              <Form.Group controlId="statusFilter">
                <Form.Label>Filter by Status</Form.Label>
                <Form.Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="All">All</option>
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                  <option value="Half-day">Half-day</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Paid Leave">Paid Leave</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={1} xs={12} className="text-end">
              <Button variant="primary" onClick={handleResetFilters}>
                <IconRefresh size={20} />
              </Button>
            </Col>
          </Row>
        </CardBody>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <h4 className="mb-0">
            Employee Monthly Summary for {months.find(m => m.value === selectedMonth)?.name} {selectedYear}
          </h4>
        </CardHeader>
        <CardBody>
          <Table hover responsive className="text-nowrap">
            <thead className="table-light">
              <tr>
                <th>Sr. No.</th>
                <th>Employee</th>
                <th className="text-center">Total Present</th>
                <th className="text-center">Total Absent</th>
                <th className="text-center">Half Days</th>
                <th className="text-center">On Leave</th>
                <th className="text-center">Paid Leaves</th>
              </tr>
            </thead>
            <tbody>
              {employeeSummary.map((summary, index) => (
                <tr key={summary.id}>
                  <td>{index + 1}</td>
                  <td>
                    <div className="d-flex align-items-center">
                      <Image
                        src={summary.avatar}
                        alt=""
                        width={40}
                        height={40}
                        className="rounded-circle"
                      />
                      <div className="ms-3">
                        <h5 className="mb-0">{summary.name}</h5>
                        <span className="text-muted">{summary.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="text-center">{summary.present}</td>
                  <td className="text-center">{summary.absent}</td>
                  <td className="text-center">{summary.halfDay}</td>
                  <td className="text-center">{summary.onLeave}</td>
                  <td className="text-center">{summary.paidLeave}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h4 className="mb-0">
            Detailed Daily Log for {months.find(m => m.value === selectedMonth)?.name} {selectedYear}
          </h4>
        </CardHeader>
        <CardBody>
          <Table hover responsive className="text-nowrap">
            <thead className="table-light">
              <tr>
                <th>Sr. No.</th>
                <th>Date</th>
                <th>Employee</th>
                <th>Clock In</th>
                <th>Clock Out</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {currentRecords.map((record, index) => (
                <tr key={record.id}>
                  <td>{indexOfFirstRecord + index + 1}</td>
                  <td>{new Date(record.date).toLocaleDateString('en-GB')}</td>
                  <td>
                    <div className="d-flex align-items-center">
                      <Image
                        src={record.avatar}
                        alt=""
                        width={40}
                        height={40}
                        className="rounded-circle"
                      />
                      <div className="ms-3">
                        <h5 className="mb-0">{record.name}</h5>
                        <span className="text-muted">{record.employeeId}</span>
                      </div>
                    </div>
                  </td>
                  <td>{record.clockIn}</td>
                  <td>{record.clockOut}</td>
                  <td>
                    <Badge
                      bg={getStatusBadge(record.status)}
                      className="bg-opacity-10 text-dark"
                    >
                      {record.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination className="justify-content-end">
            <Pagination.First onClick={() => setCurrentPage(1)} disabled={currentPage === 1} />
            <Pagination.Prev onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} />
            {[...Array(totalPages).keys()].map(number => (
              <Pagination.Item key={number + 1} active={number + 1 === currentPage} onClick={() => setCurrentPage(number + 1)}>
                {number + 1}
              </Pagination.Item>
            ))}
            <Pagination.Next onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} />
            <Pagination.Last onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} />
          </Pagination>
        </CardBody>
      </Card>
    </Fragment>
  );
};

export default AttendanceRecordsClient;