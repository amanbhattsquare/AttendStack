"use client";
import { Modal, Button, Form } from "react-bootstrap";
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
  updateHoliday: (holiday: Holiday) => void;
}) => {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState<Holiday["type"]>("Public Holiday");

  useEffect(() => {
    if (holiday) {
      setName(holiday.name);
      setDate(holiday.date);
      setType(holiday.type);
    }
  }, [holiday]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (holiday) {
      const updatedHoliday: Holiday = {
        ...holiday,
        name,
        date,
        day: new Date(date).toLocaleDateString("en-US", {
          weekday: "long",
        }),
        type,
      };
      updateHoliday(updatedHoliday);
      handleClose();
    }
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Edit Holiday</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3" controlId="holidayName">
            <Form.Label>Holiday Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter holiday name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="holidayDate">
            <Form.Label>Date</Form.Label>
            <Form.Control
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="holidayType">
            <Form.Label>Type</Form.Label>
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
          <Button variant="primary" type="submit">
            Update Holiday
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default EditHolidayModal;