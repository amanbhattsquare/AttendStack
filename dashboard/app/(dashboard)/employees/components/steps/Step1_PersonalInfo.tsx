"use client";

import { useState } from "react";

const Step1_PersonalInfo = () => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <form>
      <div className="mb-4 text-center">
        <img
          src={previewUrl || "/images/avatar/avatar-fallback.jpg"}
          alt="Profile Preview"
          className="avatar avatar-xl rounded-circle mb-3"
        />
        <div>
          <label htmlFor="profilePhoto" className="btn btn-sm btn-secondary">
            Upload Photo
          </label>
          <input type="file" className="d-none" id="profilePhoto" accept="image/*" onChange={handleFileChange} />
        </div>
      </div>
      <div className="row g-3">
        <div className="col-md-6">
          <label htmlFor="fullName" className="form-label">
            Full Name
          </label>
          <input type="text" className="form-control" id="fullName" placeholder="Enter full name" />
        </div>
        <div className="col-md-6">
          <label htmlFor="email" className="form-label">
            Email Address
          </label>
          <input type="email" className="form-control" id="email" placeholder="Enter email address" />
        </div>
        <div className="col-md-6">
          <label htmlFor="phone" className="form-label">
            Phone Number
          </label>
          <input type="tel" className="form-control" id="phone" placeholder="Enter phone number" />
        </div>
        <div className="col-md-6">
          <label htmlFor="dob" className="form-label">
            Date of Birth
          </label>
          <input type="date" className="form-control" id="dob" />
        </div>
        <div className="col-md-6">
          <label htmlFor="aadhaar" className="form-label">
            Aadhaar Number
          </label>
          <input type="text" className="form-control" id="aadhaar" placeholder="Enter 12-digit Aadhaar number" />
        </div>
        <div className="col-md-6">
            <label htmlFor="aadhaarUpload" className="form-label">
                Upload Aadhaar 
            </label>
            <input className="form-control" type="file" id="aadhaarUpload" />
        </div>
        <div className="col-12">
          <label htmlFor="address" className="form-label">
            Address
          </label>
          <textarea className="form-control" id="address" rows={3} placeholder="Enter full address"></textarea>
        </div>
      </div>

      <hr className="my-4" />
      <h5 className="mb-3">Emergency Contact Information</h5>
      <div className="row g-3">
        <div className="col-md-6">
          <label htmlFor="emergencyContactName" className="form-label">
            Contact Name
          </label>
          <input type="text" className="form-control" id="emergencyContactName" placeholder="Enter contact's full name" />
        </div>
        <div className="col-md-6">
          <label htmlFor="emergencyContactRelationship" className="form-label">
            Relationship
          </label>
          <input type="text" className="form-control" id="emergencyContactRelationship" placeholder="e.g., Spouse, Parent, Sibling" />
        </div>
        <div className="col-md-6">
          <label htmlFor="emergencyContactPhone" className="form-label">
            Contact Phone
          </label>
          <input type="tel" className="form-control" id="emergencyContactPhone" placeholder="Enter contact's phone number" />
        </div>
      </div>
    </form>
  );
};

export default Step1_PersonalInfo;