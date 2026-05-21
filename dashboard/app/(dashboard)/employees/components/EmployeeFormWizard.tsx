"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Step1_PersonalInfo from "./steps/Step1_PersonalInfo";
import Step2_EmploymentDetails from "./steps/Step2_EmploymentDetails";
import Step3_SalaryAndBank from "./steps/Step3_SalaryAndBank";
import Step4_ReviewAndSubmit from "./steps/Step4_ReviewAndSubmit";

export type EmployeeFormData = {
  id?: string;
  profilePhoto: File | null;
  profilePhotoUrl?: string | null;
  aadhaarDocument: File | null;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  aadhaarNumber: string;
  address: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;
  employeeId: string;
  joiningDate: string;
  department: string;
  designation: string;
  employmentType: string;
  reportingManager: string;
  annualSalary: string;
  payFrequency: string;
  bankName: string;
  bankAccountNumber: string;
  taxId: string;
};

export type EmployeeFormErrors = Partial<Record<keyof EmployeeFormData, string>>;

export const initialEmployeeFormData: EmployeeFormData = {
  profilePhoto: null,
  aadhaarDocument: null,
  fullName: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  aadhaarNumber: "",
  address: "",
  emergencyContactName: "",
  emergencyContactRelationship: "",
  emergencyContactPhone: "",
  employeeId: "",
  joiningDate: "",
  department: "",
  designation: "",
  employmentType: "",
  reportingManager: "",
  annualSalary: "",
  payFrequency: "",
  bankName: "",
  bankAccountNumber: "",
  taxId: "",
};

const API_URL = `${process.env.NEXT_PUBLIC_API_ENDPOINT}/api/v1/employees/`;

