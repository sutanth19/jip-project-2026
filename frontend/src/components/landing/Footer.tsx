import { Mail, MapPin, Phone } from "lucide-react";
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
  "text-[var(--text)]/70 transition-colors hover:text-[var(--primary)]";

export default function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
      <Container className="py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          <div>
            <Link
              to="/"
              className="mb-5 inline-flex text-2xl font-bold text-[var(--text)] transition-colors hover:text-[var(--primary)]"
            >
              Digital MoLIB
            </Link>
            <p className="max-w-sm font-light leading-relaxed text-[var(--text)]/70">
              A modern School Literacy Management System that empowers
              administrators, teachers, students, and parents through one
              integrated digital platform.
            </p>
          </div>

          <div>
            <h2 className="mb-6 text-sm font-semibold tracking-wider text-[var(--text)] uppercase">
              Quick Links
            </h2>
            <ul className="space-y-4">
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
            <h2 className="mb-6 text-sm font-semibold tracking-wider text-[var(--text)] uppercase">
              Platform
            </h2>
            <ul className="space-y-4">
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
            <h2 className="mb-6 text-sm font-semibold tracking-wider text-[var(--text)] uppercase">
              Contact
            </h2>
            <ul className="space-y-4">
              <li>
                <a
                  href="mailto:support@digitalmolib.my"
                  className={`flex items-start gap-3 ${linkClassName}`}
                >
                  <Mail className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                  <span>support@digitalmolib.my</span>
                </a>
              </li>
              <li>
                <a
                  href="tel:+60123456789"
                  className={`flex items-start gap-3 ${linkClassName}`}
                >
                  <Phone className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                  <span>+60 12-345 6789</span>
                </a>
              </li>
              <li className="flex items-start gap-3 text-[var(--text)]/70">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                <span>Malaysia</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-[var(--border)] pt-8 text-center text-sm text-[var(--text)]/70">
          <p>© 2026 Digital MoLIB.</p>
          <p>All rights reserved.</p>
        </div>
      </Container>
    </footer>
  );
}
