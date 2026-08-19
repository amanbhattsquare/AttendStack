"use client"
import { useEffect, useState } from "react";
import { usePathname, useRouter } from 'next/navigation';

import { BrandingProvider } from "context/BrandingContext";
import Header from "layouts/header/Header";
import Sidebar from "layouts/Sidebar";
import PlanExpiryAlertBanner from "components/PlanExpiryAlertBanner";

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
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        setUserRole(u?.role || null);
      } catch { }
    }
  }, []);

  const isEmployeeSidebar = userRole === "EMPLOYEE" || pathname.startsWith("/employee-dashboard");

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
      const isSharedRoute = pathname.startsWith("/chat");
      if (user?.role === "EMPLOYEE" && !pathname.startsWith("/employee-dashboard") && !isSharedRoute) {
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

  const isChatPage = pathname.startsWith("/chat");

  return (
    <BrandingProvider>
      <div>
        <Sidebar hideLogo={false} containerId='miniSidebar' currentPath={pathname} isEmployee={isEmployeeSidebar} />
        <div id='content' className={`position-relative d-flex flex-column ${isChatPage ? 'chat-content-wrap' : 'h-100'}`}>
          <Header />
          <PlanExpiryAlertBanner />
          <div
            className={isChatPage ? "" : "custom-container"}
            style={
              isChatPage
                ? {
                    flex: "1 1 auto",
                    height: "100%",
                    maxHeight: "100%",
                    padding: 0,
                    margin: 0,
                    maxWidth: "100%",
                    overflow: "hidden",
                  }
                : { flex: "1 0 auto" }
            }
          >
            {children}
          </div>
          {!isChatPage && (
            <div className='custom-container py-3'>
              <span className='me-1'>© 2026 AttendStack. A <a href="https://bhattsquare.com" target="_blank" rel="noopener noreferrer">Bhatt Square</a> Project. <span className='text-secondary ms-2'>Version 2.5.3</span></span>
            </div>
          )}
        </div>
      </div>
      {isChatPage && (
        <style jsx global>{`
          html #content.chat-content-wrap,
          html.collapsed #content.chat-content-wrap,
          html.expanded #content.chat-content-wrap {
            padding-top: 62px !important;
            padding-bottom: 0 !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
            height: 100vh !important;
            min-height: 100vh !important;
            max-height: 100vh !important;
            overflow: hidden !important;
          }
        `}</style>
      )}
    </BrandingProvider>
  );
};

export default DashboardLayout;
