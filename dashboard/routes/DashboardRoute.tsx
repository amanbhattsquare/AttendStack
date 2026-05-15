//import node modules libraries
import { v4 as uuid } from "uuid";
import {
  IconLayoutDashboard,
  IconUsers,
  IconCalendarEvent,
  IconBeach,
  IconCoin,
  IconLock,
  IconUser,
  IconClock,
  IconCircleCheck,
  IconListDetails,
  IconFingerprint,
  IconChartBar,
  IconWallet,
} from "@tabler/icons-react";

//import custom type
import { MenuItemType } from "types/menuTypes";

export const DashboardMenu: MenuItemType[] = [
  {
    id: uuid(),
    title: "Admin Dashboard",
    link: "/",
    icon: <IconLayoutDashboard size={20} strokeWidth={1.5} />,
  },

  {
    id: uuid(),
    title: "HR Management",
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
    icon: <IconClock size={20} strokeWidth={1.5} />,
    children: [
      {
        id: uuid(),
        name: "Today's Attendance",
        link: "/attendance/today-attendance",
        icon: <IconCircleCheck size={18} strokeWidth={1.5} />,
      },
      {
        id: uuid(),
        name: "Attendance Records",
        link: "/attendance/records",
        icon: <IconListDetails size={18} strokeWidth={1.5} />,
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
    title: "System",
    grouptitle: true,
  },
  {
    id: uuid(),
    title: "Auth",
    link: "/sign-in",
    icon: <IconLock size={20} strokeWidth={1.5} />,
  },
];