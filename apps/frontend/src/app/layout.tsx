import './globals.css'
import { NextAuthProvider } from "@/providers/NextAuthProvider";
import { NavbarWrapper } from "@/components/layout/NavbarWrapper";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <body className="bg-[#050505]">
        <NavbarWrapper />
        <main>{children}</main>
      </body>
    </html>
  );
}