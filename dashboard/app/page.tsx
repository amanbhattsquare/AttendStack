"use client";
import { Button, Col, Container, Row } from "react-bootstrap";
import Link from "next/link";

export default function Home() {
  return (
    <Container fluid className="p-0">
      <Row className="m-0">
        <Col xs={12} className="p-0">
          <div
            className="d-flex flex-column justify-content-center align-items-center vh-100"
            style={{
              background:
                "linear-gradient(45deg, #007bff, #6610f2, #6f42c1, #d63384, #fd7e14, #ffc107)",
            }}
          >
            <h1 className="text-white display-3 fw-bold">
              Welcome to AttendStack
            </h1>
            <p className="text-white lead mb-4">
              The future of professional HR and attendance management.
            </p>
            <div className="d-grid gap-2 d-sm-flex justify-content-sm-center">
              <Link href="/admin/sign-in" passHref>
                <Button variant="light" size="lg" className="px-4 gap-3">
                  Company Login
                </Button>
              </Link>
              <Link href="/sign-in" passHref>
                <Button variant="outline-light" size="lg" className="px-4">
                  Employee Login
                </Button>
              </Link>
            </div>
          </div>
        </Col>
      </Row>
      <footer className="bg-dark text-white text-center p-3">
        <Container>
          <p className="mb-0">
            &copy; {new Date().getFullYear()} AttendStack. All Rights Reserved.
          </p>

        </Container>
      </footer>
    </Container>
  );
}