import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  IconArrowRight,
  IconArrowUpRight,
  IconBeach,
  IconBuilding,
  IconCalendarCheck,
  IconChartBar,
  IconCheck,
  IconClock,
  IconFingerprint,
  IconListCheck,
  IconMapPin,
  IconShield,
  IconUsers,
  IconWallet,
} from "@tabler/icons-react";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "AttendStack | Modern Workforce Management",
  description:
    "Manage attendance, employees, leave, holidays, payroll, and workforce reporting from one clear workspace.",
};

const capabilities = [
  {
    icon: IconFingerprint,
    title: "Smart attendance",
    description:
      "Make daily check-ins simple with live status, working hours, and location-aware attendance.",
  },
  {
    icon: IconUsers,
    title: "Employee records",
    description:
      "Keep employee profiles, employment details, documents, and bank information organized.",
  },
  {
    icon: IconListCheck,
    title: "Leave workflows",
    description:
      "Give employees a clear way to request leave and managers a focused approval workspace.",
  },
  {
    icon: IconWallet,
    title: "Salary & payslips",
    description:
      "Bring salary records, payout breakdowns, and employee payslips into the same system.",
  },
  {
    icon: IconChartBar,
    title: "Workforce insights",
    description:
      "Understand attendance patterns, department activity, and monthly trends at a glance.",
  },
  {
    icon: IconBeach,
    title: "Holidays & rulebooks",
    description:
      "Keep company calendars and attendance policies visible to the whole workforce.",
  },
];

const workflow = [
  {
    number: "01",
    title: "Set up your workforce",
    description:
      "Organize employee profiles, departments, schedules, attendance rules, and company holidays.",
  },
  {
    number: "02",
    title: "Run the day in real time",
    description:
      "Employees check in, managers see live status, and leave requests move through one clear flow.",
  },
  {
    number: "03",
    title: "Review with confidence",
    description:
      "Use attendance reports, salary records, and activity insights to make informed decisions.",
  },
];

const activityRows = [
  { initials: "AK", name: "Aarav Kapoor", detail: "Checked in", time: "09:48", color: "green" },
  { initials: "NS", name: "Nisha Shah", detail: "Leave approved", time: "09:32", color: "blue" },
  { initials: "RM", name: "Rohan Mehta", detail: "Checked in", time: "09:24", color: "purple" },
];

