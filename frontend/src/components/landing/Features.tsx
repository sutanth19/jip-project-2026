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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getLandingCardTone } from "@/components/landing/card-tone";

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
    <section id="features" className="bg-background">
      <Container className="py-10 md:py-14 lg:py-16">
        <div className="mx-auto max-w-5xl text-center">
          <span className="mb-4 inline-flex rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
            Platform Features
          </span>
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Everything Schools Need in One Platform
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            Digital MoLIB combines library management, literacy programmes,
            student progress tracking, and reporting into one integrated system
            designed for modern schools.
          </p>
        </div>

        <div className="mt-8 grid gap-5 md:mt-10 md:grid-cols-2 md:gap-6 xl:grid-cols-4">
          {platformFeatures.map(({ title, description, icon: Icon }, index) => {
            const tone = getLandingCardTone(index)

            return (
              <Card
                key={title}
                size="sm"
                className={`group h-full rounded-2xl bg-card shadow-sm ring-0 transition duration-300 hover:-translate-y-1 hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none ${tone.cardClassName}`}
              >
                <CardHeader className="pb-3">
                  <div
                    className={`mb-4 flex size-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none ${tone.iconContainerClassName}`}
                  >
                    <Icon className={`size-6 ${tone.iconClassName}`} aria-hidden="true" />
                  </div>
                  <CardTitle className="text-lg font-semibold leading-snug sm:text-xl">
                    {title}
                  </CardTitle>
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
