"use client";

// A helper component to display a single piece of information in a two-column layout
const ReviewItem = ({ label, value }: { label: string; value: string | undefined }) => (
  <div className="row py-2">
    <div className="col-sm-5 text-muted">{label}</div>
    <div className="col-sm-7">
      <span className="fw-bold">{value || "Not Provided"}</span>
    </div>
  </div>
);

const Step4_ReviewAndSubmit = () => {
  // NOTE: This is dummy data. In a real app, this would come from a shared state.
  const formData = {
    personalInfo: {
      fullName: "John Doe",
      email: "john.doe@example.com",
      phone: "123-456-7890",
      gender: "Male",
      dob: "1990-01-01",
      aadhaar: "1234 5678 9012",
      address: "123 Main St, Anytown, USA",
      emergencyContactName: "Jane Doe",
      emergencyContactRelationship: "Spouse",
      emergencyContactPhone: "098-765-4321",
    },
    employmentDetails: {
      employeeId: "EMP001",
      joiningDate: "2023-01-15",
      department: "Engineering",
      designation: "Software Developer",
      employmentType: "Full-time",
      reportingManager: "Jane Smith",
    },
    salaryAndBank: {
      annualSalary: "1200000",
      payFrequency: "Monthly",
      bankName: "Global Bank",
      accountNumber: "************1234",
      taxId: "ABCDE1234F",
    },
  };

  return (
    <div>
      <h4 className="mb-4 text-center">Review Your Information</h4>
      <div className="card">
        <div className="card-body p-4">
          {/* Personal Information Section */}
          <h5 className="mb-3">Personal Information</h5>
          <ReviewItem label="Full Name" value={formData.personalInfo.fullName} />
          <ReviewItem label="Email Address" value={formData.personalInfo.email} />
          <ReviewItem label="Phone Number" value={formData.personalInfo.phone} />
          <ReviewItem label="Date of Birth" value={formData.personalInfo.dob} />
          <ReviewItem label="Aadhaar Number" value={formData.personalInfo.aadhaar} />
          <ReviewItem label="Address" value={formData.personalInfo.address} />
          
          <hr className="my-4" />

          {/* Emergency Contact Section */}
          <h5 className="mb-3">Emergency Contact</h5>
          <ReviewItem label="Contact Name" value={formData.personalInfo.emergencyContactName} />
          <ReviewItem label="Relationship" value={formData.personalInfo.emergencyContactRelationship} />
          <ReviewItem label="Contact Phone" value={formData.personalInfo.emergencyContactPhone} />

          <hr className="my-4" />

          {/* Employment Details Section */}
          <h5 className="mb-3">Employment Details</h5>
          <ReviewItem label="Employee ID" value={formData.employmentDetails.employeeId} />
          <ReviewItem label="Joining Date" value={formData.employmentDetails.joiningDate} />
          <ReviewItem label="Department" value={formData.employmentDetails.department} />
          <ReviewItem label="Designation" value={formData.employmentDetails.designation} />
          <ReviewItem label="Employment Type" value={formData.employmentDetails.employmentType} />
          <ReviewItem label="Reporting Manager" value={formData.employmentDetails.reportingManager} />

          <hr className="my-4" />

          {/* Salary & Bank Details Section */}
          <h5 className="mb-3">Salary & Bank Details</h5>
          <ReviewItem label="Annual Salary" value={`₹${formData.salaryAndBank.annualSalary}`} />
          <ReviewItem label="Pay Frequency" value={formData.salaryAndBank.payFrequency} />
          <ReviewItem label="Bank Name" value={formData.salaryAndBank.bankName} />
          <ReviewItem label="Account Number" value={formData.salaryAndBank.accountNumber} />
          <ReviewItem label="Tax ID / PAN" value={formData.salaryAndBank.taxId} />
        </div>
      </div>

      <div className="alert alert-info mt-4">
        Please review all the information carefully. Once submitted, you may need administrative approval to make changes.
      </div>
    </div>
  );
};

export default Step4_ReviewAndSubmit;