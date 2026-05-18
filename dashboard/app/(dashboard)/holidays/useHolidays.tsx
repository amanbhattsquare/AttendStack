"use client";
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useState } from "react";

export const useHolidays = (data: any, isAdmin: boolean) => {
  const [sorting, setSorting] = useState<any>([]);
  const [columnFilters, setColumnFilters] = useState<any>([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const columns = [
    {
      accessorKey: "id",
      header: "Sr. No.",
      cell: (props: any) => <span>{props.row.index + 1}</span>,
    },
    {
      accessorKey: "name",
      header: "Holiday Name",
    },
    {
      accessorKey: "date",
      header: "Date",
      cell: (props: any) => {
        const val = props.getValue();
        return <span>{new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(val))}</span>;
      },
    },
    {
      accessorKey: "day",
      header: "Day",
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: (props: any) => {
        const type = props.getValue();
        let bg = "secondary";
        if (type === "Public Holiday") bg = "primary";
        else if (type === "National Holiday") bg = "success";
        else if (type === "Festival") bg = "warning";
        return <span className={`badge bg-${bg}`}>{type}</span>;
      },
    },
  ];

  if (isAdmin) {
    columns.push({
      accessorKey: "action",
      header: "Action",
    });
  }

  const table = useReactTable({
    data,
    columns,
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