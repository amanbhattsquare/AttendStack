import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  IconArrowRight,
  IconBrandLinkedin,
  IconBuilding,
  IconCheck,
  IconCode,
  IconExternalLink,
  IconShieldCheck,
  IconTarget,
  IconUsers,
} from "@tabler/icons-react";
import MarketingFooter from "components/marketing/MarketingFooter";
import MarketingHeader from "components/marketing/MarketingHeader";
import styles from "../marketing-pages.module.css";

export const metadata: Metadata = {
  title: "About AttendStack | A Product of Bhatt Square Pvt. Ltd.",
  description:
    "Discover AttendStack, a Bhatt Square Pvt. Ltd. workforce management project developed by Aman Katiyar to bring clarity to everyday people operations.",
};

const principles = [
  {
    icon: IconTarget,
    title: "Operational clarity",
    description:
      "Every workflow is designed to make responsibilities, activity, and next steps easier to understand.",
  },
  {
    icon: IconUsers,
    title: "People-first workflows",
    description:
      "Focused company and employee experiences keep everyday workforce tasks direct, relevant, and accessible.",
  },
  {
    icon: IconShieldCheck,
    title: "Reliable by design",
    description:
      "Structured records and role-aware access help teams operate with confidence and maintain dependable information.",
  },
];

export default function AboutPage() {
  return (
    <main className={styles.page}>
      <MarketingHeader />

      <section className={styles.pageHero}>
        <div className={styles.container}>
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <span className={styles.eyebrow}>
                <span />
                About AttendStack
              </span>
              <h1>
                Workforce operations, built for <span>clarity and control.</span>
              </h1>
              <p>
                AttendStack is a professional workforce management platform and
                Bhatt Square Pvt. Ltd. project that connects attendance,
                employee records, leave, and payroll visibility in one
                organized experience.
              </p>
              <div className={styles.heroActions}>
                <Link href="/sign-in" className={styles.primaryAction}>
                  Employee login
                  <IconArrowRight size={18} />
                </Link>
                <Link href="/capabilities" className={styles.secondaryAction}>
                  Explore capabilities
                </Link>
              </div>
            </div>

            <div className={styles.aboutVisual}>
              <div className={styles.identityCard}>
                <div className={styles.identityLogo}>
                  <Image
                    src="/images/brand/logo/android-chrome-192x192.png"
                    alt="AttendStack"
                    width={58}
                    height={58}
                  />
                  <span>
                    <strong>AttendStack</strong>
                    <small>A product of Bhatt Square Pvt. Ltd.</small>
                  </span>
                </div>
                <h2>A more dependable way to manage the modern workday.</h2>
                <p>
                  Purpose-built to help growing teams replace fragmented
                  processes with clear workflows and useful workforce insight.
                </p>
                <span className={styles.identityBadge}>
                  <IconBuilding size={16} />
                  A Bhatt Square Pvt. Ltd. workforce technology project
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.sectionHeadingCentered}>
            <span className={styles.sectionLabel}>Our product principles</span>
            <h2>Professional software should make work feel simpler.</h2>
            <p>
              AttendStack brings thoughtful structure to daily operations while
              keeping the experience clear for every role.
            </p>
          </div>
          <div className={styles.valuesGrid}>
            {principles.map((principle) => {
              const PrincipleIcon = principle.icon;
              return (
                <article className={styles.valueCard} key={principle.title}>
                  <span className={styles.cardIcon}>
                    <PrincipleIcon size={23} strokeWidth={1.8} />
                  </span>
                  <h3>{principle.title}</h3>
                  <p>{principle.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className={styles.softSection}>
        <div className={styles.container}>
          <div className={styles.storyGrid}>
            <div className={styles.storyPanel}>
              <div>
                <span>Our product belief</span>
                <blockquote>
                  The best workforce systems turn everyday activity into clear,
                  dependable operational insight.
                </blockquote>
                <small>AttendStack, a Bhatt Square Pvt. Ltd. project</small>
              </div>
            </div>
            <div className={styles.storyCopy}>
              <span className={styles.sectionLabel}>Why AttendStack exists</span>
              <h2>To make the everyday work of running a team feel simpler.</h2>
              <p>
                Workforce information is often spread across messages,
                spreadsheets, paper records, and disconnected tools. AttendStack
                brings those signals into one structured platform, giving
                companies stronger visibility and employees a reliable place to
                manage their workday.
              </p>
              <div className={styles.checkList}>
                <div><span><IconCheck size={13} /></span>A connected home for workforce operations</div>
                <div><span><IconCheck size={13} /></span>Role-focused company and employee experiences</div>
                <div><span><IconCheck size={13} /></span>Live attendance and operational visibility</div>
                <div><span><IconCheck size={13} /></span>Structured records that support better decisions</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.attributionCard}>
            <div className={styles.attributionIntro}>
              <span className={styles.sectionLabel}>Product ownership</span>
              <h2>A focused workforce product, built with purpose.</h2>
              <p>
                AttendStack is a Bhatt Square Pvt. Ltd. project created to
                deliver a polished, dependable, and scalable foundation for
                modern workforce operations.
              </p>
            </div>
            <div className={styles.attributionDetails}>
              <div className={styles.attributionItem}>
                <span className={styles.attributionIcon}>
                  <IconBuilding size={22} strokeWidth={1.8} />
                </span>
                <div>
                  <small>Product of</small>
                  <a
                    href="https://bhattsquare.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.companyLink}
                  >
                    Bhatt Square Pvt. Ltd.
                    <IconExternalLink size={15} />
                  </a>
                  <p>Workforce technology designed for organized teams.</p>
                </div>
              </div>
              <div className={styles.attributionItem}>
                <span className={styles.attributionIcon}>
                  <IconCode size={22} strokeWidth={1.8} />
                </span>
                <div>
                  <small>Developed by</small>
                  <a
                    href="https://in.linkedin.com/in/amanktyr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.developerLink}
                  >
                    Aman Katiyar
                    <IconBrandLinkedin size={16} />
                  </a>
                  <p>Product engineering and development.</p>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.productBand}>
            <div><strong>2</strong><span>Focused role-based workspaces</span></div>
            <div><strong>1</strong><span>Connected workforce system</span></div>
            <div><strong>Live</strong><span>Attendance and activity visibility</span></div>
            <div><strong>Clear</strong><span>Records, reports, and workflows</span></div>
          </div>
        </div>
      </section>

      <section className={styles.ctaSection}>
        <div className={styles.container}>
          <div className={styles.ctaCard}>
            <div>
              <span className={styles.sectionLabel}>Start your workday</span>
              <h2>Access the AttendStack workspace built for your role.</h2>
              <p>
                Employees can check attendance and records, while company teams
                can manage workforce operations from one connected platform.
              </p>
            </div>
            <div className={styles.ctaActions}>
              <Link href="/sign-in" className={styles.ctaPrimary}>Employee login</Link>
              <Link href="/admin/sign-in" className={styles.ctaSecondary}>Company login</Link>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
