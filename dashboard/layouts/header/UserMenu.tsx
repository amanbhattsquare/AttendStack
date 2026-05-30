import React, { useEffect, useState } from "react";
import { Dropdown, Image } from "react-bootstrap";
import Link from "next/link";
import { IconLogin2, IconHome2, IconSettings, IconActivity, IconBook } from "@tabler/icons-react";
import { Avatar } from "components/common/Avatar";
import { getAssetPath } from "helper/assetPath";

interface UserToggleProps {
  children?: React.ReactNode;
  onClick?: () => void;
}

const CustomToggle = React.forwardRef<HTMLAnchorElement, UserToggleProps>(
  ({ children, onClick }, ref) => (
    <Link ref={ref} href="#" onClick={onClick}>
      {children}
    </Link>
  )
);

CustomToggle.displayName = "CustomToggle";

const UserMenu = () => {
  const [user, setUser] = useState<{ full_name: string; email: string; role: string } | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);

        // Fetch live dynamic profile photo/DP directly from the server
        const fetchLiveProfile = async () => {
          const token = localStorage.getItem("authToken");
          if (!token) return;

          try {
            if (parsedUser.role === "EMPLOYEE") {
              const res = await fetch(`${process.env.NEXT_PUBLIC_API_ENDPOINT}/api/v1/employees/me/`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.ok) {
                const data = await res.json();
                if (data.profile_photo_url) {
                  setProfilePhoto(data.profile_photo_url);
                }
              }
            } else {
              const res = await fetch(`${process.env.NEXT_PUBLIC_API_ENDPOINT}/api/v1/accounts/profile/`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.ok) {
                const data = await res.json();
                if (data.avatar) {
                  setProfilePhoto(data.avatar);
                }
              }
            }
          } catch (err) {
            console.error("Error loading dynamic DP", err);
          }
        };

        fetchLiveProfile();
      } catch (e) {
        console.error("Error parsing user data", e);
      }
    }
  }, []);

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    window.location.href = "/sign-in";
  };

  const isEmployee = user?.role === "EMPLOYEE";

  const dynamicMenuItems = isEmployee 
    ? [
        {
          id: "emp-home",
          title: "Dashboard",
          link: "/employee-dashboard",
          icon: <IconHome2 size={18} strokeWidth={1.5} className="text-secondary" />,
        },
        {
          id: "emp-profile",
          title: "My Profile",
          link: "/employee-dashboard/profile",
          icon: <IconSettings size={18} strokeWidth={1.5} className="text-secondary" />,
        },
        {
          id: "emp-rulebook",
          title: "Company Rulebook",
          link: "/employee-dashboard/rulebook",
          icon: <IconBook size={18} strokeWidth={1.5} className="text-secondary" />,
        },
        {
          id: "emp-salary",
          title: "My Salary & Payslips",
          link: "/employee-dashboard/salary",
          icon: <IconActivity size={18} strokeWidth={1.5} className="text-secondary" />,
        },
      ]
    : [
        {
          id: "admin-home",
          title: "Admin Dashboard",
          link: "/",
          icon: <IconHome2 size={18} strokeWidth={1.5} className="text-secondary" />,
        },
        {
          id: "admin-employees",
          title: "Manage Employees",
          link: "/employees",
          icon: <IconSettings size={18} strokeWidth={1.5} className="text-secondary" />,
        },
        {
          id: "admin-payroll",
          title: "Salary & Payroll",
          link: "/salary",
          icon: <IconActivity size={18} strokeWidth={1.5} className="text-secondary" />,
        },
      ];

  const userAvatar = profilePhoto || getAssetPath("/images/avatar/avatar-fallback.jpg");

  return (
    <Dropdown>
      <Dropdown.Toggle as={CustomToggle}>
        <Avatar
          type="image"
          src={userAvatar}
          size="sm"
          alt="User Avatar"
          className="rounded-circle border border-2 border-white shadow-sm"
        />
      </Dropdown.Toggle>
      <Dropdown.Menu align="end" className="p-0 dropdown-menu-md shadow border-0" style={{ borderRadius: "14px", overflow: "hidden" }}>
        <div className="d-flex gap-3 align-items-center border-bottom px-4 py-4" style={{ backgroundColor: "#fcfdfe", borderBottomStyle: "dashed" }}>
          <Image
            src={userAvatar}
            alt=""
            className="avatar avatar-md rounded-circle border border-2 border-white shadow-sm"
            style={{ width: "48px", height: "48px", objectFit: "cover" }}
          />
          <div className="overflow-hidden">
            <h5 className="mb-0 fw-bold text-dark text-truncate">{user ? user.full_name : "AttendStack User"}</h5>
            <p className="mb-0 text-secondary small text-truncate" style={{ fontSize: "0.8rem" }}>
              {user ? user.email : "user@attendstack.com"}
            </p>
            <span className="badge bg-success-subtle text-success border border-success-subtle mt-1.5 font-monospace rounded-pill text-uppercase px-2 py-1" style={{ fontSize: "0.65rem", fontWeight: 600 }}>
              {user ? (user.role === "SUPER_ADMIN" ? "Super Admin" : user.role === "EMPLOYEE" ? "Employee" : user.role) : "Staff"}
            </span>
          </div>
        </div>
        <div className="p-2 d-flex flex-column gap-0.5">
          {dynamicMenuItems.map((item) => (
            <Dropdown.Item
              key={item.id}
              as={Link}
              href={item.link}
              className="d-flex align-items-center gap-2.5 px-3 py-2 rounded-3 dropdown-item-custom"
              style={{ transition: "all 0.15s ease" }}
            >
              <span className="d-flex align-items-center">{item.icon}</span>
              <span className="fw-medium text-dark-emphasis small">{item.title}</span>
            </Dropdown.Item>
          ))}
        </div>
        <div className="border-top mb-3 pt-3 px-4" style={{ borderTopStyle: "dashed" }}>
          <a
            href="#"
            onClick={handleLogout}
            className="text-danger d-flex align-items-center gap-2.5 px-2 py-1 rounded-3 logout-link-custom fw-semibold small text-decoration-none"
            style={{ transition: "all 0.15s ease" }}
          >
            <span className="d-flex align-items-center">
              <IconLogin2 size={18} strokeWidth={1.5} />
            </span>
            <span>Logout</span>
          </a>
        </div>
      </Dropdown.Menu>
      
      <style>{`
        .dropdown-item-custom:hover {
          background-color: #f3f4f6 !important;
        }
        .logout-link-custom:hover {
          color: #dc2626 !important;
          opacity: 0.95;
        }
      `}</style>
    </Dropdown>
  );
};

export default UserMenu;