import {
  BarChart3,
  Bell,
  CalendarDays,
  LayoutDashboard,
  Library,
  RefreshCw,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

import Container from "@/components/common/Container";

type PlatformFeature = {
  title: string;
  description: string;
  icon: LucideIcon;
};

const platformFeatures: PlatformFeature[] = [
  {
    title: "Digital Book Catalogue",
    description: "Manage physical and digital book collections.",
    icon: Library,
  },
  {
    title: "Borrowing Management",
    description: "Track borrowing, returns, and overdue books.",
    icon: RefreshCw,
  },
  {
    title: "Reading Progress",
    description: "Monitor students' reading achievements and milestones.",
    icon: TrendingUp,
  },
  {
    title: "Literacy Programmes",
    description: "Organise reading campaigns and literacy activities.",
    icon: CalendarDays,
  },
  {
    title: "Teacher Dashboard",
    description:
      "Manage students, books, and literacy programmes efficiently.",
    icon: LayoutDashboard,
  },
  {
    title: "Parent Portal",
    description: "Allow parents to monitor reading activities and progress.",
    icon: Users,
  },
  {
    title: "Reports & Analytics",
    description: "Generate detailed literacy and library reports.",
    icon: BarChart3,
  },
  {
    title: "Notifications",
    description:
      "Send reminders for borrowing, events, and reading activities.",
    icon: Bell,
  },
];

export default function Features() {
  return (
    <section id="features" className="bg-[var(--surface)]">
      <Container className="py-24">
        <div className="mx-auto mb-8 max-w-3xl text-center lg:mb-12">
          <span className="mb-4 inline-flex rounded-full bg-[var(--primary)]/10 px-4 py-1.5 text-sm font-semibold text-[var(--primary)]">
            Platform Features
          </span>
          <h2 className="mb-4 text-3xl font-extrabold tracking-tight text-[var(--text)] md:text-4xl">
            Everything Schools Need in One Platform
          </h2>
          <p className="font-light text-[var(--text)]/70 sm:text-xl">
            Digital MoLIB combines library management, literacy programmes,
            student progress tracking, and reporting into one integrated system
            designed for modern schools.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 xl:gap-8">
          {platformFeatures.map(({ title, description, icon: Icon }) => (
            <article
              key={title}
              className="group rounded-2xl border border-[var(--border)] bg-[var(--background)] p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[var(--primary)] hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none xl:p-8"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="mb-3 text-xl font-semibold text-[var(--text)]">
                {title}
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
