import { School } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export function SchoolBadge({ name }: { name: string }) {
  return (
    <Badge variant="outline" className="gap-1">
      <School className="size-3" aria-hidden="true" />
      {name}
    </Badge>
  );
}

