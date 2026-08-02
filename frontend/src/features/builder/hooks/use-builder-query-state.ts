import * as React from "react";
import { useSearchParams } from "react-router-dom";

import type { BuilderQuery } from "@/features/builder/types/builder.types";

export function useBuilderQueryState() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = React.useMemo<BuilderQuery>(
    () => ({
      page: Number(searchParams.get("page") ?? "1"),
      limit: Number(searchParams.get("limit") ?? "20"),
      search: searchParams.get("search") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      programmeId: searchParams.get("programmeId") ?? undefined,
      contentStandardId: searchParams.get("contentStandardId") ?? undefined,
      remedialSkillId: searchParams.get("remedialSkillId") ?? undefined,
      sortOrder: searchParams.get("sortOrder") === "asc" ? "asc" : "desc",
    }),
    [searchParams],
  );

  const updateQuery = React.useCallback(
    (patch: BuilderQuery) => {
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

  return { query, updateQuery, searchParams };
}

