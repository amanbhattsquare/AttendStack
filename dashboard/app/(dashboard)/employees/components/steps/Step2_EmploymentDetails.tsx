"use client";

const Step2_EmploymentDetails = () => {
  return (
    <form>
      <div className="row g-3">
        <div className="col-md-6">
          <label htmlFor="employeeId" className="form-label">
            Employee ID
          </label>
          <input type="text" className="form-control" id="employeeId" placeholder="Enter employee ID" />
        </div>
        <div className="col-md-6">
          <label htmlFor="joiningDate" className="form-label">
            Joining Date
          </label>
          <input type="date" className="form-control" id="joiningDate" />
        </div>
        <div className="col-md-6">
          <label htmlFor="department" className="form-label">
            Department
          </label>
          <select className="form-select" id="department">
            <option>Select Department</option>
            <option>Engineering</option>
            <option>Design</option>
            <option>Marketing</option>
            <option>Sales</option>
            <option>Human Resources</option>
          </select>
        </div>
        <div className="col-md-6">
          <label htmlFor="designation" className="form-label">
            Designation
          </label>
          <input type="text" className="form-control" id="designation" placeholder="Enter designation" />
        </div>
        <div className="col-md-6">
          <label htmlFor="employmentType" className="form-label">
            Employment Type
          </label>
          <select className="form-select" id="employmentType">
            <option>Select Type</option>
            <option>Full-time</option>
            <option>Part-time</option>
            <option>Contract</option>
            <option>Intern</option>
          </select>
        </div>
        <div className="col-md-6">
          <label htmlFor="reportingManager" className="form-label">
            Reporting Manager
          </label>
          <input type="text" className="form-control" id="reportingManager" placeholder="Enter manager's name" />
        </div>
      </div>
    </form>
  );
};

export default Step2_EmploymentDetails;