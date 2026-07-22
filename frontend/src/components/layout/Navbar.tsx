import { useState } from "react";
import { Link } from "react-router-dom";

import Logo from "@/components/common/Logo";
import { navigation } from "@/config/navigation";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed z-50 w-full">
      <nav className="border-b border-[var(--border)] bg-[var(--surface)] py-2.5">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between px-6">
          <Link to="/" aria-label="Literasi Digital home">
            <Logo size="md" />
          </Link>

          <div className="flex items-center lg:gap-8">
            <ul className="hidden items-center gap-8 font-medium lg:flex">
              {navigation.map((item, index) => (
                <li key={item.label}>
                  <Link
                    to={item.href}
                    aria-current={index === 0 ? "page" : undefined}
                    className={
                      index === 0
                        ? "text-[var(--primary)]"
                        : "text-[var(--text)]/70 transition-colors hover:text-[var(--primary)]"
                    }
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              to="/login"
              className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--surface)] hover:bg-[var(--primary)]/90 focus:ring-4 focus:ring-[var(--primary)]/20 focus:outline-none lg:px-5 lg:py-2.5"
            >
              Log Masuk
            </Link>
            <button
              type="button"
              className="ml-1 inline-flex items-center rounded-xl p-2 text-sm text-[var(--text)]/70 hover:bg-[var(--background)] focus:ring-2 focus:ring-[var(--primary)]/20 focus:outline-none lg:hidden"
              aria-controls="mobile-menu-2"
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((open) => !open)}
            >
              <span className="sr-only">Buka menu utama</span>
              {isMenuOpen ? (
                <svg
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          </div>

          <div
            className={`${isMenuOpen ? "flex" : "hidden"} w-full items-center justify-between lg:hidden`}
            id="mobile-menu-2"
          >
            <ul className="mt-4 flex w-full flex-col font-medium lg:mt-0 lg:w-auto lg:flex-row lg:space-x-8">
              {navigation.map((item, index) => (
                <li key={item.label}>
                  <Link
                    to={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    aria-current={index === 0 ? "page" : undefined}
                    className={
                      index === 0
                        ? "block rounded-xl bg-[var(--primary)] py-2 pr-4 pl-3 text-[var(--surface)]"
                        : "block border-b border-[var(--border)] py-2 pr-4 pl-3 text-[var(--text)]/70 hover:bg-[var(--background)] hover:text-[var(--primary)]"
                    }
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </nav>
    </header>
  );
}
