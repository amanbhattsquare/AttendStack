"use client";

import { EmployeeFormData, EmployeeFormErrors } from "../AddEmployeeWizard";

type StepProps = {
  data: EmployeeFormData;
  errors: EmployeeFormErrors;
  onChange: <TKey extends keyof EmployeeFormData>(field: TKey, value: EmployeeFormData[TKey]) => void;
};

const Step3_SalaryAndBank = ({ data, errors, onChange }: StepProps) => {
  return (
    <div>
      <div className="row g-3">
        <div className="col-md-6">
          <label htmlFor="salary" className="form-label">Annual Salary</label>
          <input type="number" min="0" className={`form-control ${errors.annualSalary ? "is-invalid" : ""}`} id="salary" placeholder="Enter annual salary" value={data.annualSalary} onChange={(event) => onChange("annualSalary", event.target.value)} />
          {errors.annualSalary && <div className="invalid-feedback">{errors.annualSalary}</div>}
        </div>
        <div className="col-md-6">
          <label htmlFor="payFrequency" className="form-label">Pay Frequency</label>
          <select className={`form-select ${errors.payFrequency ? "is-invalid" : ""}`} id="payFrequency" value={data.payFrequency} onChange={(event) => onChange("payFrequency", event.target.value)}>
            <option value="">Select Frequency</option>
            <option value="MONTHLY">Monthly</option>
            <option value="WEEKLY">Weekly</option>
            <option value="BI_WEEKLY">Bi-Weekly</option>
          </select>
          {errors.payFrequency && <div className="invalid-feedback">{errors.payFrequency}</div>}
        </div>
        <div className="col-md-6">
          <label htmlFor="bankName" className="form-label">Bank Name</label>
          <input type="text" className={`form-control ${errors.bankName ? "is-invalid" : ""}`} id="bankName" placeholder="Enter bank name" value={data.bankName} onChange={(event) => onChange("bankName", event.target.value)} />
          {errors.bankName && <div className="invalid-feedback">{errors.bankName}</div>}
        </div>
        <div className="col-md-6">
          <label htmlFor="accountNumber" className="form-label">Bank Account Number</label>
          <input type="text" className={`form-control ${errors.bankAccountNumber ? "is-invalid" : ""}`} id="accountNumber" placeholder="Enter account number" value={data.bankAccountNumber} onChange={(event) => onChange("bankAccountNumber", event.target.value)} />
          {errors.bankAccountNumber && <div className="invalid-feedback">{errors.bankAccountNumber}</div>}
        </div>
        <div className="col-md-6">
          <label htmlFor="taxId" className="form-label">Tax ID / PAN Number</label>
          <input type="text" className={`form-control text-uppercase ${errors.taxId ? "is-invalid" : ""}`} id="taxId" placeholder="Enter Tax ID" value={data.taxId} onChange={(event) => onChange("taxId", event.target.value.toUpperCase())} />
          {errors.taxId && <div className="invalid-feedback">{errors.taxId}</div>}
        </div>
      </div>
    </div>
  );
};

export default Step3_SalaryAndBank;
