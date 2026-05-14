"use client";
import { Holiday } from "./types";
import { IconBeach, IconPencil, IconTrash } from "@tabler/icons-react";
import { Tooltip, OverlayTrigger } from "react-bootstrap";
import { flexRender, Row } from "@tanstack/react-table";

const HolidayRow = ({
  row,
  handleDelete,
  handleEdit,
}: {
  row: Row<Holiday>;
  handleDelete: (id: number) => void;
  handleEdit: (holiday: Holiday) => void;
}) => {
  return (
    <tr>
      {row.getVisibleCells().map((cell) => (
        <td key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
      <td className="d-flex gap-2">
        <OverlayTrigger
          placement="top"
          overlay={<Tooltip id="tooltip-edit">Edit</Tooltip>}
        >
          <button
            className="btn btn-primary btn-sm"
            onClick={() => handleEdit(row.original)}
          >
            <IconPencil size={16} />
          </button>
        </OverlayTrigger>
        <OverlayTrigger
          placement="top"
          overlay={<Tooltip id="tooltip-delete">Delete</Tooltip>}
        >
          <button
            className="btn btn-danger btn-sm"
            onClick={() => handleDelete(row.original.id)}
          >
            <IconTrash size={16} />
          </button>
        </OverlayTrigger>
      </td>
    </tr>
  );
};

export default HolidayRow;