const StepIndicator = ({ currentStep }: { currentStep: number }) => {
  const steps = ["Personal Info", "Employment Details", "Salary & Bank", "Review & Submit"];

  return (
    <div className="d-flex justify-content-between align-items-center mb-4">
      {steps.map((step, index) => (
        <div key={step} className="text-center">
          <div
            className={`rounded-circle d-flex align-items-center justify-content-center mx-auto ${
              currentStep >= index + 1 ? "bg-primary text-white" : "bg-light"
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

type EmployeeFormWizardProps = {
  mode?: "add" | "edit";
  initialData?: Partial<EmployeeFormData>;
  employeeId?: string;
  onSave?: () => void;
  onCancel?: () => void;
};

const EmployeeFormWizard = ({ mode = "add", initialData, employeeId, onSave, onCancel }: EmployeeFormWizardProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<EmployeeFormData>({ ...initialEmployeeFormData, ...initialData });
  const [errors, setErrors] = useState<EmployeeFormErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const updateField = <TKey extends keyof EmployeeFormData>(
    field: TKey,
    value: EmployeeFormData[TKey]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validateAll = () => {
    const combined: EmployeeFormErrors = {};
    let firstInvalidStep = 0;
    [1, 2, 3].forEach((step) => {
      const stepErrors = collectStepErrors(step);
      if (!firstInvalidStep && Object.keys(stepErrors).length > 0) {
        firstInvalidStep = step;
      }
      Object.assign(combined, stepErrors);
    });
    setErrors(combined);
    if (firstInvalidStep) {
      setCurrentStep(firstInvalidStep);
    }
    return Object.keys(combined).length === 0;
  };

  const collectStepErrors = (step: number) => {
    const nextErrors: EmployeeFormErrors = {};
    const required = (field: keyof EmployeeFormData, label: string) => {
      if (!String(formData[field] ?? "").trim()) {
        nextErrors[field] = `${label} is required.`;
      }
    };

    if (step === 1) {
      required("fullName", "Full name");
      required("email", "Email address");
      required("phone", "Phone number");
      required("aadhaarNumber", "Aadhaar number");
      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        nextErrors.email = "Enter a valid email address.";
      }
      if (formData.phone && !/^\+?[0-9]{10,15}$/.test(formData.phone)) {
        nextErrors.phone = "Enter a valid phone number.";
      }
      if (formData.aadhaarNumber && !/^[0-9]{12}$/.test(formData.aadhaarNumber)) {
        nextErrors.aadhaarNumber = "Aadhaar number must be 12 digits.";
      }
    }

    if (step === 2) {
      required("joiningDate", "Joining date");
      required("department", "Department");
      required("designation", "Designation");
      required("employmentType", "Employment type");
    }

    if (step === 3) {
      required("annualSalary", "Annual salary");
      required("payFrequency", "Pay frequency");
      required("bankName", "Bank name");
      required("bankAccountNumber", "Bank account number");
      required("taxId", "Tax ID / PAN");
      if (formData.annualSalary && Number(formData.annualSalary) <= 0) {
        nextErrors.annualSalary = "Annual salary must be greater than zero.";
      }
    }

    return nextErrors;
  };

  const handleNext = () => {
    const stepErrors = collectStepErrors(currentStep);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length === 0) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => setCurrentStep((prev) => prev - 1);

  const payload = useMemo(() => {
    const body = new FormData();
    const fields: Record<string, string> = {
      employee_id: formData.employeeId.trim(),
      full_name: formData.fullName.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      date_of_birth: formData.dateOfBirth,
      aadhaar_number: formData.aadhaarNumber.trim(),
      address: formData.address.trim(),
      emergency_contact_name: formData.emergencyContactName.trim(),
      emergency_contact_relationship: formData.emergencyContactRelationship.trim(),
      emergency_contact_phone: formData.emergencyContactPhone.trim(),
      joining_date: formData.joiningDate,
      department: formData.department,
      designation: formData.designation.trim(),
      employment_type: formData.employmentType,
      reporting_manager: formData.reportingManager.trim(),
      annual_salary: formData.annualSalary,
      pay_frequency: formData.payFrequency,
      bank_name: formData.bankName.trim(),
      bank_account_number: formData.bankAccountNumber.trim(),
      tax_id: formData.taxId.trim().toUpperCase(),
    };

    Object.entries(fields).forEach(([key, value]) => {
      if (value) body.append(key, value);
    });
    if (formData.profilePhoto) body.append("profile_photo", formData.profilePhoto);
    if (formData.aadhaarDocument) body.append("aadhaar_document", formData.aadhaarDocument);
    return body;
  }, [formData]);

  const handleSubmit = async () => {
    if (!validateAll()) {
      return;
    }

    setSubmitError("");
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("authToken");
      const url = mode === "edit" ? `${API_URL}${employeeId}/` : API_URL;
      const method = mode === "edit" ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: payload,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const firstError = errorBody
          ? Object.values(errorBody).flat().join(" ")
          : "Unable to save employee. Please try again.";
        throw new Error(firstError);
      }

      if (onSave) {
        onSave();
      } else {
        router.push("/employees");
        router.refresh();
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to save employee.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-body p-4">
        <StepIndicator currentStep={currentStep} />
        <hr className="mb-4" />

        {submitError && <div className="alert alert-danger">{submitError}</div>}

        {currentStep === 1 && <Step1_PersonalInfo data={formData} errors={errors} onChange={updateField} />}
        {currentStep === 2 && <Step2_EmploymentDetails data={formData} errors={errors} onChange={updateField} />}
        {currentStep === 3 && <Step3_SalaryAndBank data={formData} errors={errors} onChange={updateField} />}
        {currentStep === 4 && <Step4_ReviewAndSubmit data={formData} />}

        <div className="d-flex justify-content-between mt-4">
          <div className="d-flex gap-2">
            {currentStep > 1 && (
              <button className="btn btn-secondary" onClick={handleBack} disabled={isSubmitting}>
                Back
              </button>
            )}
            {mode === "edit" && onCancel && (
              <button className="btn btn-outline-secondary" onClick={onCancel} disabled={isSubmitting}>
                Cancel
              </button>
            )}
          </div>
          {currentStep < 4 ? (
            <button className="btn btn-primary" onClick={handleNext}>
              Next
            </button>
          ) : (
            <button className="btn btn-success" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Submit"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeFormWizard;