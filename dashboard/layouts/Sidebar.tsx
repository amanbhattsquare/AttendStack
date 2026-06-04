"use client";
//import node module libraries
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { Fragment, useState, useEffect } from "react";
import {
  Accordion,
  Badge,
  Image,
  ListGroup,
  Nav,
  NavItem,
} from "react-bootstrap";

//import custom types
import { MenuItemType } from "types/menuTypes";

//import custom components
import { useBranding } from "context/BrandingContext";
import { Avatar } from "components/common/Avatar";
import CustomToggle, { CustomToggleLevel2 } from "./SidebarMenuToggle";

// import required routes
import { getAssetPath } from "helper/assetPath";
import { DashboardMenu } from "routes/DashboardRoute";
import { EmployeeDashboardMenu } from "routes/EmployeeDashboardRoute";

interface SidebarProps {
  hideLogo: boolean;
  isEmployee?: boolean;
  containerId?: string;
  currentPath: string;
}
const Sidebar: React.FC<SidebarProps> = ({ hideLogo = false, containerId, currentPath, isEmployee }) => {
  const { companyLogo, companyName } = useBranding();
  const menuItems = isEmployee ? EmployeeDashboardMenu : DashboardMenu;
  const [user, setUser] = useState<{ full_name: string; designation: string } | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
    }
  }, []);


  //Generate Link
  const generateLink = (item: MenuItemType) => {
    const isactive = currentPath === item.link;
    if (item.logout) {
      const handleLogout = () => {
        localStorage.removeItem("authToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        window.location.href = item.link || "/sign-in";
      };
      return (
        <button
          onClick={handleLogout}
          className={`nav-link ${isactive ? "active" : ""}`}
        >
          {item.icon && <span className="nav-icon">{item.icon}</span>}
          <span className="text">{item.name || item.title}</span>
        </button>
      );
    }
    return (
      <Link
        href={`${item.link}`}
        className={`nav-link ${isactive ? "active" : ""}`}
      >
        {item.icon && <span className="nav-icon">{item.icon}</span>}
        <span className="text">{item.name || item.title}</span>
        {item.badge && (
          <Badge
            className="ms-1"
            bg={item.badgecolor ? item.badgecolor : "primary"}
          >
            {item.badge}
          </Badge>
        )}
      </Link>
    );
  };

  const getActiveMenuIndex = () => {
    const activeMenu = menuItems.findIndex((menu) => {
      if (menu.children) {
        return menu.children.some((child) => child && typeof currentPath === 'string' && currentPath.startsWith(child.link || ''));
      }
      return false;
    });
    return activeMenu > -1 ? activeMenu.toString() : '0';
  };

  return (
    <div id={containerId}>
      <div>
        {hideLogo || (
          <div className='brand-logo'>
            <Link
              href='/'
              className='d-none d-md-flex align-items-center gap-2'>
              <Image
                src={getAssetPath("/images/brand/logo/logo.png")}
                alt=''
                style={{ height: "30px", width: "auto" }}
              />
              <span className='fw-bold fs-4 site-logo-text'>AttendStack</span>
            </Link>
          </div>
        )}

        {/* Sidebar Dashboard Menu */}
        <Accordion
          defaultActiveKey={getActiveMenuIndex()}
          as='ul'
          bsPrefix='navbar-nav flex-column'>
          {menuItems.map(function (menu, index) {
            if (menu.grouptitle) {
              return (
                // Group Title
                <Nav.Item key={index} as='li'>
                  <div className='nav-heading'>{menu.title}</div>
                  <hr className='mx-5 nav-line mb-1' />
                </Nav.Item>
              );
            } else {
              if (menu.children) {
                return (
                  <Fragment key={index}>
                    {/* Dropdown Parent Menu */}
                    <CustomToggle eventKey={index.toString()} icon={menu.icon}>
                      {menu.title}
                    </CustomToggle>
                    <Accordion.Collapse eventKey={index.toString()}>
                      <ListGroup as='ul' className='dropdown-menu flex-column'>
                        {menu.children.map(function (
                          menuLevel1Item,
                          menuLevel1Index
                        ) {
                          if (menuLevel1Item.children) {
                            return (
                              <ListGroup.Item
                                as='li'
                                bsPrefix='nav-item'
                                key={menuLevel1Index}>
                                {/* first level menu started  */}
                                <Accordion
                                  defaultActiveKey='0'
                                  bsPrefix='navbar-nav flex-column'>
                                  <CustomToggleLevel2
                                    eventKey={"0"}
                                    href={"#link"}>
                                    {menuLevel1Item.title}
                                  </CustomToggleLevel2>
                                  <Accordion.Collapse eventKey={"0"}>
                                    <ListGroup
                                      as='ul'
                                      bsPrefix=''
                                      className='nav flex-column'>
                                      {/* second level menu started  */}
                                      {menuLevel1Item.children.map(function (
                                        menuLevel2Item,
                                        menuLevel2Index
                                      ) {
                                        if (menuLevel2Item.children) {
                                          return (
                                            <ListGroup.Item
                                              as='li'
                                              bsPrefix='nav-item'
                                              key={menuLevel2Index}>
                                              {/* second level accordion menu started  */}
                                              <Accordion
                                                defaultActiveKey='0'
                                                className='navbar-nav flex-column'>
                                                <CustomToggleLevel2
                                                  eventKey={"0"}>
                                                  {menuLevel2Item.title}
                                                </CustomToggleLevel2>
                                                <Accordion.Collapse
                                                  eventKey={"0"}
                                                  bsPrefix='nav-item'>
                                                  <ListGroup
                                                    as='ul'
                                                    bsPrefix=''
                                                    className='nav flex-column'>
                                                    {/* third level menu started  */}
                                                    {menuLevel2Item.children.map(
                                                      function (
                                                        menuLevel3Item,
                                                        menuLevel3Index
                                                      ) {
                                                        return (
                                                          <ListGroup.Item
                                                            key={
                                                              menuLevel3Index
                                                            }
                                                            as='li'
                                                            bsPrefix='nav-item'>
                                                            <Link
                                                              href={
                                                                menuLevel3Item.link?.toString() ||
                                                                `/${menuLevel3Item.link}`
                                                              }
                                                              className={`nav-link ${
                                                                currentPath === menuLevel3Item.link
                                                                  ? "active"
                                                                  : ""
                                                              }`}
                                                            >
                                                              {
                                                                menuLevel3Item.name
                                                              }
                                                            </Link>
                                                          </ListGroup.Item>
                                                        );
                                                      }
                                                    )}
                                                    {/* end of third level menu  */}
                                                  </ListGroup>
                                                </Accordion.Collapse>
                                              </Accordion>
                                              {/* end of second level accordion */}
                                            </ListGroup.Item>
                                          );
                                        } else {
                                          return (
                                            <ListGroup.Item
                                              key={menuLevel2Index}
                                              as='li'
                                              bsPrefix='nav-item'>
                                              {generateLink(menuLevel2Item)}
                                            </ListGroup.Item>
                                          );
                                        }
                                      })}
                                      {/* end of second level menu  */}
                                    </ListGroup>
                                  </Accordion.Collapse>
                                </Accordion>
                                {/* end of first level menu */}
                              </ListGroup.Item>
                            );
                          } else {
                            return (
                              <ListGroup.Item
                                as='li'
                                bsPrefix='nav-item'
                                key={menuLevel1Index}>
                                {generateLink(menuLevel1Item)}
                              </ListGroup.Item>
                            );
                          }
                        })}
                      </ListGroup>
                    </Accordion.Collapse>
                    {/* end of main menu / menu level 1 / root items */}
                  </Fragment>
                );
              } else {
                return (
                  <Nav.Item as='li' key={index}>
                    {generateLink(menu)}
                  </Nav.Item>
                );
              }
            }
          })}
          <NavItem as='li' bsPrefix=''>
            <div className='text-center py-5 upgrade-ui'>
              <div>
                <Avatar
                  type='image'
                  src={companyLogo || getAssetPath("/images/brand/logo/logo.png")}
                  size='md'
                  className='rounded-circle'
                />
                <div className='my-3'>
                  <h5 className='mb-1 fs-6'>{companyName || 'AttendStack'}</h5>
                  <span className='d-block text-secondary'>{user ? user.full_name : 'Jitu Chauhan'}</span>
                  <span className='text-secondary'>{user ? user.designation : 'HR Administrator'}</span>
                </div>
              </div>
            </div>
          </NavItem>
        </Accordion>
      </div>
    </div>
  );
};

export default Sidebar;
