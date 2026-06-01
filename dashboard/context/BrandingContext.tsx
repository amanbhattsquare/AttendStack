"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";

interface BrandingContextType {
  companyLogo: string | null;
  setCompanyLogo: (logo: string | null) => void;
  companyName: string | null;
  setCompanyName: (name: string | null) => void;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export const BrandingProvider = ({ children }: { children: ReactNode }) => {
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_ENDPOINT;
        const token = localStorage.getItem("authToken");
        const response = await fetch(`${API_URL}/api/v1/settings/`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.company_logo) {
            setCompanyLogo(data.company_logo);
          }
          if (data.company_name) {
            setCompanyName(data.company_name);
          }
        }
      } catch (error) {
        console.error("Failed to fetch branding:", error);
      }
    };

    fetchBranding();
  }, []);

  return (
    <BrandingContext.Provider value={{ companyLogo, setCompanyLogo, companyName, setCompanyName }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error("useBranding must be used within a BrandingProvider");
  }
  return context;
};