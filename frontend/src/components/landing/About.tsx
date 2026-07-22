import {
  BookOpen,
  ChartNoAxesCombined,
  School,
  Users,
  type LucideIcon,
} from "lucide-react";

import Container from "@/components/common/Container";

type Feature = {
  title: string;
  description: string;
  icon: LucideIcon;
};

const features: Feature[] = [
  {
    title: "Digital Library",
    description:
      "Manage books, categories, borrowing, and digital resources efficiently.",
    icon: BookOpen,
  },
  {
    title: "Reading Progress",
    description:
      "Track students' reading records, achievements, and literacy performance.",
    icon: ChartNoAxesCombined,
  },
  {
    title: "School Management",
    description:
      "Support teachers and administrators with book management, reports, and programme administration.",
    icon: School,
  },
  {
    title: "Parent Engagement",
    description:
      "Allow parents to monitor their children's reading activities and progress.",
    icon: Users,
  },
];

export default function About() {
  return (
    <section id="about" className="bg-[var(--background)]">
      <Container className="py-20">
        <div className="mx-auto mb-8 max-w-3xl text-center lg:mb-12">
          <h2 className="mb-4 text-3xl font-extrabold tracking-tight text-[var(--text)]">
            Why Choose Digital MoLIB?
          </h2>
          <p className="font-light text-[var(--text)]/70 sm:text-xl">
            Digital MoLIB provides a complete digital ecosystem for school
            literacy programmes. It helps schools manage books, reading
            activities, literacy competitions, student progress, and reporting
            efficiently from a single platform.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4 xl:gap-8">
          {features.map(({ title, description, icon: Icon }) => (
            <article
              key={title}
              className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--primary)]/20 hover:shadow-lg xl:p-8"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
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
