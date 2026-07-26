export type LandingCardTone = {
  cardClassName: string
  iconContainerClassName: string
  iconClassName: string
}

const landingCardTones: LandingCardTone[] = [
  {
    cardClassName: "border border-primary/25 hover:border-primary/40",
    iconContainerClassName: "border border-primary/20 bg-primary/10",
    iconClassName: "text-primary",
  },
  {
    cardClassName: "border border-secondary/40 hover:border-secondary/50",
    iconContainerClassName: "border border-secondary/40 bg-secondary",
    iconClassName: "text-secondary-foreground",
  },
  {
    cardClassName: "border border-accent/40 hover:border-accent/50",
    iconContainerClassName: "border border-accent/40 bg-accent",
    iconClassName: "text-accent-foreground",
  },
  {
    cardClassName: "border border-border hover:border-primary/20",
    iconContainerClassName: "border border-border bg-muted",
    iconClassName: "text-primary",
  },
]

export function getLandingCardTone(index: number): LandingCardTone {
  return landingCardTones[index % landingCardTones.length]
}
