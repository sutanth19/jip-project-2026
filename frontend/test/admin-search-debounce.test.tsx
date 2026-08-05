import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { AdminFilterBar } from "@/features/admin/components/AdminFilterBar";
import { SchoolListContent } from "@/features/admin/components/SchoolList";
import { TeacherListContent } from "@/features/admin/components/TeacherList";
import { getAdminEntity } from "@/features/admin/config";
import type { AdminListQuery } from "@/features/admin/types/admin.types";
import {
  ADMIN_SEARCH_DEBOUNCE_MS,
  buildSearchPatch,
  createDebouncedSearchApplier,
} from "@/features/admin/utils/debounced-search";

afterEach(() => {
  vi.useRealTimers();
});

describe("Admin management search focus stability", () => {
  it("debounces query updates while applying only the final rapid search value", () => {
    vi.useFakeTimers();
    const apply = vi.fn<(patch: AdminListQuery) => void>();
    const debouncer = createDebouncedSearchApplier(apply);

    debouncer.schedule("S");
    vi.advanceTimersByTime(100);
    debouncer.schedule("Su");
    vi.advanceTimersByTime(100);
    debouncer.schedule("Sut");
    vi.advanceTimersByTime(100);
    debouncer.schedule("Sutanth");

    expect(apply).not.toHaveBeenCalled();

    vi.advanceTimersByTime(ADMIN_SEARCH_DEBOUNCE_MS);

    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledWith({ search: "Sutanth", page: 1 });
  });

  it("clears search through the debounce patch and cancels pending timers on cleanup", () => {
    vi.useFakeTimers();
    const apply = vi.fn<(patch: AdminListQuery) => void>();
    const debouncer = createDebouncedSearchApplier(apply);

    expect(buildSearchPatch("")).toEqual({ search: undefined, page: 1 });

    debouncer.schedule("Sekolah");
    debouncer.cancel();
    vi.advanceTimersByTime(ADMIN_SEARCH_DEBOUNCE_MS);
    expect(apply).not.toHaveBeenCalled();

    debouncer.schedule("");
    vi.advanceTimersByTime(ADMIN_SEARCH_DEBOUNCE_MS);
    expect(apply).toHaveBeenCalledWith({ search: undefined, page: 1 });
  });

  it("uses the shared stable local search input in Pentadbir, Sekolah, and Guru filters", () => {
    const adminFilter = readFileSync(new URL("../src/features/admin/components/AdminFilterBar.tsx", import.meta.url), "utf8");
    const schoolList = readFileSync(new URL("../src/features/admin/components/SchoolList.tsx", import.meta.url), "utf8");
    const teacherList = readFileSync(new URL("../src/features/admin/components/TeacherList.tsx", import.meta.url), "utf8");

    [adminFilter, schoolList, teacherList].forEach((source) => {
      expect(source).toContain("useDebouncedSearchInput({ value: query.search, onChange })");
      expect(source).toContain("value={searchInput}");
      expect(source).toContain("onChange={handleSearchInputChange}");
      expect(source).toContain("resetSearchInput();");
      expect(source).not.toContain("value={query.search ?? \"\"}");
      expect(source).not.toContain("<Input key=");
    });
  });

  it("keeps the Sekolah and Guru search toolbars mounted while result loading renders", () => {
    const schoolMarkup = renderToStaticMarkup(
      <MemoryRouter>
        <SchoolListContent
          rows={[]}
          meta={{ page: 1, limit: 10, total: 0, totalPages: 1 }}
          query={{ page: 2, limit: 10, search: "SKA", status: "ACTIVE" }}
          path="/admin/sekolah"
          isLoading={true}
          isError={false}
          canCreate={true}
          onQueryChange={() => undefined}
          onRetry={() => undefined}
        />
      </MemoryRouter>,
    );
    const teacherMarkup = renderToStaticMarkup(
      <MemoryRouter>
        <TeacherListContent
          rows={[]}
          meta={{ page: 1, limit: 10, total: 0, totalPages: 1 }}
          query={{ page: 2, limit: 10, search: "Sutanth", status: "ACTIVE" }}
          path="/admin/guru"
          isLoading={true}
          isError={false}
          canCreate={true}
          onQueryChange={() => undefined}
          onRetry={() => undefined}
        />
      </MemoryRouter>,
    );

    expect(schoolMarkup).toContain("Cari sekolah mengikut nama, kod, pengetua, e-mel atau telefon.");
    expect(schoolMarkup).toContain("Reset");
    expect(schoolMarkup).toContain("Memuatkan senarai sekolah");
    expect(teacherMarkup).toContain("Cari guru mengikut nama, e-mel atau sekolah.");
    expect(teacherMarkup).toContain("Reset");
    expect(teacherMarkup).toContain("Memuatkan senarai guru");
  });

  it("keeps the Pentadbir filter mounted and locally valued without changing status filter markup", () => {
    const markup = renderToStaticMarkup(
      <AdminFilterBar
        config={getAdminEntity("admins")}
        query={{ page: 3, limit: 10, search: "Sutanth", status: "ACTIVE" }}
        onChange={() => undefined}
        searchPlaceholder="Cari pentadbir mengikut nama, e-mel, telefon atau status."
        plain
        useAdminStatusSelect
      />,
    );

    expect(markup).toContain("Cari pentadbir mengikut nama, e-mel, telefon atau status.");
    expect(markup).toContain('value="Sutanth"');
    expect(markup).toContain("Reset");
    expect(markup).toContain('role="combobox"');
  });
});
