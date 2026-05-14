import { Fragment } from "react";
import { Metadata } from "next";
import DasherBreadcrumb from "../../../../components/common/DasherBreadcrumb";
import EmployeeProfileClient from "../components/EmployeeProfileClient";

// Required for static export with dynamic routes.
// This tells Next.js which employee pages to pre-build.
export async function generateStaticParams() {
  // In a real app, you would fetch all employee UUIDs from your database.
  // For now, we'll just pre-build the profiles for our dummy data.
  return [
    { employeeId: 'd2a6c9c8-3a75-4d89-9a15-3f57a9f7b2e1' },
    { employeeId: 'f8b8e3c8-6d54-4f8b-8e3c-8d54f8b8e3c8' },
  ];
}

// This is a placeholder for fetching real employee data based on the ID
const getEmployeeData = async (employeeId: string) => {
  console.log(`Fetching data for employee: ${employeeId}`);
  // In a real app, you would fetch this from your database or API
  return {
    id: employeeId,
    fullName: "Jane Doe",
    designation: "Lead Software Engineer",
    avatar: "/images/avatar/avatar-1.jpg",
    personalInfo: {
      email: "jane.doe@example.com",
      phone: "123-456-7890",
      gender: "Female",
      dob: "1988-05-21",
      address: "456 Park Ave, Anytown, USA",
    },
    employmentDetails: {
      employeeId: "EMP002",
      joiningDate: "2020-02-10",
      department: "Engineering",
      employmentType: "Full-time",
      reportingManager: "John Smith",
    },
    // ... other data sections
  };
};

export const metadata: Metadata = {
  title: "Employee Profile | HR Management",
};

interface EmployeeProfilePageProps {
  params: {
    employeeId: string;
  };
}

const EmployeeProfilePage = async ({ params }: EmployeeProfilePageProps) => {
  const { employeeId } = params;
  const employeeData = await getEmployeeData(employeeId);

  return (
    <Fragment>
      <DasherBreadcrumb
        title={employeeData.fullName}
        subtext={`Details for employee ID: ${employeeData.employmentDetails.employeeId}`}
        items={[
          { label: "Dashboard", link: "/" },
          { label: "Employees", link: "/employees" },
          { label: "Profile", link: "#" },
        ]}
      />
      {/* The client component will handle the interactive parts like tabs */}
      <EmployeeProfileClient employee={employeeData} />
    </Fragment>
  );
};

export default EmployeeProfilePage;