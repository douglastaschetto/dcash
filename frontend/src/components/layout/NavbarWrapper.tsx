"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "./Navbar";

export function NavbarWrapper() {
  const pathname = usePathname();
  const isPublicPage = pathname === "/login" || pathname === "/register";

  if (isPublicPage) return null;

  // IMPORTANTE: Retorne apenas a Navbar, sem divs em volta.
  return <Navbar />;
}