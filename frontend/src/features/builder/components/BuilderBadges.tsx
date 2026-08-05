import { Badge } from "@/components/ui/badge";

export function RendererBadge({ renderer }: { renderer: string }) {
  return <Badge variant="outline">{renderer}</Badge>;
}

export function SkillBadge({ label }: { label: string }) {
  return <Badge variant="secondary">{label}</Badge>;
}

export function CurriculumBadge({ label }: { label: string }) {
  return <Badge>{label}</Badge>;
}

