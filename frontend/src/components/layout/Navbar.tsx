import { useState } from "react";
import { Link } from "react-router-dom";

import Logo from "@/components/common/Logo";
import { navigation } from "@/config/navigation";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full">
      <nav className="border-b border-border bg-background/95 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/90">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/" aria-label="Digital Main-LiT home">
            <Logo size="md" />
          </Link>

          <div className="flex items-center gap-3 lg:gap-8">
            <ul className="hidden items-center gap-8 text-base font-medium lg:flex">
              {navigation.map((item, index) => (
                <li key={item.label}>
                  <Link
                    to={item.href}
                    aria-current={index === 0 ? "page" : undefined}
                    className={
                      index === 0
                        ? "text-primary"
                        : "text-muted-foreground transition-colors hover:text-foreground"
                    }
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              to="/login"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:text-base lg:px-6"
            >
              Log Masuk
            </Link>
            <button
              type="button"
              className="ml-1 inline-flex h-11 items-center justify-center rounded-xl p-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 lg:hidden"
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
            <ul className="mt-4 flex w-full flex-col gap-1 rounded-2xl border border-border bg-card p-2 font-medium shadow-sm lg:mt-0 lg:w-auto lg:flex-row lg:space-x-8 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
              {navigation.map((item, index) => (
                <li key={item.label}>
                  <Link
                    to={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    aria-current={index === 0 ? "page" : undefined}
                    className={
                      index === 0
                        ? "block rounded-xl bg-primary px-3 py-2 text-primary-foreground"
                        : "block rounded-xl px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
