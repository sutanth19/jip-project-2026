import * as React from "react";
import { useSearchParams } from "react-router-dom";

import type { AdminListQuery } from "@/features/admin/types/admin.types";

export function useAdminQueryState() {
  const [searchParams, setSearchParams] = useSearchParams();

  const query = React.useMemo<AdminListQuery>(
    () => ({
      page: Number(searchParams.get("page") ?? "1"),
      limit: Number(searchParams.get("limit") ?? "10"),
      search: searchParams.get("search") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      sortBy: searchParams.get("sortBy") ?? undefined,
      sortOrder: searchParams.get("sortOrder") === "asc" ? "asc" : "desc",
    }),
    [searchParams],
  );

  const updateQuery = React.useCallback(
    (patch: AdminListQuery) => {
      const next = new URLSearchParams(searchParams);

      Object.entries(patch).forEach(([key, value]) => {
        if (value === undefined || value === "") {
          next.delete(key);
          return;
        }

        next.set(key, String(value));
      });

      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  return { query, updateQuery };
}
