"use client"
import { usePathname } from 'next/navigation';

//import custom components
import Header from "layouts/header/Header";
import Sidebar from "layouts/Sidebar";

interface DashboardProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardProps> = ({ children }) => {
  const pathname = usePathname();
  return (
    <div>
      <Sidebar hideLogo={false} containerId='miniSidebar' currentPath={pathname} />
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