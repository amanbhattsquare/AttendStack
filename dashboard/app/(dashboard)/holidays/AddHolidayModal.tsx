"use client";
import { useState } from "react";
import { Modal, Button, Form, Spinner } from "react-bootstrap";

const AddHolidayModal = ({
  show,
  handleClose,
  addHoliday,
}: {
  show: boolean;
  handleClose: () => void;
  addHoliday: (holiday: { name: string; date: string; type: string }) => Promise<void>;
}) => {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState("Public Holiday");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name || !date) return;
    setSubmitting(true);
    try {
      await addHoliday({ name, date, type });
      setName("");
      setDate("");
      setType("Public Holiday");
      handleClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title className="fw-bold">Add Company Holiday</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3" controlId="holidayName">
            <Form.Label className="fw-semibold">Holiday Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="e.g. Independence Day, Diwali"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="holidayDate">
            <Form.Label className="fw-semibold">Date</Form.Label>
            <Form.Control
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="holidayType">
            <Form.Label className="fw-semibold">Type</Form.Label>
            <Form.Select
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option>Public Holiday</option>
              <option>National Holiday</option>
              <option>Festival</option>
              <option>Optional Holiday</option>
            </Form.Select>
          </Form.Group>
          <div className="d-flex justify-content-end gap-2 mt-4">
            <Button variant="outline-secondary" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Spinner as="span" animation="border" size="sm" className="me-2" />
                  Adding...
                </>
              ) : (
                "Add Holiday"
              )}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default AddHolidayModal;