import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { recordStatuses } from "@/features/builder/config";
import type { BuilderEntityConfig, BuilderQuery } from "@/features/builder/types/builder.types";

export function BuilderFilterBar({
  config,
  query,
  onChange,
}: {
  config: BuilderEntityConfig;
  query: BuilderQuery;
  onChange: (query: BuilderQuery) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 md:flex-row md:items-center">
      {config.searchable ? (
        <label className="relative flex-1">
          <span className="sr-only">Cari</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query.search ?? ""}
            placeholder={`Cari ${config.title.toLowerCase()}...`}
            className="pl-9"
            onChange={(event) => onChange({ search: event.target.value, page: 1 })}
          />
        </label>
      ) : null}
      {config.statusFilter ? (
        <select
          value={query.status ?? ""}
          className="h-9 rounded-lg border bg-background px-3 text-sm"
          onChange={(event) => onChange({ status: event.target.value || undefined, page: 1 })}
          aria-label="Tapis status"
        >
          <option value="">Semua status</option>
          {recordStatuses.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      ) : null}
      <Button type="button" variant="outline" onClick={() => onChange({ search: undefined, status: undefined, page: 1 })}>
        Reset
      </Button>
    </div>
  );
}

