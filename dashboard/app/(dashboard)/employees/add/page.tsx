import { Fragment } from "react";
import { Metadata } from "next";
import AddEmployeeWizard from "../components/AddEmployeeWizard";
import DasherBreadcrumb from "../../../../components/common/DasherBreadcrumb";

export const metadata: Metadata = {
  title: "Add New Employee | HR Management",
};

const AddEmployeePage = () => {
  return (
    <Fragment>
        <DasherBreadcrumb
        title="Add New Employee"
        subtext="Follow the steps to add a new employee to your workforce."
        items={[
          { label: "Dashboard", link: "/" },
          { label: "Employees", link: "/employees" },
          { label: "Add New Employee", link: "/employees/add" },
        ]}
      />
      <AddEmployeeWizard />
    </Fragment>
  );
};

export default AddEmployeePage;