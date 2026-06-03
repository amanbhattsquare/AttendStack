"use client"

import React, { useState, useEffect } from 'react';
import { Card, Col, Row, Button, Form, Alert, Tabs, Tab, Badge, Spinner } from "react-bootstrap";
import Swal from 'sweetalert2';
import {
  IconSettings,
  IconClock,
  IconBuildingBank,
  IconBell,
  IconShieldLock,
  IconMail,
  IconDeviceDesktop,
  IconCheck,
  IconX,
  IconDeviceFloppy,
  IconRefresh,
  IconCalendar,
  IconHeart,
  IconUsers,
  IconBriefcase,
  IconMapPin,
  IconWifi,
  IconCurrentLocation,
  IconAlertTriangle,
} from "@tabler/icons-react";

// API utility to get auth headers
const authHeaders = () => {
  const token = localStorage.getItem("authToken");
  return {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

import { useBranding } from "context/BrandingContext";

// Types for our settings
interface AttendanceSettings {
  shiftStartTime: string;
  lateCutoffTime: string;
  shiftEndTime: string;
  halfDayThreshold: number;
  autoCheckoutEnabled: boolean;
  autoCheckoutTime: string;
  ipRestrictionEnabled: boolean;
  allowedIpRanges: string;
  geofencingEnabled: boolean;
  officeLatitude: string;
  officeLongitude: string;
  geofenceRadius: number;
}

interface NotificationSettings {
  emailNotifications: boolean;
  lateEntryAlert: boolean;
  leaveRequestAlert: boolean;
  salaryProcessedAlert: boolean;
  newEmployeeAlert: boolean;
  browserNotifications: boolean;
  weeklyReportEnabled: boolean;
  weeklyReportDay: string;
}

interface CompanySettings {
  companyName: string;
  companyAddress: string;
  companyEmail: string;
  companyPhone: string;
  timezone: string;
  currency: string;
  dateFormat: string;
  workingDays: string[];
}

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState("attendance");
  const { companyLogo, setCompanyLogo } = useBranding();
  const [logo, setLogo] = useState<{ file: File | null; preview: string | null }>({ file: null, preview: null });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [myIpInfo, setMyIpInfo] = useState<{ client_ip: string; is_currently_allowed: boolean | null } | null>(null);
  const [isFetchingIp, setIsFetchingIp] = useState(false);

  // Detect admin's current GPS location for easy office coord setup
  const detectMyLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setAttendanceSettings((prev) => ({
          ...prev,
          officeLatitude: position.coords.latitude.toFixed(6),
          officeLongitude: position.coords.longitude.toFixed(6),
        }));
        setIsDetectingLocation(false);
      },
      () => {
        alert("Could not detect your location. Please enable location access in your browser.");
        setIsDetectingLocation(false);
      },
      { enableHighAccuracy: true }
    );
  };

  // Fetch admin's detected IP from the backend
  const fetchMyIp = async () => {
    setIsFetchingIp(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_ENDPOINT;
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${API_URL}/api/v1/attendance/my-ip/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMyIpInfo(data);
        // Auto-append to allowed list if not already present
        if (data.client_ip && !attendanceSettings.allowedIpRanges.includes(data.client_ip)) {
          setAttendanceSettings((prev) => ({
            ...prev,
            allowedIpRanges: prev.allowedIpRanges
              ? `${prev.allowedIpRanges}, ${data.client_ip}`
              : data.client_ip,
          }));
        }
      }
    } catch {
      alert("Failed to fetch your IP address. Please try again.");
    } finally {
      setIsFetchingIp(false);
    }
  };

  // Load settings from backend on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_ENDPOINT;
        const response = await fetch(`${API_URL}/api/v1/settings/`, {
          headers: authHeaders(),
        });
        
        if (response.ok) {
          const data = await response.json();
            // Update all settings state with data from backend
           setAttendanceSettings({
                    shiftStartTime: data.shift_start_time,
                    lateCutoffTime: data.late_cutoff_time,
                    shiftEndTime: data.shift_end_time,
                    halfDayThreshold: data.half_day_threshold,
                    autoCheckoutEnabled: data.auto_checkout_enabled,
                    autoCheckoutTime: data.auto_checkout_time,
                    ipRestrictionEnabled: data.ip_restriction_enabled,
                    allowedIpRanges: data.allowed_ip_ranges || "",
                    geofencingEnabled: data.geofencing_enabled,
                    officeLatitude: data.office_latitude || "",
                    officeLongitude: data.office_longitude || "",
                    geofenceRadius: data.geofence_radius,
                  });

            // Load comprehensive leave settings from backend
            setLeaveSettings({
              sundayUnpaidRuleEnabled: data.sunday_unpaid_rule_enabled,
              burgerRuleEnabled: data.burger_rule_enabled,
              monthlyPaidLeaveDays: data.monthly_paid_leave_days ?? 1,
              annualPaidLeaveDays: data.annual_paid_leave_days,
              sickLeaveDays: data.sick_leave_days,
              casualLeaveDays: data.casual_leave_days,
              maternityLeaveDays: data.maternity_leave_days,
              paternityLeaveDays: data.paternity_leave_days,
              bereavementLeaveDays: data.bereavement_leave_days || 5,
              marriageLeaveDays: data.marriage_leave_days || 10,
              studyLeaveDays: data.study_leave_days || 0,
              leaveCarryoverEnabled: data.leave_carryover_enabled !== undefined ? data.leave_carryover_enabled : true,
              maxCarryoverDays: data.max_carryover_days || 5,
              leaveEncashmentEnabled: data.leave_encashment_enabled !== undefined ? data.leave_encashment_enabled : true,
              maxEncashmentDays: data.max_encashment_days || 10,
              clubbingEnabled: data.clubbing_enabled !== undefined ? data.clubbing_enabled : true,
              minDaysBeforeApply: data.min_days_before_apply || 1,
              maxConsecutiveDays: data.max_consecutive_days || 30,
              autoApproveEnabled: data.auto_approve_enabled !== undefined ? data.auto_approve_enabled : false,
              approvalHierarchy: data.approval_hierarchy || "2level",
              requireMedicalCertificate: data.require_medical_certificate || 3,
              nationalHolidaysCount: data.national_holidays_count || 12,
              festivalHolidaysCount: data.festival_holidays_count || 6,
            });

            setNotificationSettings({
             emailNotifications: data.email_notifications,
             lateEntryAlert: data.late_entry_alert,
             leaveRequestAlert: data.leave_request_alert,
             salaryProcessedAlert: data.salary_processed_alert,
             newEmployeeAlert: data.new_employee_alert,
             browserNotifications: data.browser_notifications,
             weeklyReportEnabled: data.weekly_report_enabled,
             weeklyReportDay: data.weekly_report_day,
            });

             setCompanySettings({
              companyName: data.company_name,
              companyAddress: data.company_address,
              companyEmail: data.company_email,
              companyPhone: data.company_phone,
              timezone: data.timezone,
              currency: data.currency,
              dateFormat: data.date_format,
              workingDays: data.working_days,
            });
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Leave settings state - comprehensive for corporate startup
  const [leaveSettings, setLeaveSettings] = useState({
    // Core leave balances
    monthlyPaidLeaveDays: 1,
    annualPaidLeaveDays: 21,
    sickLeaveDays: 12,
    casualLeaveDays: 6,
    maternityLeaveDays: 180,
    paternityLeaveDays: 14,
    bereavementLeaveDays: 5,
    marriageLeaveDays: 10,
    studyLeaveDays: 0,
    
    // Leave policies
    leaveCarryoverEnabled: true,
    maxCarryoverDays: 5,
    leaveEncashmentEnabled: true,
    maxEncashmentDays: 10,
    sundayUnpaidRuleEnabled: false,
    burgerRuleEnabled: false,
    clubbingEnabled: true,
    minDaysBeforeApply: 1,
    maxConsecutiveDays: 30,
    
    // Approval workflows
    autoApproveEnabled: false,
    approvalHierarchy: "2level", // 1level, 2level
    requireMedicalCertificate: 3, // days after which medical certificate is required
    
    // Holiday settings
    nationalHolidaysCount: 12,
    festivalHolidaysCount: 6,
  });
  
  // Attendance settings state
  const [attendanceSettings, setAttendanceSettings] = useState({
          shiftStartTime: "10:00",
          lateCutoffTime: "10:15",
          shiftEndTime: "18:00",
          halfDayThreshold: 4,
          autoCheckoutEnabled: true,
          autoCheckoutTime: "20:00",
          ipRestrictionEnabled: false,
          allowedIpRanges: "",
          geofencingEnabled: false,
          officeLatitude: "",
          officeLongitude: "",
          geofenceRadius: 100,
        });

  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    lateEntryAlert: true,
    leaveRequestAlert: true,
    salaryProcessedAlert: true,
    newEmployeeAlert: false,
    browserNotifications: true,
    weeklyReportEnabled: true,
    weeklyReportDay: "monday",
  });

  // Company settings state
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    companyName: "Bhatt Square Pvt. Ltd.",
    companyAddress: "123 Business Park, Mumbai, Maharashtra 400001",
    companyEmail: "admin@bhattsquare.com",
    companyPhone: "+91 98765 43210",
    timezone: "Asia/Kolkata",
    currency: "INR",
    dateFormat: "DD/MM/YYYY",
    workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
  });

  const workingDaysOptions = [
    { value: "monday", label: "Monday" },
    { value: "tuesday", label: "Tuesday" },
    { value: "wednesday", label: "Wednesday" },
    { value: "thursday", label: "Thursday" },
    { value: "friday", label: "Friday" },
    { value: "saturday", label: "Saturday" },
    { value: "sunday", label: "Sunday" },
  ];

  // Handle working day toggle
  const handleWorkingDayToggle = (day: string) => {
    setCompanySettings((prev) => {
      const workingDays = prev.workingDays.includes(day)
        ? prev.workingDays.filter((d) => d !== day)
        : [...prev.workingDays, day];
      return { ...prev, workingDays };
    });
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo({ file, preview: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveLogo = async () => {
    if (!logo.file) return;

    const formData = new FormData();
    formData.append('company_logo', logo.file);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_ENDPOINT;
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_URL}/api/v1/settings/`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload logo");
      }

      const data = await response.json();
      setCompanyLogo(data.company_logo);

      Swal.fire({
        icon: 'success',
        title: 'Logo Saved!',
        text: 'Your new company logo has been saved.',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'Failed to save logo. Please try again.',
      });
    }
  };

  // Save all settings
  const handleSaveSettings = async () => {
    setIsSaving(true);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_ENDPOINT;
      
      // Prepare all settings to send to backend
      const payload = {
        // Attendance settings
        shift_start_time: attendanceSettings.shiftStartTime,
        late_cutoff_time: attendanceSettings.lateCutoffTime,
        shift_end_time: attendanceSettings.shiftEndTime,
        half_day_threshold: attendanceSettings.halfDayThreshold,
        auto_checkout_enabled: attendanceSettings.autoCheckoutEnabled,
        auto_checkout_time: attendanceSettings.autoCheckoutTime,
        ip_restriction_enabled: attendanceSettings.ipRestrictionEnabled,
        allowed_ip_ranges: attendanceSettings.allowedIpRanges,
        geofencing_enabled: attendanceSettings.geofencingEnabled,
        office_latitude: attendanceSettings.officeLatitude,
        office_longitude: attendanceSettings.officeLongitude,
        geofence_radius: attendanceSettings.geofenceRadius,
        
        // Full leave settings (comprehensive for startup)
        sunday_unpaid_rule_enabled: leaveSettings.sundayUnpaidRuleEnabled,
        burger_rule_enabled: leaveSettings.burgerRuleEnabled,
        monthly_paid_leave_days: leaveSettings.monthlyPaidLeaveDays,
        annual_paid_leave_days: leaveSettings.annualPaidLeaveDays,
        sick_leave_days: leaveSettings.sickLeaveDays,
        casual_leave_days: leaveSettings.casualLeaveDays,
        maternity_leave_days: leaveSettings.maternityLeaveDays,
        paternity_leave_days: leaveSettings.paternityLeaveDays,
        bereavement_leave_days: leaveSettings.bereavementLeaveDays,
        marriage_leave_days: leaveSettings.marriageLeaveDays,
        study_leave_days: leaveSettings.studyLeaveDays,
        leave_carryover_enabled: leaveSettings.leaveCarryoverEnabled,
        max_carryover_days: leaveSettings.maxCarryoverDays,
        leave_encashment_enabled: leaveSettings.leaveEncashmentEnabled,
        max_encashment_days: leaveSettings.maxEncashmentDays,
        clubbing_enabled: leaveSettings.clubbingEnabled,
        min_days_before_apply: leaveSettings.minDaysBeforeApply,
        max_consecutive_days: leaveSettings.maxConsecutiveDays,
        auto_approve_enabled: leaveSettings.autoApproveEnabled,
        approval_hierarchy: leaveSettings.approvalHierarchy,
        require_medical_certificate: leaveSettings.requireMedicalCertificate,
        national_holidays_count: leaveSettings.nationalHolidaysCount,
        festival_holidays_count: leaveSettings.festivalHolidaysCount,
        
        // Notification settings
        email_notifications: notificationSettings.emailNotifications,
        late_entry_alert: notificationSettings.lateEntryAlert,
        leave_request_alert: notificationSettings.leaveRequestAlert,
        salary_processed_alert: notificationSettings.salaryProcessedAlert,
        new_employee_alert: notificationSettings.newEmployeeAlert,
        browser_notifications: notificationSettings.browserNotifications,
        weekly_report_enabled: notificationSettings.weeklyReportEnabled,
        weekly_report_day: notificationSettings.weeklyReportDay,
        
        // Company settings
        company_name: companySettings.companyName,
        company_address: companySettings.companyAddress,
        company_email: companySettings.companyEmail,
        company_phone: companySettings.companyPhone,
        timezone: companySettings.timezone,
        currency: companySettings.currency,
        date_format: companySettings.dateFormat,
        working_days: companySettings.workingDays,
      };

      // Send PATCH request to update settings
      const response = await fetch(`${API_URL}/api/v1/settings/`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to update settings");
      }
      
      Swal.fire({
        icon: 'success',
        title: 'Settings Saved!',
        text: 'Your changes have been applied successfully.',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'Failed to save settings. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to defaults
  const handleResetDefaults = () => {
    if (confirm("Are you sure you want to reset all settings to default values?")) {
      setAttendanceSettings({
        shiftStartTime: "10:00",
        lateCutoffTime: "10:15",
        shiftEndTime: "18:00",
        halfDayThreshold: 4,
        autoCheckoutEnabled: true,
        autoCheckoutTime: "20:00",
        ipRestrictionEnabled: false,
        allowedIpRanges: "",
        geofencingEnabled: false,
        officeLatitude: "",
        officeLongitude: "",
        geofenceRadius: 100,
      });
    }
  };

  const totalLeaveDays = 
    (leaveSettings.annualPaidLeaveDays || 0) +
    (leaveSettings.sickLeaveDays || 0) +
    (leaveSettings.casualLeaveDays || 0);

  const totalHolidays = 
    (leaveSettings.nationalHolidaysCount || 0) + 
    (leaveSettings.festivalHolidaysCount || 0);

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="mb-6">
        <h2 className="mb-0 fw-bold">System Settings</h2>
        <p className="text-secondary mb-0">Configure your organization's attendance rules, notifications, and company settings</p>
      </div>

      <Row className="g-4">
        <Col lg={12}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-0">
              <Tabs
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k || "attendance")}
                className="border-0 p-0"
              >
                {/* Attendance Rules Tab */}
                <Tab
                  eventKey="attendance"
                  title={
                    <span className="d-flex align-items-center gap-2 py-2">
                      <IconClock size={18} />
                      Attendance Rules
                    </span>
                  }
                >
                  <div className="p-4 border-top">
                    <Row className="g-4">
                      {/* Left Column - Shift & Time */}
                      <Col md={6}>
                        <Card className="border-0 shadow-sm">
                          <Card.Body>
                            <h5 className="fw-bold mb-4 d-flex align-items-center gap-2">
                              <IconClock size={20} />
                              Shift & Time Configuration
                            </h5>
                            <p className="text-muted small mb-4">Set your company's official working hours and late policies.</p>
                            <Row className="g-3">
                              <Col md={6}>
                                <Form.Group>
                                  <Form.Label className="fw-semibold">Shift Start Time</Form.Label>
                                  <Form.Control
                                    type="time"
                                    value={attendanceSettings.shiftStartTime}
                                    onChange={(e) => setAttendanceSettings({ ...attendanceSettings, shiftStartTime: e.target.value })}
                                  />
                                  <Form.Text>Official time when work starts.</Form.Text>
                                </Form.Group>
                              </Col>
                              <Col md={6}>
                                <Form.Group>
                                  <Form.Label className="fw-semibold">Late Cutoff Time</Form.Label>
                                  <Form.Control
                                    type="time"
                                    value={attendanceSettings.lateCutoffTime}
                                    onChange={(e) => setAttendanceSettings({ ...attendanceSettings, lateCutoffTime: e.target.value })}
                                  />
                                  <Form.Text>Time after which an employee is marked late.</Form.Text>
                                </Form.Group>
                              </Col>
                              <Col md={6}>
                                <Form.Group>
                                  <Form.Label className="fw-semibold">Shift End Time</Form.Label>
                                  <Form.Control
                                    type="time"
                                    value={attendanceSettings.shiftEndTime}
                                    onChange={(e) => setAttendanceSettings({ ...attendanceSettings, shiftEndTime: e.target.value })}
                                  />
                                  <Form.Text>Official time when work ends.</Form.Text>
                                </Form.Group>
                              </Col>
                              <Col md={6}>
                                <Form.Group>
                                  <Form.Label className="fw-semibold">Half-Day Threshold (Hours)</Form.Label>
                                  <Form.Control
                                    type="number"
                                    value={attendanceSettings.halfDayThreshold}
                                    onChange={(e) => setAttendanceSettings({ ...attendanceSettings, halfDayThreshold: parseInt(e.target.value) || 0 })}
                                  />
                                  <Form.Text>Minimum hours for a half-day.</Form.Text>
                                </Form.Group>
                              </Col>
                              <Col xs={12}>
                                <Form.Group>
                                  <Form.Check
                                    type="switch"
                                    id="auto-checkout-switch"
                                    label="Enable Auto Checkout"
                                    checked={attendanceSettings.autoCheckoutEnabled}
                                    onChange={(e) => setAttendanceSettings({ ...attendanceSettings, autoCheckoutEnabled: e.target.checked })}
                                  />
                                  <Form.Text>Automatically check out employees who forget to.</Form.Text>
                                </Form.Group>
                              </Col>
                              {attendanceSettings.autoCheckoutEnabled && (
                                <Col md={6}>
                                  <Form.Group>
                                    <Form.Label className="fw-semibold">Auto Checkout Time</Form.Label>
                                    <Form.Control
                                      type="time"
                                      value={attendanceSettings.autoCheckoutTime}
                                      onChange={(e) => setAttendanceSettings({ ...attendanceSettings, autoCheckoutTime: e.target.value })}
                                    />
                                    <Form.Text>Time for automatic checkout.</Form.Text>
                                  </Form.Group>
                                </Col>
                              )}
                            </Row>
                          </Card.Body>
                        </Card>
                      </Col>

                      {/* Right Column - Location & Security */}
                      <Col md={6}>
                        <Card className="border-0 shadow-sm">
                          <Card.Body>
                            <h5 className="fw-bold mb-1 d-flex align-items-center gap-2">
                              <IconShieldLock size={20} />
                              Location &amp; Security
                            </h5>
                            <p className="text-muted small mb-4">Restrict attendance marking to specific locations or IP addresses. Employees can still log in from anywhere.</p>

                            {/* ── IP Restriction ── */}
                            <div className="p-3 rounded-3 mb-4" style={{ background: "#f8f9fa", border: "1px solid #e9ecef" }}>
                              <Form.Group className="mb-2">
                                <Form.Check
                                  type="switch"
                                  id="ip-restriction-switch"
                                  label={<span className="fw-semibold">Enable IP Address Restriction</span>}
                                  checked={attendanceSettings.ipRestrictionEnabled}
                                  onChange={(e) => setAttendanceSettings({ ...attendanceSettings, ipRestrictionEnabled: e.target.checked })}
                                />
                                <Form.Text className="ms-4 ps-2">Allow attendance marking only from authorised IP addresses or CIDR ranges.</Form.Text>
                              </Form.Group>

                              {attendanceSettings.ipRestrictionEnabled && (
                                <div className="mt-3">
                                  <Form.Group className="mb-2">
                                    <Form.Label className="fw-semibold small mb-1">Allowed IP Ranges</Form.Label>
                                    <Form.Control
                                      as="textarea"
                                      rows={3}
                                      placeholder="e.g., 192.168.1.0/24, 10.0.0.1, 203.0.113.5"
                                      value={attendanceSettings.allowedIpRanges}
                                      onChange={(e) => setAttendanceSettings({ ...attendanceSettings, allowedIpRanges: e.target.value })}
                                      className="font-monospace small"
                                    />
                                    <Form.Text>Comma-separated. Supports single IPs and CIDR ranges (e.g. 192.168.1.0/24).</Form.Text>
                                  </Form.Group>

                                  {/* What is my IP helper */}
                                  <div className="d-flex align-items-center gap-2 mt-2 flex-wrap">
                                    <Button
                                      size="sm"
                                      variant="outline-primary"
                                      className="d-inline-flex align-items-center gap-1"
                                      onClick={fetchMyIp}
                                      disabled={isFetchingIp}
                                      id="btn-detect-my-ip"
                                    >
                                      <IconWifi size={14} />
                                      {isFetchingIp ? "Detecting..." : "What is my IP?"}
                                    </Button>
                                    {myIpInfo && (
                                      <span className={`badge rounded-pill ${
                                        myIpInfo.is_currently_allowed === true
                                          ? "bg-success-subtle text-success border border-success-subtle"
                                          : myIpInfo.is_currently_allowed === false
                                          ? "bg-danger-subtle text-danger border border-danger-subtle"
                                          : "bg-secondary-subtle text-secondary border border-secondary-subtle"
                                      }`}>
                                        {myIpInfo.client_ip}
                                        {myIpInfo.is_currently_allowed === true && " ✓ Allowed"}
                                        {myIpInfo.is_currently_allowed === false && " ✗ Not allowed"}
                                      </span>
                                    )}
                                  </div>
                                  {myIpInfo?.is_currently_allowed === false && (
                                    <div className="alert alert-warning d-flex align-items-center gap-2 mt-2 py-2 px-3 small">
                                      <IconAlertTriangle size={16} />
                                      Your current IP is <strong>{myIpInfo.client_ip}</strong>. It has been added to the list above. Save settings to allow it.
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* ── Geofencing ── */}
                            <div className="p-3 rounded-3" style={{ background: "#f8f9fa", border: "1px solid #e9ecef" }}>
                              <Form.Group className="mb-2">
                                <Form.Check
                                  type="switch"
                                  id="geofencing-switch"
                                  label={<span className="fw-semibold">Enable Geofencing Restriction</span>}
                                  checked={attendanceSettings.geofencingEnabled}
                                  onChange={(e) => setAttendanceSettings({ ...attendanceSettings, geofencingEnabled: e.target.checked })}
                                />
                                <Form.Text className="ms-4 ps-2">Allow attendance marking only from within a specific geographic radius of the office.</Form.Text>
                              </Form.Group>

                              {attendanceSettings.geofencingEnabled && (
                                <div className="mt-3">
                                  {/* Detect My Location helper */}
                                  <div className="d-flex align-items-center justify-content-between mb-3">
                                    <span className="small text-muted fw-semibold">Office Coordinates</span>
                                    <Button
                                      size="sm"
                                      variant="outline-success"
                                      className="d-inline-flex align-items-center gap-1"
                                      onClick={detectMyLocation}
                                      disabled={isDetectingLocation}
                                      id="btn-detect-my-location"
                                    >
                                      <IconCurrentLocation size={14} />
                                      {isDetectingLocation ? "Detecting..." : "Use My Location"}
                                    </Button>
                                  </div>

                                  <Row className="g-3">
                                    <Col md={6}>
                                      <Form.Group>
                                        <Form.Label className="fw-semibold small mb-1">Office Latitude</Form.Label>
                                        <Form.Control
                                          type="text"
                                          placeholder="e.g., 26.8342"
                                          value={attendanceSettings.officeLatitude}
                                          onChange={(e) => setAttendanceSettings({ ...attendanceSettings, officeLatitude: e.target.value })}
                                        />
                                      </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                      <Form.Group>
                                        <Form.Label className="fw-semibold small mb-1">Office Longitude</Form.Label>
                                        <Form.Control
                                          type="text"
                                          placeholder="e.g., 80.9862"
                                          value={attendanceSettings.officeLongitude}
                                          onChange={(e) => setAttendanceSettings({ ...attendanceSettings, officeLongitude: e.target.value })}
                                        />
                                      </Form.Group>
                                    </Col>
                                    <Col md={12}>
                                      <Form.Group>
                                        <Form.Label className="fw-semibold small mb-1">Geofence Radius (meters)</Form.Label>
                                        <Form.Control
                                          type="number"
                                          min={50}
                                          max={5000}
                                          value={attendanceSettings.geofenceRadius}
                                          onChange={(e) => setAttendanceSettings({ ...attendanceSettings, geofenceRadius: parseInt(e.target.value) || 100 })}
                                        />
                                        <Form.Text>Employees must be within this radius of the office to mark attendance.</Form.Text>
                                      </Form.Group>
                                    </Col>
                                  </Row>

                                  {/* Live preview */}
                                  {attendanceSettings.officeLatitude && attendanceSettings.officeLongitude && (
                                    <div className="d-flex align-items-center gap-2 mt-3 p-2 rounded-2 bg-primary-subtle">
                                      <IconMapPin size={16} className="text-primary flex-shrink-0" />
                                      <span className="small text-primary">
                                        Employees must be within <strong>{attendanceSettings.geofenceRadius}m</strong> of
                                        &nbsp;({parseFloat(attendanceSettings.officeLatitude).toFixed(4)},&nbsp;
                                        {parseFloat(attendanceSettings.officeLongitude).toFixed(4)})
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>
                  </div>
                </Tab>
                
                {/* Leave Settings Tab */}
                <Tab
                  eventKey="leave"
                  title={
                    <span className="d-flex align-items-center gap-2 py-2">
                      <IconCalendar size={18} />
                      Leave Settings
                    </span>
                  }
                >
                  <div className="p-4 border-top">
                    {/* Leave Policy Overview Cards */}
                    <Row className="mb-4 g-4">
                      <Col md={3}>
                        <Card className="border-0 bg-primary bg-opacity-10">
                          <Card.Body className="text-center">
                            <h3 className="fw-bold text-primary mb-0">{totalLeaveDays}</h3>
                            <p className="text-muted small mb-0">Total Leave Days</p>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={3}>
                        <Card className="border-0 bg-success bg-opacity-10">
                          <Card.Body className="text-center">
                            <h3 className="fw-bold text-success mb-0">{totalHolidays}</h3>
                            <p className="text-muted small mb-0">Company Holidays</p>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={3}>
                        <Card className="border-0 bg-info bg-opacity-10">
                          <Card.Body className="text-center">
                            <h3 className="fw-bold text-info mb-0">{leaveSettings.maxConsecutiveDays}</h3>
                            <p className="text-muted small mb-0">Max Consecutive Leave</p>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={3}>
                        <Card className="border-0 bg-warning bg-opacity-10">
                          <Card.Body className="text-center">
                            <h3 className="fw-bold text-warning mb-0">{leaveSettings.maxCarryoverDays}</h3>
                            <p className="text-muted small mb-0">Max Carryover Days</p>
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>

                    <Row className="g-4">
                      {/* Left Column - Core Leave Balances */}
                      <Col md={6}>
                        {/* Paid Leave Balances */}
                        <Card className="border-0 shadow-sm mb-4">
                          <Card.Body>
                            <h5 className="fw-bold mb-4 d-flex align-items-center gap-2">
                              <IconBriefcase size={20} />
                              Core Leave Balances
                            </h5>
                            <p className="text-muted small mb-4">Standard leave allocations for all full-time employees .</p>
                            <Row className="g-3">
                              <Col md={6}>
                                <Form.Group>
                                  <Form.Label className="fw-semibold">Monthly Paid Leave</Form.Label>
                                  <Form.Control
                                    type="number"
                                    min={0}
                                    max={31}
                                    value={leaveSettings.monthlyPaidLeaveDays}
                                    onChange={(e) => setLeaveSettings({ ...leaveSettings, monthlyPaidLeaveDays: parseInt(e.target.value) || 0 })}
                                  />
                                  <Form.Text>Paid leave days allowed per employee each month</Form.Text>
                                </Form.Group>
                              </Col>
                              <Col md={6}>
                                <Form.Group>
                                  <Form.Label className="fw-semibold">Annual Paid Leave</Form.Label>
                                  <Form.Control
                                    type="number"
                                    value={leaveSettings.annualPaidLeaveDays}
                                    onChange={(e) => setLeaveSettings({ ...leaveSettings, annualPaidLeaveDays: parseInt(e.target.value) })}
                                  />
                                  <Form.Text>Vacation/Personal leave days/year</Form.Text>
                                </Form.Group>
                              </Col>
                              <Col md={6}>
                                <Form.Group>
                                  <Form.Label className="fw-semibold">Sick Leave</Form.Label>
                                  <Form.Control
                                    type="number"
                                    value={leaveSettings.sickLeaveDays}
                                    onChange={(e) => setLeaveSettings({ ...leaveSettings, sickLeaveDays: parseInt(e.target.value) })}
                                  />
                                  <Form.Text>Health & medical leave</Form.Text>
                                </Form.Group>
                              </Col>
                              <Col md={6}>
                                <Form.Group>
                                  <Form.Label className="fw-semibold">Casual Leave</Form.Label>
                                  <Form.Control
                                    type="number"
                                    value={leaveSettings.casualLeaveDays}
                                    onChange={(e) => setLeaveSettings({ ...leaveSettings, casualLeaveDays: parseInt(e.target.value) })}
                                  />
                                  <Form.Text>Urgent personal matters</Form.Text>
                                </Form.Group>
                              </Col>
                              <Col md={6}>
                                <Form.Group>
                                  <Form.Label className="fw-semibold">Bereavement Leave</Form.Label>
                                  <Form.Control
                                    type="number"
                                    value={leaveSettings.bereavementLeaveDays}
                                    onChange={(e) => setLeaveSettings({ ...leaveSettings, bereavementLeaveDays: parseInt(e.target.value) })}
                                  />
                                  <Form.Text>Family emergency leave</Form.Text>
                                </Form.Group>
                              </Col>
                              <Col md={6}>
                                <Form.Group>
                                  <Form.Label className="fw-semibold">Marriage Leave</Form.Label>
                                  <Form.Control
                                    type="number"
                                    value={leaveSettings.marriageLeaveDays}
                                    onChange={(e) => setLeaveSettings({ ...leaveSettings, marriageLeaveDays: parseInt(e.target.value) })}
                                  />
                                  <Form.Text>Wedding celebrations</Form.Text>
                                </Form.Group>
                              </Col>
                              <Col md={6}>
                                <Form.Group>
                                  <Form.Label className="fw-semibold">Study Leave</Form.Label>
                                  <Form.Control
                                    type="number"
                                    value={leaveSettings.studyLeaveDays}
                                    onChange={(e) => setLeaveSettings({ ...leaveSettings, studyLeaveDays: parseInt(e.target.value) })}
                                  />
                                  <Form.Text>Professional development</Form.Text>
                                </Form.Group>
                              </Col>
                            </Row>
                          </Card.Body>
                        </Card>

                        {/* Parental Leave */}
                        <Card className="border-0 shadow-sm">
                          <Card.Body>
                            <h5 className="fw-bold mb-4 d-flex align-items-center gap-2">
                              <IconHeart size={20} />
                              Parental Leave
                            </h5>
                            <p className="text-muted small mb-4">Family-friendly policies to support new parents</p>
                            <Row className="g-3">
                              <Col md={6}>
                                <Form.Group>
                                  <Form.Label className="fw-semibold">Maternity Leave</Form.Label>
                                  <Form.Control
                                    type="number"
                                    value={leaveSettings.maternityLeaveDays}
                                    onChange={(e) => setLeaveSettings({ ...leaveSettings, maternityLeaveDays: parseInt(e.target.value) })}
                                  />
                                  <Form.Text>Paid leave for mothers</Form.Text>
                                </Form.Group>
                              </Col>
                              <Col md={6}>
                                <Form.Group>
                                  <Form.Label className="fw-semibold">Paternity Leave</Form.Label>
                                  <Form.Control
                                    type="number"
                                    value={leaveSettings.paternityLeaveDays}
                                    onChange={(e) => setLeaveSettings({ ...leaveSettings, paternityLeaveDays: parseInt(e.target.value) })}
                                  />
                                  <Form.Text>Paid leave for fathers</Form.Text>
                                </Form.Group>
                              </Col>
                            </Row>
                          </Card.Body>
                        </Card>
                      </Col>

                      {/* Right Column - Policies & Workflow */}
                      <Col md={6}>
                        {/* Holiday Settings */}
                        <Card className="border-0 shadow-sm mb-4">
                          <Card.Body>
                            <h5 className="fw-bold mb-4 d-flex align-items-center gap-2">
                              <IconCalendar size={20} />
                              Holiday Configuration
                            </h5>
                            <Row className="g-3">
                              <Col md={6}>
                                <Form.Group>
                                  <Form.Label className="fw-semibold">National Holidays</Form.Label>
                                  <Form.Control
                                    type="number"
                                    value={leaveSettings.nationalHolidaysCount}
                                    onChange={(e) => setLeaveSettings({ ...leaveSettings, nationalHolidaysCount: parseInt(e.target.value) })}
                                  />
                                  <Form.Text>Government declared holidays</Form.Text>
                                </Form.Group>
                              </Col>
                              <Col md={6}>
                                <Form.Group>
                                  <Form.Label className="fw-semibold">Festival Holidays</Form.Label>
                                  <Form.Control
                                    type="number"
                                    value={leaveSettings.festivalHolidaysCount}
                                    onChange={(e) => setLeaveSettings({ ...leaveSettings, festivalHolidaysCount: parseInt(e.target.value) })}
                                  />
                                  <Form.Text>Cultural/religious holidays</Form.Text>
                                </Form.Group>
                              </Col>
                            </Row>
                          </Card.Body>
                        </Card>

                        {/* Leave Policies */}
                        <Card className="border-0 shadow-sm mb-4">
                          <Card.Body>
                            <h5 className="fw-bold mb-4 d-flex align-items-center gap-2">
                              <IconSettings size={20} />
                              Leave Policies
                            </h5>
                            <p className="text-muted small mb-4">Rules that govern how leaves can be used</p>
                            
                            <div className="d-flex flex-column gap-3">
                              <Form.Group>
                                <div className="d-flex justify-content-between align-items-center">
                                  <div>
                                    <Form.Label className="fw-semibold mb-0">Enable Leave Carryover</Form.Label>
                                    <Form.Text className="small mb-0">Allow employees to carry unused leaves to next year</Form.Text>
                                  </div>
                                  <Form.Check
                                    type="switch"
                                    checked={leaveSettings.leaveCarryoverEnabled}
                                    onChange={(e) => setLeaveSettings({ ...leaveSettings, leaveCarryoverEnabled: e.target.checked })}
                                  />
                                </div>
                              </Form.Group>

                              {leaveSettings.leaveCarryoverEnabled && (
                                <Form.Group>
                                  <Form.Label className="fw-semibold">Max Carryover Days</Form.Label>
                                  <Form.Control
                                    type="number"
                                    value={leaveSettings.maxCarryoverDays}
                                    onChange={(e) => setLeaveSettings({ ...leaveSettings, maxCarryoverDays: parseInt(e.target.value) })}
                                  />
                                </Form.Group>
                              )}

                              <hr className="my-2" />

                              <Form.Group>
                                <div className="d-flex justify-content-between align-items-center">
                                  <div>
                                    <Form.Label className="fw-semibold mb-0">Enable Leave Encashment</Form.Label>
                                    <Form.Text className="small mb-0">Allow cashing out unused leave days</Form.Text>
                                  </div>
                                  <Form.Check
                                    type="switch"
                                    checked={leaveSettings.leaveEncashmentEnabled}
                                    onChange={(e) => setLeaveSettings({ ...leaveSettings, leaveEncashmentEnabled: e.target.checked })}
                                  />
                                </div>
                              </Form.Group>

                              {leaveSettings.leaveEncashmentEnabled && (
                                <Form.Group>
                                  <Form.Label className="fw-semibold">Max Encashment Days</Form.Label>
                                  <Form.Control
                                    type="number"
                                    value={leaveSettings.maxEncashmentDays}
                                    onChange={(e) => setLeaveSettings({ ...leaveSettings, maxEncashmentDays: parseInt(e.target.value) })}
                                  />
                                </Form.Group>
                              )}

                              <hr className="my-2" />

                              <Form.Group>
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <Form.Label className="fw-semibold mb-0">Sunday Unpaid Rule</Form.Label>
                              <Form.Text className="small mb-0">Sunday is unpaid if leave taken before & after</Form.Text>
                            </div>
                            <Form.Check
                              type="switch"
                              checked={leaveSettings.sundayUnpaidRuleEnabled}
                              onChange={(e) => setLeaveSettings({ ...leaveSettings, sundayUnpaidRuleEnabled: e.target.checked })}
                            />
                          </div>
                        </Form.Group>
                        <Form.Group>
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <Form.Label className="fw-semibold mb-0">Burger Rule</Form.Label>
                              <Form.Text className="small mb-0">Holiday is unpaid if sandwiched between leaves</Form.Text>
                            </div>
                            <Form.Check
                              type="switch"
                              checked={leaveSettings.burgerRuleEnabled}
                              onChange={(e) => setLeaveSettings({ ...leaveSettings, burgerRuleEnabled: e.target.checked })}
                            />
                          </div>
                        </Form.Group>
                            </div>
                          </Card.Body>
                        </Card>

                        {/* Approval Workflow */}
                        <Card className="border-0 shadow-sm">
                          <Card.Body>
                            <h5 className="fw-bold mb-4 d-flex align-items-center gap-2">
                              <IconUsers size={20} />
                              Approval Workflow
                            </h5>
                            <p className="text-muted small mb-4">Configure how leave requests are approved</p>
                            
                            <div className="d-flex flex-column gap-3">
                              <Form.Group>
                                <div className="d-flex justify-content-between align-items-center">
                                  <div>
                                    <Form.Label className="fw-semibold mb-0">Auto-Approve Short Leaves</Form.Label>
                                    <Form.Text className="small mb-0">Automatically approve 1-day leave requests</Form.Text>
                                  </div>
                                  <Form.Check
                                    type="switch"
                                    checked={leaveSettings.autoApproveEnabled}
                                    onChange={(e) => setLeaveSettings({ ...leaveSettings, autoApproveEnabled: e.target.checked })}
                                  />
                                </div>
                              </Form.Group>

                              <Form.Group>
                                <Form.Label className="fw-semibold">Approval Hierarchy</Form.Label>
                                <Form.Select
                                  value={leaveSettings.approvalHierarchy}
                                  onChange={(e) => setLeaveSettings({ ...leaveSettings, approvalHierarchy: e.target.value })}
                                >
                                  <option value="1level">1-Level (Manager only)</option>
                                  <option value="2level">2-Level (Manager + HR)</option>
                                </Form.Select>
                              </Form.Group>

                              <Form.Group>
                                <Form.Label className="fw-semibold">Medical Certificate Required After (days)</Form.Label>
                                <Form.Control
                                  type="number"
                                  value={leaveSettings.requireMedicalCertificate}
                                  onChange={(e) => setLeaveSettings({ ...leaveSettings, requireMedicalCertificate: parseInt(e.target.value) })}
                                />
                                <Form.Text>Sick leave longer than this needs medical proof</Form.Text>
                              </Form.Group>

                              <Form.Group>
                                <Form.Label className="fw-semibold">Minimum Advance Notice (days)</Form.Label>
                                <Form.Control
                                  type="number"
                                  value={leaveSettings.minDaysBeforeApply}
                                  onChange={(e) => setLeaveSettings({ ...leaveSettings, minDaysBeforeApply: parseInt(e.target.value) })}
                                />
                                <Form.Text>Days before leave employees must apply</Form.Text>
                              </Form.Group>

                              <Form.Group>
                                <Form.Label className="fw-semibold">Max Consecutive Leave Days</Form.Label>
                                <Form.Control
                                  type="number"
                                  value={leaveSettings.maxConsecutiveDays}
                                  onChange={(e) => setLeaveSettings({ ...leaveSettings, maxConsecutiveDays: parseInt(e.target.value) })}
                                />
                                <Form.Text>Prevent excessive long leaves</Form.Text>
                              </Form.Group>
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>
                  </div>
                </Tab>

                {/* Notifications Tab */}
                <Tab
                  eventKey="notifications"
                  title={
                    <span className="d-flex align-items-center gap-2 py-2">
                      <IconBell size={18} />
                      Notifications
                    </span>
                  }
                >
                  <div className="p-4 border-top">
                    <h4 className="fw-bold mb-4">Notification Preferences</h4>
                    <Row>
                      <Col md={8}>
                        <Card className="border bg-light-subtle">
                          <Card.Body>
                            <Form.Group className="mb-4">
                              <Form.Check
                                type="switch"
                                id="email-notifications"
                                label="Enable Email Notifications"
                                checked={notificationSettings.emailNotifications}
                                onChange={(e) =>
                                  setNotificationSettings({
                                    ...notificationSettings,
                                    emailNotifications: e.target.checked,
                                  })
                                }
                              />
                            </Form.Group>

                            <hr className="my-4" />

                            <h5 className="fw-semibold mb-3">Alert Types</h5>
                            <div className="d-flex flex-column gap-3">
                              <Form.Check
                                type="switch"
                                id="late-entry-alert"
                                label="Late Entry Alerts"
                                disabled={!notificationSettings.emailNotifications}
                                checked={notificationSettings.lateEntryAlert}
                                onChange={(e) =>
                                  setNotificationSettings({ ...notificationSettings, lateEntryAlert: e.target.checked })
                                }
                              />
                              <Form.Check
                                type="switch"
                                id="leave-request-alert"
                                label="Leave Request Notifications"
                                disabled={!notificationSettings.emailNotifications}
                                checked={notificationSettings.leaveRequestAlert}
                                onChange={(e) =>
                                  setNotificationSettings({ ...notificationSettings, leaveRequestAlert: e.target.checked })
                                }
                              />
                              <Form.Check
                                type="switch"
                                id="salary-alert"
                                label="Salary Processed Alerts"
                                disabled={!notificationSettings.emailNotifications}
                                checked={notificationSettings.salaryProcessedAlert}
                                onChange={(e) =>
                                  setNotificationSettings({ ...notificationSettings, salaryProcessedAlert: e.target.checked })
                                }
                              />
                              <Form.Check
                                type="switch"
                                id="new-employee-alert"
                                label="New Employee Onboarding Alerts"
                                disabled={!notificationSettings.emailNotifications}
                                checked={notificationSettings.newEmployeeAlert}
                                onChange={(e) =>
                                  setNotificationSettings({ ...notificationSettings, newEmployeeAlert: e.target.checked })
                                }
                              />
                            </div>

                            <hr className="my-4" />

                            <Form.Group className="mb-3">
                              <Form.Check
                                type="switch"
                                id="browser-notifications"
                                label="Enable Browser Notifications"
                                checked={notificationSettings.browserNotifications}
                                onChange={(e) =>
                                  setNotificationSettings({ ...notificationSettings, browserNotifications: e.target.checked })
                                }
                              />
                            </Form.Group>

                            <Form.Group className="mb-3">
                              <Form.Check
                                type="switch"
                                id="weekly-report"
                                label="Send Weekly Attendance Reports"
                                checked={notificationSettings.weeklyReportEnabled}
                                onChange={(e) =>
                                  setNotificationSettings({ ...notificationSettings, weeklyReportEnabled: e.target.checked })
                                }
                              />
                            </Form.Group>
                            {notificationSettings.weeklyReportEnabled && (
                              <Form.Group>
                                <Form.Label>Send Report On</Form.Label>
                                <Form.Select
                                  value={notificationSettings.weeklyReportDay}
                                  onChange={(e) =>
                                    setNotificationSettings({ ...notificationSettings, weeklyReportDay: e.target.value })
                                  }
                                >
                                  <option value="monday">Monday</option>
                                  <option value="tuesday">Tuesday</option>
                                  <option value="sunday">Sunday</option>
                                </Form.Select>
                              </Form.Group>
                            )}
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>
                  </div>
                </Tab>

                {/* Company Settings Tab */}
                <Tab
                  eventKey="company"
                  title={
                    <span className="d-flex align-items-center gap-2 py-2">
                      <IconBuildingBank size={18} />
                      Company
                    </span>
                  }
                >
                  <div className="p-4 border-top">
                    <h4 className="fw-bold mb-4">Company Information</h4>
                    <Row>
                      <Col md={8}>
                        <Card className="border bg-light-subtle">
                          <Card.Body>
                            <Row className="g-3">
                              <Col md={12}>
                                <Form.Group>
                                  <Form.Label>Company Logo</Form.Label>
                                  <div className="d-flex align-items-center">
                                    {(logo.preview || companyLogo) && <img src={(logo.preview || companyLogo) ?? undefined} alt="logo" className="avatar avatar-lg me-3" />}                                    <Form.Control type="file" onChange={handleLogoChange} />
                                    <Button variant="primary" onClick={handleSaveLogo} className="ms-2" disabled={!logo.file}>Save Logo</Button>
                                  </div>
                                </Form.Group>
                              </Col>
                              <Col md={12}>
                                <Form.Group>
                                  <Form.Label>Company Name</Form.Label>
                                  <Form.Control
                                    type="text"
                                    value={companySettings.companyName}
                                    onChange={(e) =>
                                      setCompanySettings({ ...companySettings, companyName: e.target.value })
                                    }
                                  />
                                </Form.Group>
                              </Col>
                              <Col md={12}>
                                <Form.Group>
                                  <Form.Label>Company Address</Form.Label>
                                  <Form.Control
                                    as="textarea"
                                    rows={2}
                                    value={companySettings.companyAddress}
                                    onChange={(e) =>
                                      setCompanySettings({ ...companySettings, companyAddress: e.target.value })
                                    }
                                  />
                                </Form.Group>
                              </Col>
                              <Col md={6}>
                                <Form.Group>
                                  <Form.Label>Company Email</Form.Label>
                                  <Form.Control
                                    type="email"
                                    value={companySettings.companyEmail}
                                    onChange={(e) =>
                                      setCompanySettings({ ...companySettings, companyEmail: e.target.value })
                                    }
                                  />
                                </Form.Group>
                              </Col>
                              <Col md={6}>
                                <Form.Group>
                                  <Form.Label>Company Phone</Form.Label>
                                  <Form.Control
                                    type="tel"
                                    value={companySettings.companyPhone}
                                    onChange={(e) =>
                                      setCompanySettings({ ...companySettings, companyPhone: e.target.value })
                                    }
                                  />
                                </Form.Group>
                              </Col>
                              <Col md={4}>
                                <Form.Group>
                                  <Form.Label>Timezone</Form.Label>
                                  <Form.Select
                                    value={companySettings.timezone}
                                    onChange={(e) =>
                                      setCompanySettings({ ...companySettings, timezone: e.target.value })
                                    }
                                  >
                                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                                    <option value="America/New_York">America/New_York (EST)</option>
                                  </Form.Select>
                                </Form.Group>
                              </Col>
                              <Col md={4}>
                                <Form.Group>
                                  <Form.Label>Currency</Form.Label>
                                  <Form.Select
                                    value={companySettings.currency}
                                    onChange={(e) =>
                                      setCompanySettings({ ...companySettings, currency: e.target.value })
                                    }
                                  >
                                    <option value="INR">Indian Rupee (₹)</option>
                                    <option value="USD">US Dollar ($)</option>
                                  </Form.Select>
                                </Form.Group>
                              </Col>
                              <Col md={4}>
                                <Form.Group>
                                  <Form.Label>Date Format</Form.Label>
                                  <Form.Select
                                    value={companySettings.dateFormat}
                                    onChange={(e) =>
                                      setCompanySettings({ ...companySettings, dateFormat: e.target.value })
                                    }
                                  >
                                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                  </Form.Select>
                                </Form.Group>
                              </Col>
                            </Row>

                            <hr className="my-4" />

                            <h5 className="fw-semibold mb-3">Working Days</h5>
                            <div className="d-flex flex-wrap gap-2">
                              {workingDaysOptions.map((day) => (
                                <Badge
                                  key={day.value}
                                  bg={companySettings.workingDays.includes(day.value) ? "primary" : "secondary"}
                                  className="p-2 cursor-pointer"
                                  style={{ cursor: "pointer" }}
                                  onClick={() => handleWorkingDayToggle(day.value)}
                                >
                                  {day.label}
                                </Badge>
                              ))}
                            </div>
                            <Form.Text className="text-muted mt-2 d-block">
                              Click to toggle working days. Selected days are highlighted.
                            </Form.Text>
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>
                  </div>
                </Tab>

                {/* Security Tab */}
                <Tab
                  eventKey="security"
                  title={
                    <span className="d-flex align-items-center gap-2 py-2">
                      <IconShieldLock size={18} />
                      Security
                    </span>
                  }
                >
                  <div className="p-4 border-top">
                    <h4 className="fw-bold mb-4">Security Settings</h4>
                    <Row>
                      <Col md={8}>
                        <Card className="border bg-light-subtle">
                          <Card.Body>
                            <h5 className="fw-semibold mb-3">Password Policy</h5>
                            <Form.Group className="mb-3">
                              <Form.Label>Minimum Password Length</Form.Label>
                              <Form.Control type="number" min={8} max={32} defaultValue={8} />
                            </Form.Group>
                            <Form.Group className="mb-4">
                              <Form.Check type="switch" id="password-expiry" label="Enable Password Expiry" defaultChecked />
                            </Form.Group>
                            <Form.Group className="mb-4">
                              <Form.Check type="switch" id="two-factor" label="Force Two-Factor Authentication" />
                            </Form.Group>
                            <Form.Group className="mb-4">
                              <Form.Check type="switch" id="session-timeout" label="Enable Session Timeout (30 minutes)" defaultChecked />
                            </Form.Group>
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>
                  </div>
                </Tab>
              </Tabs>
            </Card.Body>
          </Card>

          {/* Action Buttons */}
          <div className="d-flex justify-content-end gap-3 mt-4">
            <Button variant="secondary" onClick={handleResetDefaults} disabled={isSaving}>
              <IconRefresh size={18} className="me-2" />
              Reset to Defaults
            </Button>
            <Button variant="primary" onClick={handleSaveSettings} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Saving...
                </>
              ) : (
                <>
                  <IconDeviceFloppy size={18} className="me-2" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default SettingsPage;