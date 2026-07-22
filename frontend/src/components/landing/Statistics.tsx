import {
  Clock3,
  LayoutGrid,
  PanelsTopLeft,
  Users,
  type LucideIcon,
} from "lucide-react";

import Container from "@/components/common/Container";

type Statistic = {
  value: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

const statistics: Statistic[] = [
  {
    value: "4",
    label: "User Roles",
    description: "Administrators, teachers, students, and parents.",
    icon: Users,
  },
  {
    value: "8",
    label: "Core Modules",
    description:
      "Library, borrowing, progress, programmes, reports, notifications, users, and dashboards.",
    icon: LayoutGrid,
  },
  {
    value: "1",
    label: "Integrated Platform",
    description:
      "All literacy operations managed from one central system.",
    icon: PanelsTopLeft,
  },
  {
    value: "24/7",
    label: "Digital Access",
    description:
      "Authorised users can access the platform whenever needed.",
    icon: Clock3,
  },
];

export default function Statistics() {
  return (
    <section className="bg-[var(--background)]">
      <Container className="py-20">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <span className="mb-4 inline-flex rounded-full bg-[var(--primary)]/10 px-4 py-1.5 text-sm font-semibold text-[var(--primary)]">
            Platform Overview
          </span>
          <h2 className="mb-4 text-3xl font-extrabold tracking-tight text-[var(--text)] md:text-4xl">
            One Connected Literacy Ecosystem
          </h2>
          <p className="font-light text-[var(--text)]/70 sm:text-xl">
            Digital MoLIB brings the essential areas of school literacy
            management together in one secure and organised platform.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 xl:gap-8">
          {statistics.map(({ value, label, description, icon: Icon }) => (
            <article
              key={label}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 transition duration-300 hover:-translate-y-1 hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none xl:p-8"
            >
              <Icon
                className="mb-5 h-10 w-10 text-[var(--primary)] md:h-12 md:w-12"
                aria-hidden="true"
              />
              <p className="mb-2 text-4xl font-extrabold tracking-tight text-[var(--text)]">
                {value}
              </p>
              <h3 className="mb-3 text-xl font-semibold text-[var(--text)]">
                {label}
              </h3>
              <p className="font-light leading-relaxed text-[var(--text)]/70">
                {description}
              </p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
