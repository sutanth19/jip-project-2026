import { Mail, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

import Container from "@/components/common/Container";

const quickLinks = [
  { label: "Home", to: "/" },
  { label: "About", to: "/#about" },
  { label: "Features", to: "/#features" },
  { label: "FAQ", to: "/#faq" },
  { label: "Contact", to: "/contact" },
] as const;

const platformLinks = [
  { label: "Login", to: "/login" },
  { label: "Register", to: "/register" },
  { label: "Privacy Policy", to: "/privacy" },
  { label: "Terms of Service", to: "/terms" },
] as const;

const linkClassName =
  "text-muted-foreground transition-colors hover:text-foreground";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <Container className="py-10 md:py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          <div>
            <Link
              to="/"
              className="mb-4 inline-flex text-xl font-bold tracking-wide text-foreground transition-colors hover:text-primary"
            >
              DIGITAL MAIN-LiT
            </Link>
            <p className="max-w-sm text-sm leading-6 text-muted-foreground">
              Sistem pengurusan literasi sekolah moden yang membantu pentadbir, guru, murid dan ibu bapa mengurus aktiviti bacaan,
              koleksi buku serta program literasi melalui satu platform digital bersepadu.
            </p>
          </div>

          <div>
            <h2 className="mb-4 text-sm font-semibold tracking-wider text-foreground uppercase">
              PAUTAN PANTAS
            </h2>
            <ul className="space-y-3">
              {quickLinks.map(({ label, to }) => (
                <li key={label}>
                  <Link to={to} className={linkClassName}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="mb-4 text-sm font-semibold tracking-wider text-foreground uppercase">
              MODUL SISTEM
            </h2>
            <ul className="space-y-3">
              {platformLinks.map(({ label, to }) => (
                <li key={label}>
                  <Link to={to} className={linkClassName}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="mb-4 text-sm font-semibold tracking-wider text-foreground uppercase">
              Hubungi Kami
            </h2>
            <ul className="space-y-3">
              <li>
                <a
                  href="mailto:support@digitalmainlit.my"
                  className={`flex items-start gap-3 ${linkClassName}`}
                >
                  <Mail className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                  <span>mainlitipg@gmail.com</span>
                </a>
              </li>
              <li>
                <a
                  href="tel:+60123456789"
                  className={`flex items-start gap-3 ${linkClassName}`}
                >
                  
                </a>
              </li>
              <li className="flex items-start gap-3 text-muted-foreground">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                <span>Malaysia</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6 text-center text-sm text-muted-foreground">
          <p>©️ 2026 DIGITAL MAIN-LiT.</p>
          <p>All rights reserved.</p>
        </div>
      </Container>
    </footer>
  );
}
