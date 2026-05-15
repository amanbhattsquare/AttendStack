//import node modules libraries
import { v4 as uuid } from "uuid";
import {
  IconUser,
  IconBeach,
  IconFingerprint,
  IconChartBar,
  IconWallet,
} from "@tabler/icons-react";

//import custom type
import { MenuItemType } from "types/menuTypes";

export const EmployeeDashboardMenu: MenuItemType[] = [
      {
        id: uuid(),
        title: "My Profile",
        link: "/employee-dashboard/profile",
        icon: <IconUser size={18} strokeWidth={1.5} />,
      },
      {
        id: uuid(),
        title: "Holidays",
        link: "/employee-dashboard/holidays",
        icon: <IconBeach size={18} strokeWidth={1.5} />,
      },
      {
        id: uuid(),
        title: "My Attendance",
        link: "/employee-dashboard/attendance",
        icon: <IconFingerprint size={18} strokeWidth={1.5} />,
      },
      {
        id: uuid(),
        title: "Attendance Report",
        link: "/employee-dashboard/attendance-report",
        icon: <IconChartBar size={18} strokeWidth={1.5} />,
      },
      {
        id: uuid(),
        title: "My Salary",
        link: "/employee-dashboard/salary",
        icon: <IconWallet size={18} strokeWidth={1.5} />,
      },
];