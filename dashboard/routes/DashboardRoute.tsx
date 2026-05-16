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
} from "@tabler/icons-react";

//import custom type
import { MenuItemType } from "types/menuTypes";

export const DashboardMenu: MenuItemType[] = [
  {
    id: uuid(),
    title: "Dashboard",
    link: "/admin",
    icon: <IconLayoutDashboard size={20} strokeWidth={1.5} />,
  },
  {
    id: uuid(),
    title: "Organizations",
    link: "/admin/organizations",
    icon: <IconUsers size={20} strokeWidth={1.5} />,
  },
  {
    id: uuid(),
    title: "System",
    grouptitle: true,
  },
  {
    id: uuid(),
    title: "Logout",
    link: "/admin/login",
    icon: <IconLogout size={20} strokeWidth={1.5} />,
    logout: true,
  },
];