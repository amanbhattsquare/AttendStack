"use client"
import { useEffect, useState } from "react";
import { usePathname, useRouter } from 'next/navigation';

import { BrandingProvider } from "context/BrandingContext";
import Header from "layouts/header/Header";
import Sidebar from "layouts/Sidebar";
import PlanExpiryAlertBanner from "components/PlanExpiryAlertBanner";
import GlobalChatNotificationListener from "components/chat/GlobalChatNotificationListener";

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
      <GlobalChatNotificationListener />
      <div>
        <Sidebar hideLogo={false} containerId='miniSidebar' currentPath={pathname} isEmployee={isEmployeeSidebar} />
        <div id='content' className={`position-relative d-flex flex-column ${isChatPage ? 'chat-content-wrap' : 'min-vh-100'}`} style={{ minHeight: "100vh" }}>
          <Header />
          <PlanExpiryAlertBanner />
          <div
            className={isChatPage ? "" : "custom-container"}
            style={
              isChatPage
                ? {
                  flex: "1 1 0%",
                  height: "calc(100vh - 60px)",
                  maxHeight: "calc(100vh - 60px)",
                  minHeight: 0,
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
            <footer className='custom-container mt-auto pt-3 pb-1 text-muted small border-top' style={{ borderColor: '#f1f5f9' }}>
              <span className='me-1'>© 2026 AttendStack. A <a href="https://bhattsquare.com" target="_blank" rel="noopener noreferrer" className="text-primary fw-medium text-decoration-none">Bhatt Square</a> Project. <span className='text-secondary ms-2'>Version 2.5.14</span></span>
            </footer>
          )}
        </div>
      </div>
      {isChatPage && (
        <style jsx global>{`
          html #content.chat-content-wrap,
          html.collapsed #content.chat-content-wrap,
          html.expanded #content.chat-content-wrap {
            padding-top: 60px !important;
            padding-bottom: 0 !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
            height: 100vh !important;
            min-height: 100vh !important;
            max-height: 100vh !important;
            overflow: hidden !important;
          }

          html #content.chat-content-wrap .navbar-glass,
          html.collapsed #content.chat-content-wrap .navbar-glass,
          html.expanded #content.chat-content-wrap .navbar-glass {
            background-color: #ffffff !important;
            backdrop-filter: blur(12px) !important;
            border-bottom: 1px solid #e2e8f0 !important;
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.04) !important;
            height: 60px !important;
          }
        `}</style>
      )}
    </BrandingProvider>
  );
};

export default DashboardLayout;
