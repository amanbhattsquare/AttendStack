
"use client";

import React from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = momentLocalizer(moment);

const eventStyleGetter = (event) => {
  let backgroundColor = "#808080"; // Default grey
  switch (event.resource.status) {
    case "PRESENT":
      backgroundColor = "#28a745"; // Green
      break;
    case "LATE":
      backgroundColor = "#ffc107"; // Yellow
      break;
    case "HALF_DAY":
      backgroundColor = "#17a2b8"; // Blue
      break;
    case "ABSENT":
      backgroundColor = "#dc3545"; // Red
      break;
    case "ON_LEAVE":
      backgroundColor = "#6c757d"; // Grey
      break;
  }
  return {
    style: {
      backgroundColor,
      borderRadius: "5px",
      opacity: 0.8,
      color: "white",
      border: "0px",
      display: "block",
    },
  };
};

const AttendanceCalendar = ({ events, onSelectEvent }) => {
  return (
    <div>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 500 }}
        eventPropGetter={eventStyleGetter}
        onSelectEvent={onSelectEvent}
      />
    </div>
  );
};

export default AttendanceCalendar;