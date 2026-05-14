"use client";
import { Card, CardBody, CardHeader, Row, Col, Image } from "react-bootstrap";

// This is a placeholder for fetching real employee data
const getEmployeeData = async () => {
  // In a real app, you would fetch this from your database or API
  // for the currently logged-in user.
  return {
    id: "current-user-id",
    fullName: "John Doe",
    designation: "Software Developer",
    avatar: "/images/avatar/avatar-1.jpg",
    personalInfo: {
      email: "john.doe@example.com",
      phone: "123-456-7890",
      gender: "Male",
      dob: "1990-01-01",
      address: "123 Main St, Anytown, USA",
    },
    employmentDetails: {
      employeeId: "EMP001",
      joiningDate: "2023-01-15",
      department: "Engineering",
      employmentType: "Full-time",
      reportingManager: "Jane Smith",
    },
  };
};

const ProfilePage = async () => {
  const employee = await getEmployeeData();

  return (
    <Card>
      <CardHeader>
        <h4 className="mb-0">My Profile</h4>
      </CardHeader>
      <CardBody>
        <Row className="align-items-center">
          <Col xs={12} md={3} className="text-center">
            <Image
              src={employee.avatar}
              alt={employee.fullName}
              roundedCircle
              width={120}
              height={120}
              className="mb-3"
            />
          </Col>
          <Col xs={12} md={9}>
            <h3>{employee.fullName}</h3>
            <p className="text-muted">{employee.designation}</p>
          </Col>
        </Row>
        <hr />
        <h5>Personal Information</h5>
        <Row>
          <Col md={6}>
            <strong>Email:</strong> {employee.personalInfo.email}
          </Col>
          <Col md={6}>
            <strong>Phone:</strong> {employee.personalInfo.phone}
          </Col>
          <Col md={6}>
            <strong>Gender:</strong> {employee.personalInfo.gender}
          </Col>
          <Col md={6}>
            <strong>Date of Birth:</strong> {employee.personalInfo.dob}
          </Col>
          <Col md={12}>
            <strong>Address:</strong> {employee.personalInfo.address}
          </Col>
        </Row>
        <hr />
        <h5>Employment Details</h5>
        <Row>
          <Col md={6}>
            <strong>Employee ID:</strong> {employee.employmentDetails.employeeId}
          </Col>
          <Col md={6}>
            <strong>Joining Date:</strong> {employee.employmentDetails.joiningDate}
          </Col>
          <Col md={6}>
            <strong>Department:</strong> {employee.employmentDetails.department}
          </Col>
          <Col md={6}>
            <strong>Employment Type:</strong> {employee.employmentDetails.employmentType}
          </Col>
          <Col md={6}>
            <strong>Reporting Manager:</strong> {employee.employmentDetails.reportingManager}
          </Col>
        </Row>
      </CardBody>
    </Card>
  );
};

export default ProfilePage;