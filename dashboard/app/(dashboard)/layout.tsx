//import custom components
import Header from "layouts/header/Header";
import Sidebar from "layouts/Sidebar";

interface DashboardProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardProps> = ({ children }) => {
  return (
    <div>
      <Sidebar hideLogo={false} containerId='miniSidebar' />
      <div id='content' className='position-relative h-100'>
        <Header />
        <div className='custom-container'>{children}</div>
        <div className='custom-container'>
          <span className='me-1'>© All rights reserved by <a href="https://codescandy.com/" target="_blank">Codescandy</a>. Distributed by <a href="https://themewagon.com/" target="_blank">ThemeWagon</a>.</span>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
