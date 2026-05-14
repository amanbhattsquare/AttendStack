"use client";
import { Card, Table, Row, Col } from "react-bootstrap";

const MySalaryClient = () => {
  // Dummy data for salary details
  const salaryDetails = {
    annualSalary: "₹1,200,000",
    monthlySalary: "₹100,000",
    payFrequency: "Monthly",
  };

  // Dummy data for recent payments
  const recentPayments = [
    {
      date: "2024-05-01",
      amount: "₹100,000",
      status: "Paid",
    },
    {
      date: "2024-04-01",
      amount: "₹100,000",
      status: "Paid",
    },
    {
      date: "2024-03-01",
      amount: "₹100,000",
      status: "Paid",
    },
  ];

  return (
    <Card>
      <Card.Header>
        <h4 className="mb-0">My Salary Details</h4>
      </Card.Header>
      <Card.Body>
        <Row className="mb-4">
          <Col md={4}>
            <h5>Annual Salary</h5>
            <p className="fs-4 fw-bold">{salaryDetails.annualSalary}</p>
          </Col>
          <Col md={4}>
            <h5>Monthly Salary</h5>
            <p className="fs-4 fw-bold">{salaryDetails.monthlySalary}</p>
          </Col>
          <Col md={4}>
            <h5>Pay Frequency</h5>
            <p className="fs-4 fw-bold">{salaryDetails.payFrequency}</p>
          </Col>
        </Row>
        <hr />
        <h5>Recent Payments</h5>
        <Table hover responsive className="text-nowrap">
          <thead className="table-light">
            <tr>
              <th>Date</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recentPayments.map((payment, index) => (
              <tr key={index}>
                <td>{payment.date}</td>
                <td>{payment.amount}</td>
                <td>{payment.status}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  );
};

export default MySalaryClient;