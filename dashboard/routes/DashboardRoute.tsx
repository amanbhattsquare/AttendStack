//import node modules libraries
import { v4 as uuid } from "uuid";
import {
  IconLayoutDashboard,
  IconUsers,
  IconCalendarEvent,
  IconBeach,
  IconCoin,
  IconLogout,
  IconUser,
  IconClock,
  IconCircleCheck,
  IconListDetails,
  IconFingerprint,
  IconChartBar,
  IconWallet,
  IconCalendarTime,
} from "@tabler/icons-react";

//import custom type
import { MenuItemType } from "types/menuTypes";

export const DashboardMenu: MenuItemType[] = [
  {
    id: uuid(),
    title: "Admin Dashboard",
    link: "/admin/dashboard",
    icon: <IconLayoutDashboard size={20} strokeWidth={1.5} />,
  },
  {
    id: uuid(),
    title: "HR MANAGEMENT",
    grouptitle: true,
  },
  {
    id: uuid(),
    title: "Employees",
    link: "/employees",
    icon: <IconUsers size={20} strokeWidth={1.5} />,
  },
  {
    id: uuid(),
    title: "Attendance",
    icon: <IconCalendarEvent size={20} strokeWidth={1.5} />,
    children: [
      {
        id: uuid(),
        title: "Today's Attendance",
        link: "/attendance/todays-attendance",
        icon: <IconCircleCheck size={20} strokeWidth={1.5} />,
      },
      {
        id: uuid(),
        title: "Attendance Records",
        link: "/attendance/records",
        icon: <IconListDetails size={20} strokeWidth={1.5} />,
      },
    ],
  },
  {
    id: uuid(),
    title: "Holidays",
    link: "/holidays",
    icon: <IconBeach size={20} strokeWidth={1.5} />,
  },
  {
    id: uuid(),
    title: "Salary & Payroll",
    link: "/salary",
    icon: <IconCoin size={20} strokeWidth={1.5} />,
  },
  {
    id: uuid(),
    title: "Leave Requests",
    link: "/leaves",
    icon: <IconCalendarTime size={20} strokeWidth={1.5} />,
  },
  {
    id: uuid(),
    title: "SYSTEM",
    grouptitle: true,
  },
  {
    id: uuid(),
    title: "Logout",
    link: "/sign-in",
    icon: <IconLogout size={20} strokeWidth={1.5} />,
    logout: true,
  },
];