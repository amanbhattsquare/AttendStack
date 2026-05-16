"use client";
import { useState } from 'react';
import { Container, Row, Col, Card, Button, Table, Modal } from 'react-bootstrap';
import Link from 'next/link';
import { Eye, PencilSquare, Trash } from 'react-bootstrap-icons';

// Mock data for existing organizations
const initialOrganizations = [
  { id: 1, name: 'Bhatt Square', industry: 'Technology', adminEmail: 'admin@bhattsquare.com', active: true, createdAt: '2026-05-16' },
  { id: 2, name: 'Another Org', industry: 'Healthcare', adminEmail: 'contact@another.org', active: false, createdAt: '2026-05-15' },
  { id: 3, name: 'Edu Foundation', industry: 'Education', adminEmail: 'info@edu.org', active: true, createdAt: '2026-05-14' },
];

const OrganizationsPage = () => {
  const [organizations, setOrganizations] = useState(initialOrganizations);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<any>(null);

  const handleDeleteClick = (org: any) => {
    setSelectedOrg(org);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    setOrganizations(organizations.filter(o => o.id !== selectedOrg.id));
    setShowDeleteModal(false);
    setSelectedOrg(null);
  };

  const handleViewClick = (org: any) => {
    setSelectedOrg(org);
    setShowViewModal(true);
  };

  return (
    <>
      <Container fluid>
        <Row className="mb-4 align-items-center">
          <Col>
            <h1 className="mb-0">Organizations</h1>
            <p className="mb-0">View and manage your organizations.</p>
          </Col>
          <Col xs="auto">
            <Link href="/admin/organizations/add" passHref>
              <Button variant="primary">Add New Organization</Button>
            </Link>
          </Col>
        </Row>
        <Row>
          <Col xs={12}>
            <Card>
              <Card.Body>
                <Card.Title>Existing Organizations</Card.Title>
                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Active</th>
                      <th>Created At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {organizations.map((org) => (
                      <tr key={org.id}>
                        <td>{org.id}</td>
                        <td>{org.name}</td>
                        <td>{org.active ? 'Yes' : 'No'}</td>
                        <td>{org.createdAt}</td>
                        <td>
                          <Button variant="outline-info" size="sm" className="me-2" onClick={() => handleViewClick(org)}>
                            <Eye />
                          </Button>
                          <Link href={`/admin/organizations/edit/${org.id}`} passHref>
                            <Button variant="outline-secondary" size="sm" className="me-2">
                              <PencilSquare />
                            </Button>
                          </Link>
                          <Button variant="outline-danger" size="sm" onClick={() => handleDeleteClick(org)}>
                            <Trash />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* View Organization Modal */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Organization Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedOrg && (
            <div>
              <p><strong>ID:</strong> {selectedOrg.id}</p>
              <p><strong>Name:</strong> {selectedOrg.name}</p>
              <p><strong>Industry:</strong> {selectedOrg.industry}</p>
              <p><strong>Admin Email:</strong> {selectedOrg.adminEmail}</p>
              <p><strong>Status:</strong> {selectedOrg.active ? 'Active' : 'Inactive'}</p>
              <p><strong>Created At:</strong> {selectedOrg.createdAt}</p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowViewModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Deletion</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete the organization "<strong>{selectedOrg?.name}</strong>"? This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default OrganizationsPage;