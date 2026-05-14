"use client";
import { Modal, Button, Form } from "react-bootstrap";
import { Holiday } from "./types";

const AddHolidayModal = ({
  show,
  handleClose,
  addHoliday,
}: {
  show: boolean;
  handleClose: () => void;
  addHoliday: (holiday: Holiday) => void;
}) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const newHoliday: Holiday = {
      id: Date.now(),
      name: form.holidayName.value,
      date: form.holidayDate.value,
      day: new Date(form.holidayDate.value).toLocaleDateString("en-US", {
        weekday: "long",
      }),
      type: form.holidayType.value,
    };
    addHoliday(newHoliday);
    handleClose();
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Add Holiday</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3" controlId="holidayName">
            <Form.Label>Holiday Name</Form.Label>
            <Form.Control type="text" placeholder="Enter holiday name" />
          </Form.Group>
          <Form.Group className="mb-3" controlId="holidayDate">
            <Form.Label>Date</Form.Label>
            <Form.Control type="date" />
          </Form.Group>
          <Form.Group className="mb-3" controlId="holidayType">
            <Form.Label>Type</Form.Label>
            <Form.Select>
              <option>Public Holiday</option>
              <option>National Holiday</option>
              <option>Festival</option>
              <option>Optional Holiday</option>
            </Form.Select>
          </Form.Group>
          <Button variant="primary" type="submit">
            Add Holiday
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default AddHolidayModal;