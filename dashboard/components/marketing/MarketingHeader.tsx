import Image from "next/image";
import Link from "next/link";
import { IconArrowUpRight, IconLogin2 } from "@tabler/icons-react";
import styles from "./marketing.module.css";

export default function MarketingHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
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
          <span className={styles.brandCopy}>
            <strong>AttendStack</strong>
            <small>A product of Bhatt Square</small>
          </span>
        </Link>

        <nav className={styles.navLinks} aria-label="Website navigation">
          <Link href="/">Home</Link>
          <Link href="/about">About us</Link>
          <Link href="/capabilities">Capabilities</Link>
          <Link href="/#workflow">How it works</Link>
        </nav>

        <div className={styles.navActions}>
          <Link href="/admin/sign-in" className={styles.companyLogin}>
            Company login
          </Link>
          <Link href="/sign-in" className={styles.employeeLogin}>
            <IconLogin2 size={17} strokeWidth={2} />
            Employee login
            <IconArrowUpRight size={15} strokeWidth={2} />
          </Link>
        </div>
      </div>
    </header>
  );
}
