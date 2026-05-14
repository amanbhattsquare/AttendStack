import { Fragment } from "react";
import { Metadata } from "next";
import EmployeePageClient from "./components/EmployeePageClient";

export const metadata: Metadata = {
  title: "Employees | HR Management",
};

const EmployeesPage = () => {
  return (
    <Fragment>
      <EmployeePageClient />
    </Fragment>
  );
};

export default EmployeesPage;