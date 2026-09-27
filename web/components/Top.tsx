"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAccounts } from "@/app/providers";

const ROLES = [
  { href: "/activity", match: ["/activity", "/send"], label: "You" },
  { href: "/family", match: ["/family"], label: "Jiwoo" },
  { href: "/shop", match: ["/shop"], label: "Shop" },
];

/** Demo role switch: one device plays the sender, the family member and a shop. */
export function Roles() {
  const path = usePathname();
  return (
    <nav className="roles" aria-label="Play as">
      {ROLES.map((r) => (
        <Link key={r.href} href={r.href} aria-current={r.match.some((m) => path.startsWith(m)) ? "page" : undefined}>
          {r.label}
        </Link>
      ))}
    </nav>
  );
}

export function Top({ left }: { left: React.ReactNode }) {
  return (
    <div className="top">
      <span className="who">{left}</span>
      <Roles />
    </div>
  );
}

/** Pages behind sign-in send you back to the welcome screen. */
export function useSignedIn() {
  const { accounts, ready } = useAccounts();
  const router = useRouter();
  useEffect(() => {
    if (ready && !accounts) router.replace("/app");
  }, [ready, accounts, router]);
  return accounts;
}
