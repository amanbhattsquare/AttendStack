"use client"
import { useEffect } from "react";
import { usePathname, useRouter } from 'next/navigation';

//import custom components
import Header from "layouts/header/Header";
import Sidebar from "layouts/Sidebar";

interface DashboardProps {
  children: React.ReactNode;
}

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
      localStorage.removeItem("user");
      router.replace("/sign-in");
    }
  }, [pathname, router]);

  return (
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
  );
};

export default DashboardLayout;