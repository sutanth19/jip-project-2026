export type LandingCardTone = {
  cardClassName: string
  iconContainerClassName: string
  iconClassName: string
  monthBadgeClassName: string
}

const landingCardTones: LandingCardTone[] = [
  {
    cardClassName: "border border-primary/25 hover:border-primary/40",
    iconContainerClassName: "border border-primary/20 bg-primary/10",
    iconClassName: "text-primary",
    monthBadgeClassName: "border border-primary/15 bg-primary/10 text-primary",
  },
  {
    cardClassName: "border border-secondary/40 hover:border-secondary/50",
    iconContainerClassName: "border border-secondary/40 bg-secondary",
    iconClassName: "text-secondary-foreground",
    monthBadgeClassName: "border border-secondary/20 bg-secondary/10 text-secondary",
  },
  {
    cardClassName: "border border-accent/40 hover:border-accent/50",
    iconContainerClassName: "border border-accent/40 bg-accent",
    iconClassName: "text-accent-foreground",
    monthBadgeClassName: "border border-accent/20 bg-accent/10 text-accent",
  },
  {
    cardClassName: "border border-violet-200 hover:border-violet-300 dark:border-violet-500/35 dark:hover:border-violet-400/50",
    iconContainerClassName: "border border-violet-200 bg-violet-100 dark:border-violet-500/35 dark:bg-violet-500/15",
    iconClassName: "text-violet-700 dark:text-violet-300",
    monthBadgeClassName: "border border-violet-200 bg-violet-100 text-violet-700 dark:border-violet-500/35 dark:bg-violet-500/15 dark:text-violet-300",
  },
]

export function getLandingCardTone(index: number): LandingCardTone {
  return landingCardTones[index % landingCardTones.length]
}
