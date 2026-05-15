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
      <DasherBreadcrumb />
      <AddEmployeeWizard />
    </Fragment>
  );
};

export default AddEmployeePage;
