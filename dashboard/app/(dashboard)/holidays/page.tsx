"use client";
import { Fragment, useState } from "react";
import { IconPlus } from "@tabler/icons-react";
import HolidayRow from "./HolidayRow";
import { holidays as initialHolidays } from "./data";
import { Holiday } from "./types";
import AddHolidayModal from "./AddHolidayModal";
import EditHolidayModal from "./EditHolidayModal";
import { useHolidays } from "./useHolidays";
import { flexRender } from "@tanstack/react-table";
import Pagination from "./Pagination";

const HolidaysPage = () => {
  const [holidays, setHolidays] = useState<Holiday[]>(initialHolidays);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);

  const { table } = useHolidays(holidays);

  const handleShowAddModal = () => setShowAddModal(true);
  const handleCloseAddModal = () => setShowAddModal(false);

  const handleShowEditModal = (holiday: Holiday) => {
    setSelectedHoliday(holiday);
    setShowEditModal(true);
  };
  const handleCloseEditModal = () => {
    setSelectedHoliday(null);
    setShowEditModal(false);
  };

  const addHoliday = (holiday: Holiday) => {
    setHolidays([...holidays, holiday]);
  };

  const updateHoliday = (updatedHoliday: Holiday) => {
    setHolidays(
      holidays.map((holiday) =>
        holiday.id === updatedHoliday.id ? updatedHoliday : holiday
      )
    );
  };

  const handleDelete = (id: number) => {
    setHolidays(holidays.filter((holiday) => holiday.id !== id));
  };

  return (
    <Fragment>
      <div className="mb-6 d-flex align-items-center justify-content-between">
        <div>
          <h2 className="mb-0 fw-bold">Company Holidays</h2>
          <p className="text-secondary mb-0">
            Manage and view all upcoming company holidays and events.
          </p>
        </div>
        <button
          className="btn btn-primary d-flex align-items-center gap-2"
          onClick={handleShowAddModal}
        >
          <IconPlus size={18} /> Add Holiday
        </button>
      </div>

      <div className="card border-0 shadow-sm mb-6">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table align-middle table-hover text-nowrap">
              <thead className="table-light">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <HolidayRow
                    key={row.id}
                    row={row}
                    handleDelete={handleDelete}
                    handleEdit={handleShowEditModal}
                  />
                ))}
              </tbody>
            </table>
            <Pagination
              totalPages={table.getPageCount()}
              currentPage={table.getState().pagination.pageIndex + 1}
              onPageChange={(page) => table.setPageIndex(page - 1)}
            />
          </div>
        </div>
      </div>
      <AddHolidayModal
        show={showAddModal}
        handleClose={handleCloseAddModal}
        addHoliday={addHoliday}
      />
      <EditHolidayModal
        show={showEditModal}
        handleClose={handleCloseEditModal}
        holiday={selectedHoliday}
        updateHoliday={updateHoliday}
      />
    </Fragment>
  );
};

export default HolidaysPage;