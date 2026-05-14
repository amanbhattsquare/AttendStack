"use client";
import { useState } from "react";
import Step1_PersonalInfo from "./steps/Step1_PersonalInfo";
import Step2_EmploymentDetails from "./steps/Step2_EmploymentDetails";
import Step3_SalaryAndBank from "./steps/Step3_SalaryAndBank";
import Step4_ReviewAndSubmit from "./steps/Step4_ReviewAndSubmit";

const StepIndicator = ({ currentStep }: { currentStep: number }) => {
  const steps = ["Personal Info", "Employment Details", "Salary & Bank", "Review & Submit"];
  
  return (
    <div className="d-flex justify-content-between align-items-center mb-4">
      {steps.map((step, index) => (
        <div key={index} className="text-center">
          <div
            className={`rounded-circle d-flex align-items-center justify-content-center mx-auto ${
              currentStep > index + 1 || currentStep === index + 1 ? "bg-primary text-white" : "bg-light"
            }`}
            style={{ width: "40px", height: "40px" }}
          >
            {index + 1}
          </div>
          <p className="mt-2 mb-0">{step}</p>
        </div>
      ))}
    </div>
  );
};


const AddEmployeeWizard = () => {
  const [currentStep, setCurrentStep] = useState(1);

  const handleNext = () => setCurrentStep((prev) => prev + 1);
  const handleBack = () => setCurrentStep((prev) => prev - 1);

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-body p-4">
        <StepIndicator currentStep={currentStep} />
        <hr className="mb-4" />

        {/* We will render step components here */}
        {currentStep === 1 && <Step1_PersonalInfo />}
        {currentStep === 2 && <Step2_EmploymentDetails />}
        {currentStep === 3 && <Step3_SalaryAndBank />}
        {currentStep === 4 && <Step4_ReviewAndSubmit />}

        <div className="d-flex justify-content-between mt-4">
          {currentStep > 1 && (
            <button className="btn btn-secondary" onClick={handleBack}>
              Back
            </button>
          )}
          <div />
          {currentStep < 4 ? (
            <button className="btn btn-primary" onClick={handleNext}>
              Next
            </button>
          ) : (
            <button className="btn btn-success">Submit</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddEmployeeWizard;