//import node module libraries
import { Fragment } from "react";
import { Metadata } from "next";
import { Col, Row } from "react-bootstrap";

//import custom components
import DashboardStats from "components/dashboard/DashboardStats";
import TeamsTable from "components/dashboard/TeamsTable";
import ActivityLog from "components/dashboard/ActivityLog";
import UpcomingMeetingSlider from "components/dashboard/UpcomingMeetingSlider";

export const metadata: Metadata = {
  title: "Admin Dashboard | HR & Attendance Management",
  description: "Responsive Bootstrap 5 HR Admin Dashboard",
};

const HomePage = () => {
  return (
    <Fragment>
      <div className="mb-6">
        <h2 className="mb-0 fw-bold">HR Admin Dashboard</h2>
        <p className="text-secondary mb-0">Overview of company workforce, attendance, and recent activities.</p>
      </div>
      <Row className="g-6 mb-6">
        <DashboardStats />
      </Row>
      <Row className="g-6 mb-6">
        <Col xl={8}>
          <TeamsTable />
          <ActivityLog />
        </Col>
        <Col xl={4}>
          <UpcomingMeetingSlider />
        </Col>
      </Row>
    </Fragment>
  );
};

export default HomePage;
