import * as React from "react";
import { ArrowLeft, Eye, Play, Search, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { Link } from "react-router-dom";

import seretSukuKataThumbnail from "@/assets/images/img_.seret.png";
import { EmptyState, ManagementPageLayout } from "@/components/shared";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  availableReadingTemplates,
  defaultReadingTemplateGalleryFilters,
  filterReadingTemplates,
  hasActiveReadingTemplateFilters,
  roadmapReadingTemplates,
  type ReadingTemplateCard,
  type ReadingTemplateGalleryFilters,
} from "@/features/admin/utils/admin-reading-template-gallery";
import { cn } from "@/lib/utils";

export function ReadingTemplatePreviewContent({
  selectedAnswer,
  onSelectAnswer,
}: {
  selectedAnswer: string | null;
  onSelectAnswer: (answer: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Perkataan</p>
          <p className="text-2xl font-semibold tracking-tight text-foreground">cawan</p>
        </div>
        <div className="mt-5 rounded-xl border border-primary/15 bg-primary/5 p-4">
          <p className="text-sm font-medium text-muted-foreground">Arahan</p>
          <p className="mt-2 text-xl font-semibold text-foreground">ca + ____</p>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-foreground">
          Pilih suku kata yang melengkapkan perkataan.
        </p>
        <div className="grid gap-3 sm:grid-cols-4">
          {["wan", "ki", "tu", "ri"].map((option) => {
            const selected = selectedAnswer === option;

            return (
              <Button
                key={option}
                type="button"
                variant="outline"
                className={cn(
                  "h-11 rounded-xl font-semibold",
                  selected && "border-primary bg-primary/10 text-primary",
                )}
                aria-pressed={selected}
                onClick={() => onSelectAnswer(option)}
              >
                {option}
              </Button>
            );
          })}
        </div>
        <p className="text-sm leading-6 text-muted-foreground" aria-live="polite">
          {selectedAnswer === "wan"
            ? "Betul untuk pratonton: ca + wan membentuk perkataan cawan. Jawapan ini tidak disimpan."
            : "Pratonton ini hanya menunjukkan cara interaksi. Tiada skor, percubaan atau rekod murid dicipta."}
        </p>
      </div>
    </div>
  );
}

function ReadingTemplatePreviewDialog({
  template,
  onOpenChange,
}: {
  template: ReadingTemplateCard | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [selectedAnswer, setSelectedAnswer] = React.useState<string | null>(null);
  const isOpen = Boolean(template);

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-h-[calc(100dvh-2rem)] max-w-2xl overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>Pratonton Templat</AlertDialogTitle>
          <AlertDialogDescription>
            Contoh interaksi murid untuk Seret Suku Kata.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ReadingTemplatePreviewContent
          selectedAnswer={selectedAnswer}
          onSelectAnswer={setSelectedAnswer}
        />

        <AlertDialogFooter>
          <AlertDialogCancel className="h-11 rounded-xl px-5">Tutup</AlertDialogCancel>
          <Button asChild className="h-11 rounded-xl px-5 font-semibold">
            <Link to="/admin/aktiviti/cipta/membaca/seret-suku-kata">Guna Templat</Link>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function AvailableReadingTemplateCard({
  template,
  onPreview,
}: {
  template: ReadingTemplateCard;
  onPreview: (template: ReadingTemplateCard) => void;
}) {
  return (
    <Card className="rounded-2xl border-border bg-card py-0 shadow-sm">
      <CardContent className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)_minmax(12rem,0.55fr)] lg:items-center">
        <div className="overflow-hidden rounded-xl border border-border bg-muted/30 shadow-sm">
          <img
            src={seretSukuKataThumbnail}
            alt="Pratonton templat Seret Suku Kata"
            className="h-auto w-full object-contain"
          />
        </div>

        <div className="min-w-0 space-y-4">
          <Badge
            variant="outline"
            className="w-fit rounded-full border-secondary/20 bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary"
          >
            Tersedia
          </Badge>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              {template.title}
            </h2>
            <p className="max-w-2xl text-base leading-8 text-muted-foreground">
              {template.description}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:border-l lg:border-border lg:pl-6">
          <Button
            asChild
            className="h-12 w-full gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:ring-primary/30"
          >
            <Link to={template.destination ?? "/admin/aktiviti/cipta/membaca"}>
              <Play className="size-4" aria-hidden="true" />
              Guna Templat
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-12 w-full gap-2 rounded-xl px-5 font-semibold"
            onClick={() => onPreview(template)}
          >
            <Eye className="size-4" aria-hidden="true" />
            Pratonton
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ReadingTemplateRoadmapCard({
  template,
}: {
  template: ReadingTemplateCard;
}) {
  const Icon = template.icon;

  return (
    <Card className="h-full rounded-2xl border-border bg-card py-0 shadow-sm">
      <CardContent className="flex h-full flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
            <Icon className="size-5" aria-hidden="true" />
          </div>
          <Badge
            variant="outline"
            className="border-border bg-muted text-muted-foreground"
            aria-label={`${template.title} akan datang dan belum tersedia`}
          >
            Akan Datang
          </Badge>
        </div>

        <div className="mt-5 space-y-2">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            {template.title}
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">{template.description}</p>
        </div>

        <div className="mt-auto pt-6">
          <Button
            type="button"
            disabled
            variant="outline"
            className="h-11 w-full rounded-xl px-4 font-semibold"
          >
            Belum Tersedia
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ReadingTemplateToolbar({
  filters,
  onChange,
  onReset,
}: {
  filters: ReadingTemplateGalleryFilters;
  onChange: (filters: ReadingTemplateGalleryFilters) => void;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <label className="relative flex-1">
        <span className="sr-only">Cari templat Membaca</span>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={filters.search}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
          placeholder="Cari templat Membaca..."
          className="!bg-background/40 pl-9 text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
        />
      </label>

      <label className="w-full text-sm sm:w-auto">
        <span className="sr-only">Jenis interaksi</span>
        <Select
          value={filters.interaction}
          onValueChange={(value) =>
            onChange({
              ...filters,
              interaction: value as ReadingTemplateGalleryFilters["interaction"],
            })}
        >
          <SelectTrigger className="!bg-background/40 sm:w-52">
            <SelectValue placeholder="Semua interaksi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua interaksi</SelectItem>
            <SelectItem value="DRAG_DROP" data-testid="interaction-drag-drop">
              Seret dan Lepas
            </SelectItem>
          </SelectContent>
        </Select>
      </label>

      <label className="w-full text-sm sm:w-auto">
        <span className="sr-only">Sumber templat</span>
        <Select
          value={filters.source}
          onValueChange={(value) =>
            onChange({ ...filters, source: value as ReadingTemplateGalleryFilters["source"] })}
        >
          <SelectTrigger className="!bg-background/40 sm:w-48">
            <SelectValue placeholder="Semua sumber" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua sumber</SelectItem>
            <SelectItem value="SYSTEM_TEMPLATE">Templat Sistem</SelectItem>
          </SelectContent>
        </Select>
      </label>

      <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onReset}>
        <SlidersHorizontal className="size-4" aria-hidden="true" />
        Reset
      </Button>
    </div>
  );
}

export function AdminReadingTemplateGallery({
  initialPreviewTemplateKey,
}: {
  initialPreviewTemplateKey?: string;
}) {
  const [filters, setFilters] = React.useState<ReadingTemplateGalleryFilters>(
    defaultReadingTemplateGalleryFilters,
  );
  const [previewTemplateKey, setPreviewTemplateKey] = React.useState<string | null>(
    initialPreviewTemplateKey ?? null,
  );
  const previewTemplate = previewTemplateKey
    ? availableReadingTemplates.find((template) => template.key === previewTemplateKey) ?? null
    : null;
  const visibleTemplates = filterReadingTemplates(availableReadingTemplates, filters);
  const hasFilters = hasActiveReadingTemplateFilters(filters);

  return (
    <ManagementPageLayout
      breadcrumb={[
        { label: "Home", to: "/admin" },
        { label: "Aktiviti", to: "/admin/aktiviti" },
        { label: "Pilih Jenis Aktiviti", to: "/admin/aktiviti/cipta" },
        { label: "Galeri Templat Membaca" },
      ]}
      title="Galeri Templat Membaca"
      description="Pilih templat Membaca yang ingin digunakan untuk mencipta aktiviti pembelajaran."
      actions={(
        <Button
          asChild
          variant="outline"
          className="h-11 w-full gap-2 rounded-xl px-5 focus-visible:ring-primary/30 sm:w-auto"
        >
          <Link to="/admin/aktiviti/cipta">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Kembali
          </Link>
        </Button>
      )}
    >
      <div className="space-y-6">
        <ReadingTemplateToolbar
          filters={filters}
          onChange={setFilters}
          onReset={() => setFilters(defaultReadingTemplateGalleryFilters)}
        />

        {visibleTemplates.length > 0 ? (
          <div className="space-y-6">
            {visibleTemplates.map((template) => (
              <AvailableReadingTemplateCard
                key={template.key}
                template={template}
                onPreview={(nextTemplate) => setPreviewTemplateKey(nextTemplate.key)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Search className="size-5" aria-hidden="true" />}
            title={hasFilters ? "Tiada templat ditemui" : "Tiada templat Membaca tersedia"}
            description={
              hasFilters
                ? "Cuba ubah carian atau penapis anda."
                : "Templat Membaca belum tersedia untuk digunakan."
            }
            action={
              hasFilters ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFilters(defaultReadingTemplateGalleryFilters)}
                >
                  Reset
                </Button>
              ) : null
            }
          />
        )}

        <section className="space-y-4" aria-labelledby="roadmap-reading-templates-heading">
          <div>
            <h2
              id="roadmap-reading-templates-heading"
              className="text-lg font-semibold text-foreground"
            >
              Akan Datang
            </h2>
            <p className="text-sm text-muted-foreground">
              Templat roadmap dipaparkan untuk perancangan sahaja dan belum boleh digunakan.
            </p>
          </div>
          <div className="grid items-stretch gap-6 md:grid-cols-2 xl:grid-cols-3">
            {roadmapReadingTemplates.map((template) => (
              <ReadingTemplateRoadmapCard key={template.key} template={template} />
            ))}
          </div>
        </section>

        <Card className="rounded-2xl border-border bg-card py-0 shadow-sm">
          <CardContent className="flex items-start gap-4 p-5 sm:p-6">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-secondary/20 bg-secondary/10 text-secondary">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-foreground">
                Pratonton tidak menyimpan rekod
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Pratonton galeri ini tidak mencipta aktiviti, tugasan, percubaan murid,
                skor atau rekod pangkalan data.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <ReadingTemplatePreviewDialog
        key={previewTemplate?.key ?? "closed"}
        template={previewTemplate}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewTemplateKey(null);
          }
        }}
      />
    </ManagementPageLayout>
  );
}
