"use client";
import { Modal, Button, Form, Spinner } from "react-bootstrap";
import { Holiday } from "./types";
import { useEffect, useState } from "react";

const EditHolidayModal = ({
  show,
  handleClose,
  holiday,
  updateHoliday,
}: {
  show: boolean;
  handleClose: () => void;
  holiday: Holiday | null;
  updateHoliday: (holiday: Holiday) => Promise<void>;
}) => {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState<Holiday["type"]>("Public Holiday");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (holiday) {
      setName(holiday.name);
      setDate(holiday.date);
      setType(holiday.type);
    }
  }, [holiday]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (holiday) {
      setSubmitting(true);
      try {
        const updatedHoliday: Holiday = {
          ...holiday,
          name,
          date,
          day: new Date(date).toLocaleDateString("en-US", {
            weekday: "long",
          }),
          type,
        };
        await updateHoliday(updatedHoliday);
        handleClose();
      } catch (err) {
        console.error(err);
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title className="fw-bold">Edit Company Holiday</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3" controlId="holidayName">
            <Form.Label className="fw-semibold">Holiday Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter holiday name"
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
              onChange={(e) => setType(e.target.value as Holiday["type"])}
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
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default EditHolidayModal;