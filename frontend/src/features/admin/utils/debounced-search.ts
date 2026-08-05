import type { AdminListQuery } from "@/features/admin/types/admin.types";

export const ADMIN_SEARCH_DEBOUNCE_MS = 350;

export function buildSearchPatch(value: string): AdminListQuery {
  return { search: value === "" ? undefined : value, page: 1 };
}

export function createDebouncedSearchApplier(
  apply: (patch: AdminListQuery) => void,
  delayMs = ADMIN_SEARCH_DEBOUNCE_MS,
) {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return {
    schedule(value: string) {
      if (timer) {
        clearTimeout(timer);
      }

      timer = setTimeout(() => {
        timer = null;
        apply(buildSearchPatch(value));
      }, delayMs);
    },
    cancel() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}
