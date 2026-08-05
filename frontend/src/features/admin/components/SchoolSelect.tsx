import * as React from "react";
import { Building2, Check, ChevronDown, LoaderCircle, Search } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SchoolSelectOption } from "@/features/admin/utils/school-select";
import { cn } from "@/lib/utils";

function schoolInitials(name: string): string {
  return name
    .replace(/\([^)]*\)/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "S";
}

function SchoolLogo({ school }: { school: SchoolSelectOption }) {
  const [failedLogo, setFailedLogo] = React.useState<string | null>(null);
  const logoSrc = school.logo && failedLogo !== school.logo ? school.logo : undefined;

  if (logoSrc) {
    return (
      <img
        src={logoSrc}
        alt=""
        className="size-10 shrink-0 rounded-xl object-cover"
        onError={() => setFailedLogo(logoSrc)}
      />
    );
  }

  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-sm font-bold text-secondary">
      {school.schoolName ? schoolInitials(school.schoolName) : <Building2 className="size-5" aria-hidden="true" />}
    </span>
  );
}

export function SchoolSelect({
  value,
  id,
  describedBy,
  onChange,
  onBlur,
  error,
  disabled,
  schools,
  isLoading,
  isError,
  onRetry,
}: {
  value: string;
  id?: string;
  describedBy?: string;
  onChange: (schoolId: string) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  schools: SchoolSelectOption[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const reactId = React.useId();
  const instanceId = reactId.replace(/:/g, "");
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const selected = schools.find((school) => school.id === value) ?? null;
  const filtered = schools.filter((school) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return `${school.schoolName} ${school.schoolCode}`.toLowerCase().includes(query);
  });
  const listId = `${instanceId}-school-options`;
  const resolvedActiveIndex = filtered.length > 0 ? Math.min(activeIndex, filtered.length - 1) : -1;
  const activeSchool = resolvedActiveIndex >= 0 ? filtered[resolvedActiveIndex] : null;
  const activeOptionId = open && activeSchool ? `${instanceId}-school-option-${activeSchool.id}` : undefined;

  React.useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const handleSelect = (schoolId: string) => {
    if (isLoading) return;
    onChange(schoolId);
    setOpen(false);
    setSearch("");
  };

  const moveActiveOption = (direction: 1 | -1) => {
    if (filtered.length === 0) return;
    setActiveIndex((current) => (current + direction + filtered.length) % filtered.length);
  };

  const handleComboboxKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      moveActiveOption(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      moveActiveOption(-1);
      return;
    }

    if (event.key === "Enter" && open && activeSchool) {
      event.preventDefault();
      handleSelect(activeSchool.id);
    }
  };

  return (
    <div ref={containerRef} className="relative space-y-2">
      <Button
        type="button"
        id={id}
        variant="outline"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={activeOptionId}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        disabled={disabled}
        className={cn(
          "h-12 w-full justify-between rounded-xl border-input bg-background/60 px-4 text-left shadow-sm hover:border-primary/40 hover:bg-background/70 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
          error && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
        )}
        onClick={() => setOpen((current) => !current)}
        onBlur={onBlur}
        onKeyDown={handleComboboxKeyDown}
      >
        <span className="flex min-w-0 items-center gap-3">
          {selected ? (
            <span className="[&>img]:size-9 [&>span]:size-9">
              <SchoolLogo school={selected} />
            </span>
          ) : (
            <Building2 className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          )}
          <span className="min-w-0">
            <span className={cn("block truncate text-sm font-semibold", selected ? "text-foreground" : "text-muted-foreground")}>
              {selected ? selected.schoolName : "Pilih sekolah"}
            </span>
            {selected ? <span className="block truncate text-xs text-muted-foreground">{selected.schoolCode}</span> : null}
          </span>
        </span>
        {isLoading ? <LoaderCircle className="size-4 animate-spin text-muted-foreground" aria-hidden="true" /> : <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />}
      </Button>

      {open ? (
        <div className="absolute left-0 top-full z-30 mt-2 w-full overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-xl">
          <div className="sticky top-0 z-10 border-b border-border bg-popover p-2.5">
            <label className="relative block">
              <span className="sr-only">Cari nama atau kod sekolah</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setActiveIndex(0);
                }}
                placeholder="Cari nama atau kod sekolah..."
                className="h-10 rounded-lg bg-background/60 pl-9 text-sm focus-visible:border-primary focus-visible:ring-primary/20"
                autoFocus
                onKeyDown={handleComboboxKeyDown}
              />
            </label>
          </div>

          <div id={listId} role="listbox" className="max-h-80 overflow-y-auto p-2">
            {isLoading ? (
              <div className="flex items-center gap-2 rounded-lg p-3 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                Memuatkan sekolah...
              </div>
            ) : null}
            {!isLoading && isError ? (
              <div className="space-y-3 rounded-lg p-3 text-sm">
                <p className="font-semibold text-foreground">Senarai sekolah tidak dapat dimuatkan.</p>
                <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={onRetry}>
                  Cuba Lagi
                </Button>
              </div>
            ) : null}
            {!isLoading && !isError && schools.length === 0 ? (
              <div className="space-y-2 rounded-lg p-3 text-sm">
                <p className="font-semibold text-foreground">Tiada sekolah aktif</p>
                <p className="text-muted-foreground">Tambah atau aktifkan sekolah sebelum mencipta akaun guru.</p>
                <Button asChild variant="outline" className="h-10 rounded-xl">
                  <Link to="/admin/sekolah">Urus Sekolah</Link>
                </Button>
              </div>
            ) : null}
            {!isLoading && !isError && schools.length > 0 && filtered.length === 0 ? (
              <div className="space-y-1 rounded-lg p-3 text-sm">
                <p className="font-semibold text-foreground">Tiada sekolah ditemui.</p>
                <p className="text-muted-foreground">Cuba nama atau kod sekolah yang lain.</p>
              </div>
            ) : null}
            {!isLoading && !isError ? filtered.map((school, index) => (
              <button
                key={school.id}
                id={`${instanceId}-school-option-${school.id}`}
                type="button"
                role="option"
                aria-selected={school.id === value}
                data-active={index === resolvedActiveIndex}
                className={cn(
                  "flex min-h-14 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                  school.id === value && "bg-primary/10",
                  index === resolvedActiveIndex && "bg-muted",
                )}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  handleSelect(school.id);
                }}
                onClick={() => handleSelect(school.id)}
              >
                <SchoolLogo school={school} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">{school.schoolName}</span>
                  <span className="block truncate text-xs text-muted-foreground">{school.schoolCode}</span>
                </span>
                {school.id === value ? <Check className="size-4 text-secondary" aria-hidden="true" /> : null}
              </button>
            )) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
