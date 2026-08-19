"use client";

import React from "react";
import Link from "next/link";
import { Card, Button, Badge } from "react-bootstrap";
import {
  IconLock,
  IconSparkles,
  IconCheck,
  IconShieldLock,
  IconArrowRight,
  IconLayoutDashboard,
} from "@tabler/icons-react";

interface PlanFeatureLockedPaywallProps {
  featureTitle: string;
  featureDescription?: string;
  benefits?: string[];
  requiredTier?: string;
}

export default function PlanFeatureLockedPaywall({
  featureTitle,
  featureDescription = "This feature module is not included in your current workspace tier. Upgrade your AttendStack plan to unlock instant access.",
  benefits = [
    "Full access to this module for all managers & admins",
    "Automated reporting & PDF/CSV export engine",
    "Real-time synchronization across your workforce",
    "Priority support & SLA guarantee",
  ],
  requiredTier = "Growth Pro or Enterprise",
}: PlanFeatureLockedPaywallProps) {
  return (
    <div className="py-5 d-flex justify-content-center align-items-center" style={{ minHeight: "70vh" }}>
      <Card
        className="border-0 shadow-lg text-center p-4 p-md-5 rounded-4 overflow-hidden position-relative"
        style={{
          maxWidth: "600px",
          width: "100%",
          background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
        }}
      >
        {/* Top Accent Line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "5px",
            background: "linear-gradient(90deg, #0d6efd 0%, #6366f1 50%, #10b981 100%)",
          }}
        />

        {/* Lock Icon Circle */}
        <div className="mx-auto mb-3 position-relative d-inline-block">
          <div
            className="d-flex align-items-center justify-content-center rounded-circle"
            style={{
              width: "72px",
              height: "72px",
              background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
              color: "#d97706",
              boxShadow: "0 10px 25px -5px rgba(217, 119, 6, 0.25)",
            }}
          >
            <IconLock size={36} strokeWidth={2} />
          </div>
          <Badge
            bg="primary"
            className="position-absolute bottom-0 end-0 rounded-pill px-2 py-1 shadow-sm"
            style={{ fontSize: "10px" }}
          >
            PRO
          </Badge>
        </div>

        {/* Heading & Notice */}
        <Badge
          bg="warning-subtle"
          className="text-warning-emphasis border border-warning-subtle px-3 py-1.5 rounded-pill fw-bold text-uppercase mx-auto mb-3"
          style={{ letterSpacing: "0.06em", fontSize: "11px" }}
        >
          <IconShieldLock size={14} className="me-1" />
          Subscription Upgrade Required
        </Badge>

        <h2 className="fw-bold text-dark mb-2 fs-3">{featureTitle} is Locked</h2>
        <p className="text-secondary small mb-4 mx-auto" style={{ maxWidth: "460px" }}>
          {featureDescription} Available on <strong>{requiredTier}</strong>.
        </p>

        {/* Benefits List */}
        <div className="bg-white p-3.5 rounded-3 border text-start mb-4 shadow-sm">
          <span className="text-uppercase text-secondary fw-bold small d-block mb-2.5" style={{ fontSize: "11px" }}>
            Included with Plan Upgrade:
          </span>
          <div className="d-flex flex-column gap-2">
            {benefits.map((b, i) => (
              <div className="d-flex align-items-center gap-2 small text-dark" key={i}>
                <span
                  className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 text-success"
                  style={{ width: "18px", height: "18px", background: "#dcfce7" }}
                >
                  <IconCheck size={12} strokeWidth={3} />
                </span>
                <span>{b}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="d-flex flex-column flex-sm-row justify-content-center align-items-center gap-2">
          <Link href="/dashboard" className="w-100 w-sm-auto">
            <Button variant="outline-secondary" className="w-100 fw-semibold px-3 py-2 d-flex align-items-center justify-content-center gap-1.5">
              <IconLayoutDashboard size={16} /> Back to Dashboard
            </Button>
          </Link>
          <Link href="/plans" className="w-100 w-sm-auto">
            <Button
              variant="primary"
              className="w-100 fw-bold px-4 py-2 shadow-sm d-flex align-items-center justify-content-center gap-1.5"
              style={{
                background: "linear-gradient(135deg, #0d6efd 0%, #4f46e5 100%)",
                border: "none",
              }}
            >
              <IconSparkles size={16} /> Upgrade Plan Now <IconArrowRight size={16} />
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
