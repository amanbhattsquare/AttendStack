"use client";
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useState } from "react";

export const useHolidays = (data: any) => {
  const [sorting, setSorting] = useState<any>([]);
  const [columnFilters, setColumnFilters] = useState<any>([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const table = useReactTable({
    data,
    columns: [
      {
        accessorKey: "id",
        header: "Sr. No.",
        cell: (props) => <span>{props.row.index + 1}</span>,
      },
      {
        accessorKey: "name",
        header: "Holiday Name",
      },
      {
        accessorKey: "date",
        header: "Date",
      },
      {
        accessorKey: "day",
        header: "Day",
      },
      {
        accessorKey: "type",
        header: "Type",
      },
      {
        accessorKey: "action",
        header: "Action",
      },
    ],
    state: {
      sorting,
      columnFilters,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return { table };
};