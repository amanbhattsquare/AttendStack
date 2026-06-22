"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, Badge, Button, Card, Col, Container, Row, Spinner, Table } from "react-bootstrap";
import { IconCopy, IconRefresh, IconUsersGroup } from "@tabler/icons-react";
import apiClient from "app/services/api";

type Organization = {
  id: number;
  name: string;
  invite_code: string;
  owner_name: string | null;
  is_active: boolean;
  created_at: string;
};

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadOrganizations = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiClient.get("/api/v1/organizations/");
      setOrganizations(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch {
      setError("We could not load your organization workspace. Please refresh and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOrganizations(); }, [loadOrganizations]);

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setNotice("Organization code copied. Share it only with employees who should join this workspace.");
  };

  const regenerateCode = async (organization: Organization) => {
    if (!window.confirm(`Generate a new code for ${organization.name}? The previous code will stop working.`)) return;
    setBusyId(organization.id);
    setError("");
    try {
      const response = await apiClient.post(`/api/v1/organizations/${organization.id}/regenerate-invite-code/`);
      setOrganizations((current) => current.map((item) => item.id === organization.id ? response.data : item));
      setNotice("A new organization code has been generated. The old code is no longer valid.");
    } catch {
      setError("Only the organization owner can regenerate this code.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Container fluid>
      <Row className="mb-4 align-items-center"><Col><div className="d-flex align-items-center gap-2"><IconUsersGroup className="text-primary" size={28} /><div><h1 className="h3 mb-1">Organization access</h1><p className="text-secondary mb-0">Use the code below to invite employees into the correct workspace.</p></div></div></Col><Col xs="auto"><Button variant="outline-primary" onClick={loadOrganizations} disabled={loading}><IconRefresh size={17} className="me-1" />Refresh</Button></Col></Row>
      {error && <Alert variant="danger">{error}</Alert>}
      {notice && <Alert variant="success" dismissible onClose={() => setNotice("")}>{notice}</Alert>}
      <Card className="border-0 shadow-sm"><Card.Body className="p-0">
        {loading ? <div className="text-center py-5"><Spinner /><p className="text-secondary mb-0 mt-2">Loading organization access…</p></div> : organizations.length === 0 ? <div className="text-center py-5"><h2 className="h5">No organization workspace found</h2><p className="text-secondary mb-0">Create one from the public setup page to start inviting employees.</p></div> : <Table responsive hover className="align-middle mb-0"><thead><tr><th className="ps-4">Organization</th><th>Employee onboarding code</th><th>Status</th><th>Created</th><th className="text-end pe-4">Actions</th></tr></thead><tbody>{organizations.map((organization) => <tr key={organization.id}><td className="ps-4"><strong>{organization.name}</strong>{organization.owner_name && <small className="d-block text-secondary">Owner: {organization.owner_name}</small>}</td><td><code className="fw-bold text-primary">{organization.invite_code}</code></td><td><Badge bg={organization.is_active ? "success" : "secondary"}>{organization.is_active ? "Active" : "Inactive"}</Badge></td><td>{new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(organization.created_at))}</td><td className="text-end pe-4"><Button size="sm" variant="outline-primary" className="me-2" onClick={() => copyCode(organization.invite_code)}><IconCopy size={15} className="me-1" />Copy</Button><Button size="sm" variant="outline-secondary" disabled={busyId === organization.id} onClick={() => regenerateCode(organization)}>{busyId === organization.id ? <Spinner size="sm" /> : <><IconRefresh size={15} className="me-1" />New code</>}</Button></td></tr>)}</tbody></Table>}
      </Card.Body></Card>
    </Container>
  );
}
