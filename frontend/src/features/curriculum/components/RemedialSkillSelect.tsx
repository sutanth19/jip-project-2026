import * as React from "react";
import { Check, ChevronDown, LoaderCircle, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { RemedialSkillOption } from "@/features/curriculum/utils/remedial-skill";
import { remedialSkillOptionLabel } from "@/features/curriculum/utils/remedial-skill";

export function RemedialSkillSelect({
  value,
  id,
  describedBy,
  onChange,
  error,
  disabled,
  skills,
  isLoading,
  isError,
  onRetry,
}: {
  value: string;
  id?: string;
  describedBy?: string;
  onChange: (skillId: string) => void;
  error?: string;
  disabled?: boolean;
  skills: RemedialSkillOption[];
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
  const selected = skills.find((skill) => skill.id === value) ?? null;
  const filtered = skills.filter((skill) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return `${skill.code} ${skill.name}`.toLowerCase().includes(query);
  });
  const listId = `${instanceId}-remedial-skill-options`;
  const resolvedActiveIndex = filtered.length > 0 ? Math.min(activeIndex, filtered.length - 1) : -1;
  const activeSkill = resolvedActiveIndex >= 0 ? filtered[resolvedActiveIndex] : null;
  const activeOptionId = open && activeSkill ? `${instanceId}-skill-option-${activeSkill.id}` : undefined;

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

  const handleSelect = (skillId: string) => {
    if (isLoading) return;
    onChange(skillId);
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

    if (event.key === "Enter" && open && activeSkill) {
      event.preventDefault();
      handleSelect(activeSkill.id);
    }
  };

  return (
    <div ref={containerRef} className="relative space-y-2">
      <Button
        id={id}
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={activeOptionId}
        aria-describedby={describedBy}
        aria-invalid={Boolean(error)}
        disabled={disabled}
        className={cn(
          "h-12 w-full justify-between rounded-xl bg-background/60 px-4 text-left text-base font-normal focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
          error && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
        )}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleComboboxKeyDown}
      >
        <span className="truncate">{selected ? remedialSkillOptionLabel(selected) : "Pilih kemahiran pemulihan"}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </Button>

      {open ? (
        <div className="absolute z-20 w-full rounded-xl border border-border bg-popover p-3 shadow-lg">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              autoFocus
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setActiveIndex(0);
              }}
              placeholder="Cari kod atau nama kemahiran"
              className="h-11 rounded-xl pl-9"
            />
          </div>

          <div
            id={listId}
            role="listbox"
            className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-border/60 bg-background/40"
          >
            {isLoading ? (
              <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                Memuatkan kemahiran pemulihan...
              </div>
            ) : null}

            {isError ? (
              <div className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm text-destructive">
                <span>Senarai kemahiran pemulihan tidak dapat dimuatkan.</span>
                <Button type="button" variant="outline" className="h-8 rounded-lg px-3 text-xs" onClick={onRetry}>
                  Cuba Semula
                </Button>
              </div>
            ) : null}

            {!isLoading && !isError && filtered.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">Tiada kemahiran yang sepadan dengan carian anda.</p>
            ) : null}

            {!isLoading && !isError
              ? filtered.map((skill, index) => {
                  const active = index === resolvedActiveIndex;
                  const selectedOption = skill.id === value;

                  return (
                    <button
                      key={skill.id}
                      id={`${instanceId}-skill-option-${skill.id}`}
                      type="button"
                      role="option"
                      aria-selected={selectedOption}
                      className={cn(
                        "flex w-full items-start justify-between gap-3 px-4 py-3 text-left text-sm transition-colors",
                        active ? "bg-muted/70" : "hover:bg-muted/50",
                      )}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => handleSelect(skill.id)}
                    >
                      <span className="min-w-0">
                        <span className="block font-semibold text-foreground">{remedialSkillOptionLabel(skill)}</span>
                      </span>
                      {selectedOption ? <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /> : null}
                    </button>
                  );
                })
              : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
