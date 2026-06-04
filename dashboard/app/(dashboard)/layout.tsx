"use client"
import { useEffect } from "react";
import { usePathname, useRouter } from 'next/navigation';

//import custom components
import { BrandingProvider } from "context/BrandingContext";
import Header from "layouts/header/Header";
import Sidebar from "layouts/Sidebar";

interface DashboardProps {
  children: React.ReactNode;
}

const HOME_ROUTE = "/";

const clearSession = () => {
  localStorage.removeItem("authToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
};

const getTokenExpiryMs = (token: string) => {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof decoded.exp === "number" ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
};

const DashboardLayout: React.FC<DashboardProps> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const isEmployee = pathname.startsWith("/employee-dashboard");

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const storedUser = localStorage.getItem("user");

    if (!token || !storedUser) {
      router.replace("/sign-in");
      return;
    }

    const expiresAt = getTokenExpiryMs(token);
    if (expiresAt && expiresAt <= Date.now()) {
      clearSession();
      router.replace(HOME_ROUTE);
      return;
    }

    let expiryTimer: number | undefined;
    if (expiresAt) {
      expiryTimer = window.setTimeout(() => {
        clearSession();
        router.replace(HOME_ROUTE);
      }, Math.max(expiresAt - Date.now(), 0));
    }

    try {
      const user = JSON.parse(storedUser);
      if (user?.role === "EMPLOYEE" && !pathname.startsWith("/employee-dashboard")) {
        router.replace("/employee-dashboard");
      }
      if (user?.role !== "EMPLOYEE" && pathname.startsWith("/employee-dashboard")) {
        router.replace("/");
      }
    } catch {
      localStorage.removeItem("authToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      router.replace("/sign-in");
    }

    return () => {
      if (expiryTimer) {
        window.clearTimeout(expiryTimer);
      }
    };
  }, [pathname, router]);

  return (
    <BrandingProvider>
      <div>
        <Sidebar hideLogo={false} containerId='miniSidebar' currentPath={pathname} isEmployee={isEmployee} />
        <div id='content' className='position-relative h-100 d-flex flex-column'>
          <Header />
          <div className='custom-container' style={{ flex: '1 0 auto' }}>
            {children}
          </div>
          <div className='custom-container py-3'>
            <span className='me-1'>© 2026 AttendStack. A <a href="https://bhattsquare.com" target="_blank" rel="noopener noreferrer">Bhatt Square</a> Project.</span>
          </div>
        </div>
      </div>
    </BrandingProvider>
  );
};

export default DashboardLayout;
