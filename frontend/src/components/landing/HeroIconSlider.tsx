import {
  Bell,
  BookOpen,
  ChartNoAxesCombined,
  GraduationCap,
  Headphones,
  Languages,
  Mic,
  PencilLine,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";

import InfiniteSlider from "@/components/ui/infinite-slider";
import { cn } from "@/lib/utils";

type HeroIconItem = {
  icon: LucideIcon;
  name: string;
};

const heroIconItems: HeroIconItem[] = [
  { icon: BookOpen, name: "BookOpen" },
  { icon: Mic, name: "Mic" },
  { icon: PencilLine, name: "PencilLine" },
  { icon: Headphones, name: "Headphones" },
  { icon: ChartNoAxesCombined, name: "ChartNoAxesCombined" },
  { icon: Trophy, name: "Trophy" },
  { icon: GraduationCap, name: "GraduationCap" },
  { icon: Users, name: "Users" },
  { icon: Bell, name: "Bell" },
  { icon: Languages, name: "Languages" },
];

const heroIconTones = [
  {
    tileClassName: "border border-primary/25 bg-primary/10 text-primary",
    iconClassName: "text-primary",
  },
  {
    tileClassName: "border border-secondary/25 bg-secondary/10 text-secondary",
    iconClassName: "text-secondary",
  },
  {
    tileClassName: "border border-accent/25 bg-accent/10 text-accent",
    iconClassName: "text-accent",
  },
  {
    tileClassName: "border border-border bg-muted text-primary",
    iconClassName: "text-primary",
  },
] as const;

export default function HeroIconSlider() {
  return (
    <div
      aria-label="Digital MoLIB learning tools"
      role="region"
      className="relative mt-8 pb-2 md:mt-10"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-background via-background/80 to-transparent md:w-12"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-background via-background/80 to-transparent md:w-12"
      />

      <InfiniteSlider gap={14} duration={24} className="w-full">
        {heroIconItems.map(({ icon: Icon, name }, index) => {
          const tone = heroIconTones[index % heroIconTones.length];

          return (
            <div
              key={name}
              className={cn(
                "flex size-12 shrink-0 items-center justify-center rounded-xl shadow-sm transition-[transform,box-shadow,filter] duration-200 hover:-translate-y-0.5 hover:shadow-md hover:brightness-105",
                tone.tileClassName,
              )}
            >
              <Icon
                className={cn("size-5", tone.iconClassName)}
                aria-hidden="true"
              />
            </div>
          );
        })}
      </InfiniteSlider>
    </div>
  );
}
