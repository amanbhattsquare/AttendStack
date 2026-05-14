"use client";

const Step3_SalaryAndBank = () => {
  return (
    <form>
      <div className="row g-3">
        <div className="col-md-6">
          <label htmlFor="salary" className="form-label">
            Annual Salary
          </label>
          <input type="number" className="form-control" id="salary" placeholder="Enter annual salary" />
        </div>
        <div className="col-md-6">
          <label htmlFor="payFrequency" className="form-label">
            Pay Frequency
          </label>
          <select className="form-select" id="payFrequency">
            <option>Select Frequency</option>
            <option>Monthly</option>
            <option>Weekly</option>
            <option>Bi-Weekly</option>
          </select>
        </div>
        <div className="col-md-6">
          <label htmlFor="bankName" className="form-label">
            Bank Name
          </label>
          <input type="text" className="form-control" id="bankName" placeholder="Enter bank name" />
        </div>
        <div className="col-md-6">
          <label htmlFor="accountNumber" className="form-label">
            Bank Account Number
          </label>
          <input type="text" className="form-control" id="accountNumber" placeholder="Enter account number" />
        </div>
        <div className="col-md-6">
          <label htmlFor="taxId" className="form-label">
            Tax ID / PAN Number
          </label>
          <input type="text" className="form-control" id="taxId" placeholder="Enter Tax ID" />
        </div>
      </div>
    </form>
  );
};

export default Step3_SalaryAndBank;