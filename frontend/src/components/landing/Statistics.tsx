import {
  Clock3,
  LayoutGrid,
  PanelsTopLeft,
  Users,
  type LucideIcon,
} from "lucide-react";

import Container from "@/components/common/Container";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getLandingCardTone } from "@/components/landing/card-tone";

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
    <section className="bg-muted/40">
      <Container className="py-10 md:py-14 lg:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <span className="mb-4 inline-flex rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
            Platform Overview
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-foreground text-balance sm:text-4xl lg:text-5xl">
            One Connected Literacy Ecosystem
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            Digital MoLIB brings the essential areas of school literacy
            management together in one secure and organised platform.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 md:mt-10 md:grid-cols-2 md:gap-6 xl:grid-cols-4">
          {statistics.map(({ value, label, description, icon: Icon }, index) => {
            const tone = getLandingCardTone(index)

            return (
              <Card
                key={label}
                size="sm"
                className={`h-full rounded-2xl bg-card shadow-sm ring-0 transition duration-300 hover:-translate-y-1 hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none ${tone.cardClassName}`}
              >
                <CardHeader className="pb-3">
                  <div
                    className={`mb-4 flex size-12 items-center justify-center rounded-xl ${tone.iconContainerClassName}`}
                  >
                    <Icon className={`size-6 ${tone.iconClassName}`} aria-hidden="true" />
                  </div>
                  <CardTitle className="text-4xl font-bold tracking-tight sm:text-5xl">
                    {value}
                  </CardTitle>
                  <h3 className="text-lg font-semibold leading-snug text-foreground sm:text-xl">
                    {label}
                  </h3>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-6 text-muted-foreground sm:text-base">
                    {description}
                  </CardDescription>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </Container>
    </section>
  );
}
