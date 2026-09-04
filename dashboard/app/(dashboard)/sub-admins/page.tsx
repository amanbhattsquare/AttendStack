"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Dropdown,
  Form,
  InputGroup,
  Row,
  Table,
} from "react-bootstrap";
import {
  IconShieldLock,
  IconPlus,
  IconSearch,
  IconRefresh,
  IconMail,
  IconUser,
  IconKey,
  IconDotsVertical,
  IconEdit,
  IconTrash,
  IconCheck,
  IconAlertTriangle,
  IconUsers,
  IconBuildingSkyscraper,
  IconUserPlus,
} from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import apiClient from "app/services/api";
import DasherBreadcrumb from "components/common/DasherBreadcrumb";

interface ActionToggleProps {
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

const ActionToggle = React.forwardRef<HTMLButtonElement, ActionToggleProps>(
  ({ children, onClick }, ref) => (
    <button
      ref={ref}
      onClick={(e) => {
        e.preventDefault();
        onClick?.(e);
      }}
      className="btn btn-light btn-sm p-1 border shadow-xs d-inline-flex align-items-center justify-content-center text-secondary"
      style={{ width: 32, height: 32 }}
      aria-label="Actions"
    >
      {children}
    </button>
  )
);
ActionToggle.displayName = "ActionToggle";

type ModulePermission = {
  view: boolean;
  edit: boolean;
  delete: boolean;
};

type PermissionsMap = {
  [module: string]: ModulePermission;
};

type SubAdminRecord = {
  id: string;
  user_id?: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  is_active: boolean;
  organization: number;
  organization_name: string;
  custom_role_title: string;
  permissions: PermissionsMap;
  created_at: string;
  updated_at: string;
};

export default function SubAdminsManagementPage() {
  const router = useRouter();

  const [subAdmins, setSubAdmins] = useState<SubAdminRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchSubAdmins = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiClient.get("/api/v1/accounts/sub-admins/");
      setSubAdmins(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch {
      setError("Failed to load sub-admin records. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubAdmins();
  }, [fetchSubAdmins]);

  const filteredSubAdmins = useMemo(() => {
    return subAdmins.filter((sa) => {
      const q = searchQuery.toLowerCase();
      return (
        sa.full_name?.toLowerCase().includes(q) ||
        sa.email?.toLowerCase().includes(q) ||
        sa.custom_role_title?.toLowerCase().includes(q)
      );
    });
  }, [subAdmins, searchQuery]);

  // Reset Password for Sub-Admin
  const handleResetPassword = async (subAdmin: SubAdminRecord) => {
    if (!confirm(`Generate a new temporary password for ${subAdmin.email}?`)) return;

    try {
      const res = await apiClient.post(`/api/v1/accounts/sub-admins/${subAdmin.id}/reset-password/`);
      const newPass = res.data.temp_password;
      alert(`New Temporary Password for ${subAdmin.email}:\n\n${newPass}\n\nPlease share this password with the manager.`);
    } catch {
      alert("Failed to reset password. Please try again.");
    }
  };

  // Delete / Deactivate Sub-Admin
  const handleDeleteSubAdmin = async (subAdmin: SubAdminRecord) => {
    if (!confirm(`Are you sure you want to revoke access and remove ${subAdmin.email}?`)) return;

    try {
      await apiClient.delete(`/api/v1/accounts/sub-admins/${subAdmin.id}/`);
      setNotice(`Sub-admin access removed for ${subAdmin.email}.`);
      fetchSubAdmins();
    } catch {
      setError("Failed to remove sub-admin.");
    }
  };

  return (
    <Container fluid className="py-3 px-lg-4 sub-admins-page">
      {/* Breadcrumb */}
      <DasherBreadcrumb
        items={[
          { label: "Roles & Sub-Admins" },
        ]}
      />

      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4 pb-3 border-bottom">
        <div className="d-flex align-items-start gap-3">
          <div className="p-2.5 rounded-3 bg-primary-subtle text-primary d-flex align-items-center justify-content-center shadow-xs flex-shrink-0" style={{ width: 44, height: 44 }}>
            <IconShieldLock size={24} />
          </div>
          <div>
            <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
              <h2 className="h4 mb-0 fw-bold text-dark">Roles & Sub-Administrators</h2>
              <Badge bg="primary-subtle" text="primary" className="px-2.5 py-1 rounded-pill fw-semibold" style={{ fontSize: "11px", letterSpacing: "0.02em" }}>
                RBAC Access Control
              </Badge>
            </div>
            <p className="text-secondary mb-0 small">
              Create sub-admin managers (HR, Attendance Lead, Payroll Officer) and customize granular module access (View, Edit, Delete).
            </p>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2 flex-shrink-0">
          <Button variant="outline-secondary" size="sm" onClick={fetchSubAdmins} disabled={loading} className="d-inline-flex align-items-center gap-1.5 px-3 py-2 fw-medium shadow-xs">
            <IconRefresh size={16} className={loading ? "spin" : ""} />
            <span>Refresh</span>
          </Button>
          <Link
            href="/sub-admins/create"
            className="btn btn-primary btn-sm d-inline-flex align-items-center gap-1.5 px-3.5 py-2 fw-semibold shadow-sm text-nowrap"
          >
            <IconPlus size={16} />
            <span>Onboard Sub-Admin</span>
          </Link>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError("")} className="border-0 shadow-sm d-flex align-items-center gap-2 mb-3">
          <IconAlertTriangle size={20} />
          {error}
        </Alert>
      )}
      {notice && (
        <Alert variant="success" dismissible onClose={() => setNotice("")} className="border-0 shadow-sm d-flex align-items-center gap-2 mb-3">
          <IconCheck size={20} />
          {notice}
        </Alert>
      )}