export default function Home() {
  return (
    <main className={styles.home}>
      <nav className={styles.navbar} aria-label="Main navigation">
        <div className={styles.navInner}>
          <Link href="/" className={styles.brand} aria-label="AttendStack home">
            <span className={styles.logoWrap}>
              <Image
                src="/images/brand/logo/android-chrome-192x192.png"
                alt=""
                width={38}
                height={38}
                priority
              />
            </span>
            <span>AttendStack</span>
          </Link>

          <div className={styles.navLinks}>
            <a href="#platform">Platform</a>
            <a href="#features">Capabilities</a>
            <a href="#workflow">How it works</a>
          </div>

          <div className={styles.navActions}>
            <Link href="/sign-in" className={styles.textButton}>
              Employee login
            </Link>
            <Link href="/admin/sign-in" className={styles.primaryButtonSmall}>
              Company login
              <IconArrowUpRight size={16} strokeWidth={2} />
            </Link>
          </div>
        </div>
      </nav>

      <section className={styles.hero} id="platform">
        <div className={styles.heroGlowOne} />
        <div className={styles.heroGlowTwo} />
        <div className={styles.container}>
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <div className={styles.eyebrow}>
                <span className={styles.eyebrowDot} />
                Modern workforce operations
              </div>
              <h1>
                Your people.
                <br />
                Your workday.
                <br />
                <span>One clear system.</span>
              </h1>
              <p className={styles.heroDescription}>
                AttendStack brings attendance, employee operations, leave, and
                payroll visibility together so your team can focus on work that
                matters.
              </p>
              <div className={styles.heroActions}>
                <Link href="/admin/sign-in" className={styles.primaryButton}>
                  Open company portal
                  <IconArrowRight size={19} strokeWidth={2} />
                </Link>
                <Link href="/sign-in" className={styles.secondaryButton}>
                  Employee portal
                </Link>
              </div>
              <div className={styles.heroPoints}>
                <span>
                  <IconCheck size={17} strokeWidth={2.5} />
                  Role-based access
                </span>
                <span>
                  <IconCheck size={17} strokeWidth={2.5} />
                  Live attendance
                </span>
                <span>
                  <IconCheck size={17} strokeWidth={2.5} />
                  Centralized records
                </span>
              </div>
            </div>

            <div className={styles.heroVisual} aria-label="AttendStack dashboard preview">
              <div className={styles.visualBadge}>
                <IconMapPin size={17} strokeWidth={2} />
                Location-aware check-in
              </div>
              <div className={styles.dashboardCard}>
                <div className={styles.dashboardTop}>
                  <div className={styles.dashboardBrand}>
                    <Image
                      src="/images/brand/logo/android-chrome-192x192.png"
                      alt=""
                      width={29}
                      height={29}
                    />
                    <span>AttendStack</span>
                  </div>
                  <div className={styles.dashboardUser}>
                    <span />
                    Admin workspace
                  </div>
                </div>

                <div className={styles.dashboardBody}>
                  <div className={styles.previewHeading}>
                    <div>
                      <span>Good morning</span>
                      <strong>Workforce overview</strong>
                    </div>
                    <span className={styles.previewDate}>
                      <IconCalendarCheck size={15} />
                      Today
                    </span>
                  </div>

                  <div className={styles.statGrid}>
                    <div className={styles.statCard}>
                      <span className={`${styles.statIcon} ${styles.statIconGreen}`}>
                        <IconUsers size={18} />
                      </span>
                      <small>Workforce</small>
                      <strong>128</strong>
                      <em>+6 this month</em>
                    </div>
                    <div className={styles.statCard}>
                      <span className={`${styles.statIcon} ${styles.statIconBlue}`}>
                        <IconFingerprint size={18} />
                      </span>
                      <small>Present today</small>
                      <strong>116</strong>
                      <em>90.6% attendance</em>
                    </div>
                    <div className={styles.statCard}>
                      <span className={`${styles.statIcon} ${styles.statIconAmber}`}>
                        <IconClock size={18} />
                      </span>
                      <small>Late arrivals</small>
                      <strong>04</strong>
                      <em>Within policy</em>
                    </div>
                  </div>

                  <div className={styles.previewBottom}>
                    <div className={styles.attendancePanel}>
                      <div className={styles.panelHeading}>
                        <div>
                          <strong>Attendance by team</strong>
                          <span>Live today</span>
                        </div>
                        <IconChartBar size={18} />
                      </div>
                      <div className={styles.progressList}>
                        <div>
                          <span><b>Operations</b><small>94%</small></span>
                          <i><em style={{ width: "94%" }} /></i>
                        </div>
                        <div>
                          <span><b>Product</b><small>88%</small></span>
                          <i><em style={{ width: "88%" }} /></i>
                        </div>
                        <div>
                          <span><b>Sales</b><small>82%</small></span>
                          <i><em style={{ width: "82%" }} /></i>
                        </div>
                      </div>
                    </div>

                    <div className={styles.activityPanel}>
                      <div className={styles.panelHeading}>
                        <div>
                          <strong>Recent activity</strong>
                          <span>Latest updates</span>
                        </div>
                      </div>
                      <div className={styles.activityList}>
                        {activityRows.map((activity) => (
                          <div className={styles.activityRow} key={activity.name}>
                            <span className={`${styles.avatar} ${styles[activity.color]}`}>
                              {activity.initials}
                            </span>
                            <span>
                              <b>{activity.name}</b>
                              <small>{activity.detail}</small>
                            </span>
                            <time>{activity.time}</time>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className={styles.statusBadge}>
                <span><IconCheck size={16} strokeWidth={3} /></span>
                <div>
                  <strong>Checked in</strong>
                  <small>Right on schedule</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.valueStrip} aria-label="Platform benefits">
        <div className={styles.container}>
          <div className={styles.valueGrid}>
            <div>
              <IconBuilding size={23} strokeWidth={1.8} />
              <span><strong>One workspace</strong><small>For the whole organization</small></span>
            </div>
            <div>
              <IconClock size={23} strokeWidth={1.8} />
              <span><strong>Real-time clarity</strong><small>Across every workday</small></span>
            </div>
            <div>
              <IconShield size={23} strokeWidth={1.8} />
              <span><strong>Role-based views</strong><small>For admins and employees</small></span>
            </div>
            <div>
              <IconChartBar size={23} strokeWidth={1.8} />
              <span><strong>Useful reporting</strong><small>For better decisions</small></span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.featuresSection} id="features">
        <div className={styles.container}>
          <div className={styles.sectionIntro}>
            <span className={styles.sectionLabel}>Built for the workday</span>
            <h2>Everything your workforce needs, without the clutter.</h2>
            <p>
              A connected set of tools for the daily tasks that keep your
              organization moving.
            </p>
          </div>

          <div className={styles.featureGrid}>
            {capabilities.map((feature) => {
              const FeatureIcon = feature.icon;
              return (
                <article className={styles.featureCard} key={feature.title}>
                  <span className={styles.featureIcon}>
                    <FeatureIcon size={24} strokeWidth={1.8} />
                  </span>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className={styles.rolesSection}>
        <div className={styles.container}>
          <div className={styles.rolesGrid}>
            <div className={styles.rolesCopy}>
              <span className={styles.sectionLabel}>Designed around people</span>
              <h2>Clear for managers. Effortless for employees.</h2>
              <p>
                Everyone gets a focused view of what they need, with fewer
                handoffs and less time spent chasing updates.
              </p>

              <div className={styles.roleList}>
                <div>
                  <span><IconBuilding size={21} /></span>
                  <div>
                    <strong>Company workspace</strong>
                    <p>Manage people, attendance, requests, salary records, and policies.</p>
                  </div>
                </div>
                <div>
                  <span><IconFingerprint size={21} /></span>
                  <div>
                    <strong>Employee workspace</strong>
                    <p>Check in, request leave, review reports, and access payslips.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.employeePreview}>
              <div className={styles.employeeTop}>
                <div>
                  <span className={styles.onlineDot} />
                  Employee workspace
                </div>
                <IconFingerprint size={22} />
              </div>
              <div className={styles.welcomeCard}>
                <div>
                  <span>Today&apos;s workday</span>
                  <h3>Good morning, Aarav.</h3>
                  <p>Your workday is ready when you are.</p>
                </div>
                <span className={styles.previewCheckIn}>
                  <IconFingerprint size={19} />
                  Check in
                </span>
              </div>
              <div className={styles.quickActionLabel}>Your workspace</div>
              <div className={styles.quickActions}>
                <div><span><IconCalendarCheck size={20} /></span><b>Attendance</b><small>Review records</small></div>
                <div><span><IconListCheck size={20} /></span><b>My leaves</b><small>Manage requests</small></div>
                <div><span><IconChartBar size={20} /></span><b>Reports</b><small>View insights</small></div>
                <div><span><IconWallet size={20} /></span><b>Payslips</b><small>Salary history</small></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.workflowSection} id="workflow">
        <div className={styles.container}>
          <div className={styles.sectionIntro}>
            <span className={styles.sectionLabel}>A simpler operating rhythm</span>
            <h2>From setup to insight in one connected flow.</h2>
          </div>
          <div className={styles.workflowGrid}>
            {workflow.map((step) => (
              <article className={styles.workflowCard} key={step.number}>
                <span>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.ctaSection}>
        <div className={styles.container}>
          <div className={styles.ctaCard}>
            <div className={styles.ctaGlow} />
            <div>
              <span className={styles.ctaLabel}>Ready for a clearer workday?</span>
              <h2>Bring your workforce into one organized system.</h2>
              <p>
                Access the workspace built for your role and keep the whole
                organization moving together.
              </p>
            </div>
            <div className={styles.ctaActions}>
              <Link href="/admin/sign-in" className={styles.ctaPrimary}>
                Company login
                <IconArrowRight size={18} />
              </Link>
              <Link href="/sign-in" className={styles.ctaSecondary}>
                Employee login
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerTop}>
            <div>
              <Link href="/" className={styles.footerBrand}>
                <Image
                  src="/images/brand/logo/android-chrome-192x192.png"
                  alt=""
                  width={35}
                  height={35}
                />
                AttendStack
              </Link>
              <p>Modern workforce management for organized, productive teams.</p>
            </div>
            <div className={styles.footerLinks}>
              <a href="#platform">Platform</a>
              <a href="#features">Capabilities</a>
              <a href="#workflow">How it works</a>
              <Link href="/sign-in">Employee login</Link>
              <Link href="/admin/sign-in">Company login</Link>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <span>&copy; {new Date().getFullYear()} AttendStack. All rights reserved.</span>
            <span>
              A{" "}
              <a href="https://bhattsquare.com" target="_blank" rel="noopener noreferrer">
                Bhatt Square
              </a>{" "}
              project.
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}
