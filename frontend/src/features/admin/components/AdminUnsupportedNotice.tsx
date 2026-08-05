import { Info } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { BackendCapability } from "@/features/admin/types/admin.types";

export function AdminUnsupportedNotice({ items }: { items: BackendCapability[] }) {
  if (!items.length) {
    return null;
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Info className="size-4 text-muted-foreground" aria-hidden="true" />
          Keupayaan backend belum tersedia
        </div>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {items.map((item) => (
            <li key={item.feature}>
              <span className="font-medium text-foreground">{item.feature}:</span> {item.note}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