      {/* Overview Cards */}
      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="p-3 d-flex align-items-center gap-3">
              <div className="p-2.5 rounded-3 bg-primary-subtle text-primary">
                <IconShieldLock size={26} />
              </div>
              <div>
                <span className="text-secondary small d-block">Configured Sub-Admins</span>
                <span className="h4 fw-bold text-dark mb-0">{subAdmins.length}</span>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="p-3 d-flex align-items-center gap-3">
              <div className="p-2.5 rounded-3 bg-success-subtle text-success">
                <IconUser size={26} />
              </div>
              <div>
                <span className="text-secondary small d-block">Active Accounts</span>
                <span className="h4 fw-bold text-dark mb-0">
                  {subAdmins.filter((s) => s.is_active).length}
                </span>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="p-3 d-flex align-items-center gap-3">
              <div className="p-2.5 rounded-3 bg-info-subtle text-info">
                <IconUsers size={26} />
              </div>
              <div>
                <span className="text-secondary small d-block">Custom Role Titles</span>
                <span className="h4 fw-bold text-dark mb-0">
                  {new Set(subAdmins.map((s) => s.custom_role_title).filter(Boolean)).size}
                </span>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="p-3 d-flex align-items-center gap-3">
              <div className="p-2.5 rounded-3 bg-warning-subtle text-warning">
                <IconBuildingSkyscraper size={26} />
              </div>
              <div>
                <span className="text-secondary small d-block">Workspace Scope</span>
                <span className="h5 fw-bold text-dark mb-0 text-truncate" style={{ maxWidth: 160 }}>
                  {subAdmins[0]?.organization_name || "Active Workspace"}
                </span>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Directory Table Card */}
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-white border-bottom py-3 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div className="d-flex align-items-center gap-2">
            <h5 className="mb-0 fw-bold text-dark">Sub-Administrators Directory</h5>
            <Badge bg="secondary" pill className="font-monospace">
              {filteredSubAdmins.length}
            </Badge>
          </div>

          <div className="d-flex align-items-center gap-2 w-100 w-md-auto" style={{ maxWidth: 360 }}>
            <InputGroup size="sm" className="shadow-xs">
              <InputGroup.Text className="bg-light border-end-0">
                <IconSearch size={16} className="text-secondary" />
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Search by name, email, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-light border-start-0 ps-0"
              />
            </InputGroup>
          </div>
        </Card.Header>

        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary spinner-border-sm me-2" role="status" />
              <span className="text-secondary">Loading sub-administrators directory...</span>
            </div>
          ) : filteredSubAdmins.length === 0 ? (
            <div className="text-center py-5 px-3">
              <div className="p-3 bg-light rounded-circle d-inline-flex mb-3 text-secondary">
                <IconShieldLock size={36} />
              </div>
              <h5 className="fw-bold text-dark">No Sub-Administrators Configured</h5>
              <p className="text-secondary small mb-3" style={{ maxWidth: 450, margin: "0 auto" }}>
                Delegate operational duties to HR executives, attendance managers, or payroll leads with strictly bounded privileges.
              </p>
              <Link href="/sub-admins/create" className="btn btn-primary btn-sm px-3 shadow-xs">
                <IconPlus size={16} className="me-1" /> Onboard First Sub-Admin
              </Link>
            </div>
          ) : (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="bg-light small text-secondary">
                <tr>
                  <th className="ps-4 py-3">Administrator</th>
                  <th className="py-3">Contact Email</th>
                  <th className="py-3">Assigned Role Title</th>
                  <th className="py-3">Authorized Modules</th>
                  <th className="py-3">Account Status</th>
                  <th className="text-end pe-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubAdmins.map((subAdmin) => {
                  const allowedModules = Object.keys(subAdmin.permissions || {}).filter(
                    (key) => subAdmin.permissions[key]?.view
                  );

                  return (
                    <tr key={subAdmin.id}>
                      <td className="ps-4">
                        <div className="d-flex align-items-center gap-2.5">
                          <div className="rounded-circle bg-primary-subtle text-primary fw-bold d-flex align-items-center justify-content-center" style={{ width: 38, height: 38 }}>
                            <IconUser size={20} />
                          </div>
                          <div>
                            <strong className="text-dark d-block fs-6">{subAdmin.full_name || subAdmin.email.split("@")[0]}</strong>
                            <span className="text-secondary small">{subAdmin.organization_name}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="text-dark d-flex align-items-center gap-1.5 small fw-medium">
                          <IconMail size={14} className="text-secondary" /> {subAdmin.email}
                        </span>
                        {subAdmin.phone && (
                          <span className="text-secondary small d-block font-monospace mt-0.5">
                            {subAdmin.phone}
                          </span>
                        )}
                      </td>
                      <td>
                        <Badge bg="primary-subtle" text="primary" className="border border-primary-subtle px-2.5 py-1 font-monospace">
                          {subAdmin.custom_role_title || "HR Manager"}
                        </Badge>
                      </td>
                      <td>
                        <div className="d-flex flex-wrap gap-1" style={{ maxWidth: 320 }}>
                          {allowedModules.length === 0 ? (
                            <span className="text-muted small italic">No active modules</span>
                          ) : (
                            allowedModules.slice(0, 4).map((modKey) => {
                              const p = subAdmin.permissions[modKey];
                              const tag = p?.delete ? "V+E+D" : p?.edit ? "V+E" : "View";
                              return (
                                <Badge key={modKey} bg="light" text="dark" className="border shadow-xs px-2 py-1 font-monospace small">
                                  {modKey.toUpperCase()} <span className="text-primary font-monospace fw-bold">({tag})</span>
                                </Badge>
                              );
                            })
                          )}
                          {allowedModules.length > 4 && (
                            <Badge bg="secondary-subtle" text="secondary" className="px-2 py-1">
                              +{allowedModules.length - 4} more
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td>
                        {subAdmin.is_active ? (
                          <Badge bg="success-subtle" text="success" className="border border-success-subtle px-2.5 py-1">
                            Active
                          </Badge>
                        ) : (
                          <Badge bg="secondary-subtle" text="secondary" className="px-2.5 py-1">
                            Suspended
                          </Badge>
                        )}
                      </td>
                      <td className="text-end pe-4">
                        <Dropdown align="end">
                          <Dropdown.Toggle as={ActionToggle}>
                            <IconDotsVertical size={16} />
                          </Dropdown.Toggle>
                          <Dropdown.Menu className="shadow border-0">
                            <Dropdown.Item onClick={() => router.push(`/sub-admins/${subAdmin.id}/edit`)}>
                              <IconEdit size={15} className="me-2 text-primary" /> Edit Permissions
                            </Dropdown.Item>
                            <Dropdown.Item onClick={() => handleResetPassword(subAdmin)}>
                              <IconKey size={15} className="me-2 text-warning" /> Reset Password
                            </Dropdown.Item>
                            <Dropdown.Divider />
                            <Dropdown.Item onClick={() => handleDeleteSubAdmin(subAdmin)} className="text-danger">
                              <IconTrash size={15} className="me-2 text-danger" /> Revoke Access
                            </Dropdown.Item>
                          </Dropdown.Menu>
                        </Dropdown>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}
