import { Search, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { accountStatuses } from "@/features/admin/config";
import { useDebouncedSearchInput } from "@/features/admin/hooks/use-debounced-search-input";
import type { AdminEntityConfig, AdminListQuery } from "@/features/admin/types/admin.types";
import { adminStatusFilterOptions } from "@/features/admin/utils/admin-status";
import { cn } from "@/lib/utils";

type AdminFilterBarProps = {
  config: AdminEntityConfig;
  query: AdminListQuery;
  onChange: (query: AdminListQuery) => void;
  searchPlaceholder?: string;
  plain?: boolean;
  useAdminStatusSelect?: boolean;
};

export function AdminFilterBar({
  config,
  query,
  onChange,
  searchPlaceholder,
  plain = false,
  useAdminStatusSelect = false,
}: AdminFilterBarProps) {
  const nativeOptions = accountStatuses;
  const {
    searchInput,
    handleSearchInputChange,
    resetSearchInput,
  } = useDebouncedSearchInput({ value: query.search, onChange });

  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center",
        plain ? "mt-6" : "rounded-lg border border-border bg-card p-3",
      )}
    >
      {config.searchable ? (
        <label className="relative flex-1">
          <span className="sr-only">Cari {config.title}</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={handleSearchInputChange}
            placeholder={searchPlaceholder ?? `Cari ${config.title.toLowerCase()}...`}
            className="!bg-background/40 pl-9 text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
          />
        </label>
      ) : null}
      {config.statusFilter ? (
        <label className="w-full text-sm sm:w-auto">
          <span className="sr-only">Status</span>
          {useAdminStatusSelect ? (
            <Select
              value={query.status ?? "all"}
              onValueChange={(value) => onChange({ status: value === "all" ? undefined : value, page: 1 })}
            >
              <SelectTrigger className="!bg-background/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {adminStatusFilterOptions.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <select
              value={query.status ?? ""}
              onChange={(event) => onChange({ status: event.target.value || undefined, page: 1 })}
              className="h-9 w-full rounded-lg border border-input bg-background/40 px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/20 sm:w-auto"
            >
              <option value="">Semua status</option>
              {nativeOptions.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          )}
        </label>
      ) : null}
      <Button
        type="button"
        variant="outline"
        className="w-full sm:w-auto"
        onClick={() => {
          resetSearchInput();
          onChange({ search: undefined, status: undefined, page: 1 });
        }}
      >
        <SlidersHorizontal className="size-4" aria-hidden="true" />
        Reset
      </Button>
    </div>
  );
}
