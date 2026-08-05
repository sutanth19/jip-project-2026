import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CalendarRange, Info, LoaderCircle, Save, School, Shapes } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { Link } from "react-router-dom";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TeacherClassDetail } from "@/features/teacher/types/teacher-class.types";
import {
  buildTeacherClassCreatePayload,
  mapTeacherClassEditSubmissionError,
  teacherClassAcademicYearOptions,
  teacherClassCreateFormSchema,
  type TeacherClassCreatePayload,
  type TeacherClassCreateValues,
} from "@/features/teacher/utils/teacher-class-create";
import { teacherClassDisplayLabel, teacherYearLevelOptions } from "@/features/teacher/utils/teacher-class";
import { cn } from "@/lib/utils";

function RequiredMark() {
  return <span className="text-destructive" aria-hidden="true">*</span>;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="flex items-center gap-2 text-sm text-destructive" role="alert">
      <AlertCircle className="size-4" aria-hidden="true" />
      {message}
    </p>
  );
}

function getTeacherClassEditValues(detail: TeacherClassDetail): TeacherClassCreateValues {
  return {
    yearLevel: String(detail.yearLevel),
    className: detail.className,
    academicYear: String(detail.academicYear),
  };
}

export function TeacherClassEditForm({
  detail,
  detailPath,
  onSubmit,
  submitting,
}: {
  detail: TeacherClassDetail;
  detailPath: string;
  onSubmit: (payload: TeacherClassCreatePayload) => Promise<void>;
  submitting: boolean;
}) {
  const defaults = React.useMemo(() => getTeacherClassEditValues(detail), [detail]);
  const [discardOpen, setDiscardOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmError, setConfirmError] = React.useState<string | null>(null);
  const [pendingPayload, setPendingPayload] = React.useState<TeacherClassCreatePayload | null>(null);
  const form = useForm<TeacherClassCreateValues>({
    resolver: zodResolver(teacherClassCreateFormSchema),
    defaultValues: defaults,
    mode: "onChange",
  });

  React.useEffect(() => {
    form.reset(defaults);
  }, [defaults, form]);

  const academicYearOptions = React.useMemo(() => teacherClassAcademicYearOptions(), []);
  const submit = form.handleSubmit((values) => {
    setConfirmError(null);
    setPendingPayload(buildTeacherClassCreatePayload(values));
    setConfirmOpen(true);
  });
  const canSave = form.formState.isValid && form.formState.isDirty && !submitting;

  const handleConfirm = async () => {
    if (!pendingPayload) return;

    try {
      await onSubmit(pendingPayload);
      setConfirmOpen(false);
    } catch (error) {
      const mapped = mapTeacherClassEditSubmissionError(error);
      if (mapped.field) {
        form.setError(mapped.field, { type: "server", message: mapped.message });
        setConfirmOpen(false);
        return;
      }
      setConfirmError(mapped.message);
    }
  };

  return (
    <>
      <form onSubmit={submit} className="w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm" noValidate>
        <div className="p-5 sm:p-6">
          <div className="mx-auto flex w-full max-w-5xl items-center gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground shadow-sm">
              <School className="size-7" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-semibold text-foreground">Maklumat Kelas</h2>
              <p className="mt-1 text-sm text-muted-foreground">Kemas kini maklumat kelas yang digunakan semasa pendaftaran murid.</p>
            </div>
          </div>
        </div>

        <div className="border-t border-border">
          <div className="mx-5 mt-5 rounded-xl border border-secondary/20 bg-secondary/5 p-4 sm:mx-6 sm:mt-6">
            <div className="mx-auto flex w-full max-w-5xl items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                <Info className="size-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground">Perubahan akan digunakan pada rekod murid berkaitan</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Pastikan tahun, nama kelas dan sesi akademik adalah betul sebelum menyimpan perubahan.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6 p-5 sm:p-6">
            <div className="mx-auto w-full max-w-5xl space-y-6">
              <div className="w-full space-y-2">
                <Label htmlFor="teacher-class-edit-year-level" className="text-sm font-semibold text-foreground">
                  Tahun <RequiredMark />
                </Label>
                <Controller
                  control={form.control}
                  name="yearLevel"
                  render={({ field, fieldState }) => (
                    <>
                      <Select value={field.value} onValueChange={field.onChange} disabled={submitting}>
                        <SelectTrigger
                          id="teacher-class-edit-year-level"
                          aria-invalid={Boolean(fieldState.error)}
                          aria-describedby={fieldState.error ? "teacher-class-edit-year-level-error" : undefined}
                          className={cn(
                            "h-12 w-full rounded-xl bg-background/60 text-base focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
                            fieldState.error && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
                          )}
                        >
                          <SelectValue placeholder="Pilih tahun" />
                        </SelectTrigger>
                        <SelectContent>
                          {teacherYearLevelOptions.filter((option) => option.value !== "all").map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldError id="teacher-class-edit-year-level-error" message={fieldState.error?.message} />
                    </>
                  )}
                />
              </div>

              <div className="w-full space-y-2">
                <Label htmlFor="teacher-class-edit-name" className="text-sm font-semibold text-foreground">
                  Nama Kelas <RequiredMark />
                </Label>
                <div className="relative">
                  <Input
                    id="teacher-class-edit-name"
                    disabled={submitting}
                    autoComplete="off"
                    maxLength={50}
                    aria-invalid={Boolean(form.formState.errors.className)}
                    aria-describedby={form.formState.errors.className ? "teacher-class-edit-name-error" : "teacher-class-edit-name-helper"}
                    className={cn(
                      "h-12 rounded-xl border-input bg-background/60 pr-12 text-base text-foreground placeholder:text-muted-foreground hover:border-primary/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
                      form.formState.errors.className && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
                    )}
                    placeholder="Contoh: A, Bestari, Cemerlang"
                    {...form.register("className")}
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Shapes className="size-5" aria-hidden="true" />
                  </span>
                </div>
                <FieldError id="teacher-class-edit-name-error" message={form.formState.errors.className?.message} />
                <p id="teacher-class-edit-name-helper" className="text-sm leading-6 text-muted-foreground">
                  Gunakan nama kelas seperti A, Bestari, Cemerlang atau Nilam.
                </p>
              </div>

              <div className="w-full space-y-2">
                <Label htmlFor="teacher-class-edit-academic-year" className="text-sm font-semibold text-foreground">
                  Sesi Akademik <RequiredMark />
                </Label>
                <Controller
                  control={form.control}
                  name="academicYear"
                  render={({ field, fieldState }) => (
                    <>
                      <Select value={field.value} onValueChange={field.onChange} disabled={submitting}>
                        <SelectTrigger
                          id="teacher-class-edit-academic-year"
                          aria-invalid={Boolean(fieldState.error)}
                          aria-describedby={fieldState.error ? "teacher-class-edit-academic-year-error" : undefined}
                          className={cn(
                            "h-12 w-full rounded-xl bg-background/60 text-base focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
                            fieldState.error && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
                          )}
                        >
                          <SelectValue placeholder="Pilih sesi akademik" />
                        </SelectTrigger>
                        <SelectContent>
                          {academicYearOptions.map((year) => (
                            <SelectItem key={year} value={String(year)}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldError id="teacher-class-edit-academic-year-error" message={fieldState.error?.message} />
                    </>
                  )}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="w-full border-t border-border bg-muted/30 p-5 sm:p-6">
          <div className="mx-auto flex w-full max-w-5xl flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="h-11 rounded-xl px-5" disabled={submitting} onClick={() => setDiscardOpen(true)}>
              Batal
            </Button>
            <Button
              type="submit"
              className="h-11 min-w-[180px] gap-2 rounded-xl bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary/30 disabled:opacity-60"
              disabled={!canSave}
            >
              {submitting ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
              {submitting ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>
        </div>
      </form>

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Buang perubahan?</AlertDialogTitle>
            <AlertDialogDescription>Perubahan yang belum disimpan akan hilang.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 rounded-xl px-5">Terus Mengedit</AlertDialogCancel>
            <AlertDialogAction asChild className="h-11 rounded-xl bg-primary px-5 text-primary-foreground hover:bg-primary/90">
              <Link to={detailPath}>Buang Perubahan</Link>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmOpen} onOpenChange={(open) => !submitting && setConfirmOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Simpan perubahan?</AlertDialogTitle>
            <AlertDialogDescription>Pastikan maklumat kelas yang dikemas kini adalah betul sebelum disimpan.</AlertDialogDescription>
          </AlertDialogHeader>

          <dl className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
            <div className="space-y-1">
              <dt className="text-sm font-semibold text-foreground">Kelas semasa</dt>
              <dd className="text-sm text-muted-foreground">{teacherClassDisplayLabel(detail)}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm font-semibold text-foreground">Kemas kini kepada</dt>
              <dd className="text-sm text-muted-foreground">
                {pendingPayload ? `Tahun ${pendingPayload.yearLevel} ${pendingPayload.className}, Sesi Akademik ${pendingPayload.academicYear}` : "-"}
              </dd>
            </div>
          </dl>

          {confirmError ? <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">{confirmError}</p> : null}

          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 rounded-xl px-5" disabled={submitting}>Batal</AlertDialogCancel>
            <Button type="button" className="h-11 gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary/30" disabled={submitting} onClick={() => void handleConfirm()} aria-live="polite">
              {submitting ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <CalendarRange className="size-4" aria-hidden="true" />}
              {submitting ? "Menyimpan..." : "Sahkan dan Simpan"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <span className="sr-only" role="status" aria-live="polite">{submitting ? "Maklumat kelas sedang disimpan." : ""}</span>
    </>
  );
}
