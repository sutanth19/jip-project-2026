import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, BadgeCheck, Copy, GraduationCap, Hash, KeyRound, LoaderCircle, ShieldCheck, UserPlus } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";

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
import type { TeacherClassListItem } from "@/features/teacher/types/teacher-class.types";
import type { TeacherStudentCreatePayload, TeacherStudentCreateResult } from "@/features/teacher/types/teacher-student.types";
import { teacherClassDisplayLabel, teacherYearLevelOptions } from "@/features/teacher/utils/teacher-class";
import {
  buildTeacherStudentCreatePayload,
  filterActiveTeacherClassesByYear,
  mapTeacherStudentCreateSubmissionError,
  teacherStudentCreateDefaultValues,
  teacherStudentCreateFormSchema,
  type TeacherStudentCreateFormInput,
  type TeacherStudentCreateValues,
} from "@/features/teacher/utils/teacher-student-create";
import { cn } from "@/lib/utils";
import { useToast } from "@/providers/toast-context-value";

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

function credentialClassLabel(result: TeacherStudentCreateResult | null): string {
  if (!result?.student.class) return "Belum ditetapkan";
  return teacherClassDisplayLabel(result.student.class);
}

export function TeacherStudentCreateForm({
  classes,
  classesLoading,
  classesError,
  onRetryClasses,
  onSubmit,
  submitting,
}: {
  classes: TeacherClassListItem[];
  classesLoading: boolean;
  classesError: boolean;
  onRetryClasses: () => void;
  onSubmit: (payload: TeacherStudentCreatePayload) => Promise<TeacherStudentCreateResult>;
  submitting: boolean;
}) {
  const navigate = useNavigate();
  const toast = useToast();
  const [discardOpen, setDiscardOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [successOpen, setSuccessOpen] = React.useState(false);
  const [confirmError, setConfirmError] = React.useState<string | null>(null);
  const [pendingPayload, setPendingPayload] = React.useState<TeacherStudentCreatePayload | null>(null);
  const [createdResult, setCreatedResult] = React.useState<TeacherStudentCreateResult | null>(null);
  const form = useForm<TeacherStudentCreateFormInput, unknown, TeacherStudentCreateValues>({
    resolver: zodResolver(teacherStudentCreateFormSchema),
    defaultValues: teacherStudentCreateDefaultValues,
    mode: "onChange",
  });
  const selectedYearLevel = useWatch({ control: form.control, name: "yearLevel" });
  const selectedClassId = useWatch({ control: form.control, name: "classId" });
  const filteredClasses = React.useMemo(
    () => filterActiveTeacherClassesByYear(classes, selectedYearLevel),
    [classes, selectedYearLevel],
  );

  React.useEffect(() => {
    if (!selectedClassId) return;
    if (!filteredClasses.some((item) => item.id === selectedClassId)) {
      form.setValue("classId", "", { shouldDirty: true, shouldValidate: true });
    }
  }, [filteredClasses, form, selectedClassId]);

  const submit = form.handleSubmit((values) => {
    setConfirmError(null);
    setPendingPayload(buildTeacherStudentCreatePayload(values));
    setConfirmOpen(true);
  });

  const cancelPath = "/guru/murid";
  const handleCancel = () => {
    if (form.formState.isDirty) {
      setDiscardOpen(true);
      return;
    }
    navigate(cancelPath);
  };

  const handleConfirm = async () => {
    if (!pendingPayload) return;

    try {
      const result = await onSubmit(pendingPayload);
      setCreatedResult(result);
      setConfirmOpen(false);
      setSuccessOpen(true);
    } catch (error) {
      const mapped = mapTeacherStudentCreateSubmissionError(error);
      if (mapped.field) {
        form.setError(mapped.field, { type: "server", message: mapped.message });
        setConfirmOpen(false);
        return;
      }
      setConfirmError(mapped.message);
    }
  };

  const handleCopyCredentials = async () => {
    if (!createdResult) return;
    const text = [
      "Digital MoLIB",
      "",
      `Nama Murid: ${createdResult.student.fullName}`,
      `ID Murid: ${createdResult.credentials.studentId}`,
      `PIN: ${createdResult.credentials.temporaryPin}`,
      `Kelas Asal: ${credentialClassLabel(createdResult)}`,
      "",
      "Log masuk melalui portal Murid Digital MoLIB.",
    ].join("\n");

    await navigator.clipboard.writeText(text);
    toast.success("Maklumat log masuk telah disalin.");
  };

  const handleFinishSuccess = () => {
    setSuccessOpen(false);
    setCreatedResult(null);
    form.reset(teacherStudentCreateDefaultValues);
    navigate(cancelPath);
  };

  const classDisabled = submitting || classesLoading || classesError || !selectedYearLevel;
  const classPlaceholder = !selectedYearLevel ? "Pilih tahun dahulu" : classesLoading ? "Memuatkan kelas..." : "Pilih kelas asal";

  return (
    <>
      <form onSubmit={submit} className="w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm" noValidate>
        <div className="p-5 sm:p-6">
          <div className="mx-auto flex w-full max-w-5xl items-center gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground shadow-sm">
              <GraduationCap className="size-7" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-semibold text-foreground">Maklumat Murid</h2>
              <p className="mt-1 text-sm text-muted-foreground">Masukkan maklumat asas dan penempatan kelas murid.</p>
            </div>
          </div>
        </div>

        <div className="border-t border-border">
          <div className="space-y-6 p-5 sm:p-6">
            <div className="mx-auto w-full max-w-5xl space-y-6">
              <div className="w-full space-y-2">
                <Label htmlFor="teacher-student-full-name" className="text-sm font-semibold text-foreground">
                  Nama Penuh <RequiredMark />
                </Label>
                <Input
                  id="teacher-student-full-name"
                  disabled={submitting}
                  autoComplete="name"
                  maxLength={150}
                  aria-invalid={Boolean(form.formState.errors.fullName)}
                  aria-describedby={form.formState.errors.fullName ? "teacher-student-full-name-error" : "teacher-student-full-name-helper"}
                  className={cn(
                    "h-12 rounded-xl border-input bg-background/60 pr-12 text-base text-foreground placeholder:text-muted-foreground hover:border-primary/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
                    form.formState.errors.fullName && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
                  )}
                  placeholder="Contoh: Kumar Raj"
                  {...form.register("fullName")}
                />
                <FieldError id="teacher-student-full-name-error" message={form.formState.errors.fullName?.message} />
                <p id="teacher-student-full-name-helper" className="text-sm leading-6 text-muted-foreground">
                  Masukkan nama penuh seperti dalam rekod sekolah.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="w-full space-y-2">
                  <Label htmlFor="teacher-student-year-level" className="text-sm font-semibold text-foreground">
                    Tahun <RequiredMark />
                  </Label>
                  <Controller
                    control={form.control}
                    name="yearLevel"
                    render={({ field, fieldState }) => (
                      <>
                        <Select value={field.value} onValueChange={field.onChange} disabled={submitting}>
                          <SelectTrigger
                            id="teacher-student-year-level"
                            aria-invalid={Boolean(fieldState.error)}
                            aria-describedby={fieldState.error ? "teacher-student-year-level-error" : undefined}
                            className={cn(
                              "h-12 w-full rounded-xl bg-background/60 text-base focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
                              fieldState.error && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
                            )}
                          >
                            <SelectValue placeholder="Pilih tahun" />
                          </SelectTrigger>
                          <SelectContent>
                            {teacherYearLevelOptions.filter((option) => option.value !== "all").map((option) => (
                              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FieldError id="teacher-student-year-level-error" message={fieldState.error?.message} />
                      </>
                    )}
                  />
                </div>

                <div className="w-full space-y-2">
                  <Label htmlFor="teacher-student-gender" className="text-sm font-semibold text-foreground">
                    Jantina <RequiredMark />
                  </Label>
                  <Controller
                    control={form.control}
                    name="gender"
                    render={({ field, fieldState }) => (
                      <>
                        <Select value={field.value} onValueChange={field.onChange} disabled={submitting}>
                          <SelectTrigger
                            id="teacher-student-gender"
                            aria-invalid={Boolean(fieldState.error)}
                            aria-describedby={fieldState.error ? "teacher-student-gender-error" : undefined}
                            className={cn(
                              "h-12 w-full rounded-xl bg-background/60 text-base focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
                              fieldState.error && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
                            )}
                          >
                            <SelectValue placeholder="Pilih jantina" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MALE">Lelaki</SelectItem>
                            <SelectItem value="FEMALE">Perempuan</SelectItem>
                          </SelectContent>
                        </Select>
                        <FieldError id="teacher-student-gender-error" message={fieldState.error?.message} />
                      </>
                    )}
                  />
                </div>
              </div>

              <div className="w-full space-y-2">
                <Label htmlFor="teacher-student-class-id" className="text-sm font-semibold text-foreground">
                  Kelas Asal <RequiredMark />
                </Label>
                <Controller
                  control={form.control}
                  name="classId"
                  render={({ field, fieldState }) => (
                    <>
                      <Select value={field.value} onValueChange={field.onChange} disabled={classDisabled}>
                        <SelectTrigger
                          id="teacher-student-class-id"
                          aria-invalid={Boolean(fieldState.error)}
                          aria-describedby={fieldState.error ? "teacher-student-class-id-error" : "teacher-student-class-id-helper"}
                          className={cn(
                            "h-12 w-full rounded-xl bg-background/60 text-base focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
                            fieldState.error && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
                          )}
                        >
                          <SelectValue placeholder={classPlaceholder} />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredClasses.map((item) => (
                            <SelectItem key={item.id} value={item.id}>{teacherClassDisplayLabel(item)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldError id="teacher-student-class-id-error" message={fieldState.error?.message} />
                    </>
                  )}
                />
                <p id="teacher-student-class-id-helper" className="text-sm leading-6 text-muted-foreground">
                  Pilih tahun terlebih dahulu. Senarai kelas aktif akan dipaparkan mengikut tahun tersebut.
                </p>
              </div>

              {classesError ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive" role="alert">
                  <p className="font-semibold">Senarai kelas tidak dapat dimuatkan.</p>
                  <Button type="button" variant="outline" className="mt-3 h-10 rounded-xl" onClick={onRetryClasses}>Cuba Lagi</Button>
                </div>
              ) : null}
              {selectedYearLevel && !classesLoading && !classesError && filteredClasses.length === 0 ? (
                <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
                  <p className="font-semibold text-foreground">Tiada kelas aktif bagi tahun ini</p>
                  <p className="mt-1 text-muted-foreground">Tambah kelas terlebih dahulu sebelum mendaftarkan murid.</p>
                  <Button asChild variant="outline" className="mt-3 h-10 rounded-xl">
                    <Link to="/guru/kelas">Urus Kelas</Link>
                  </Button>
                </div>
              ) : null}

              <div className="w-full rounded-xl border border-secondary/20 bg-secondary/5 p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                    <ShieldCheck className="size-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-foreground">Maklumat log masuk dijana oleh sistem</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Sistem akan menghasilkan ID Murid dan PIN 4 digit selepas pendaftaran berjaya.
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Maklumat tersebut hanya dipaparkan sekali dan perlu diserahkan kepada murid.
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2 text-xs font-semibold text-secondary sm:justify-end">
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary/10 px-2.5 py-1"><Hash className="size-3.5" aria-hidden="true" /> ID Murid automatik</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary/10 px-2.5 py-1"><KeyRound className="size-3.5" aria-hidden="true" /> PIN sekali papar</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full border-t border-border bg-muted/30 p-5 sm:p-6">
          <div className="mx-auto flex w-full max-w-5xl flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="h-11 rounded-xl px-5" disabled={submitting} onClick={handleCancel}>
              Batal
            </Button>
            <Button
              type="submit"
              variant="secondary"
              className="h-11 min-w-[180px] gap-2 rounded-xl bg-secondary px-6 font-semibold text-secondary-foreground hover:bg-secondary/90 focus-visible:ring-secondary/30 disabled:opacity-60"
              disabled={!form.formState.isValid || submitting || classDisabled}
            >
              {submitting ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <UserPlus className="size-4" aria-hidden="true" />}
              {submitting ? "Mendaftarkan Murid..." : "Tambah Murid"}
            </Button>
          </div>
        </div>
      </form>

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Buang perubahan?</AlertDialogTitle>
            <AlertDialogDescription>Maklumat murid yang belum disimpan akan hilang.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 rounded-xl px-5">Teruskan Mengedit</AlertDialogCancel>
            <AlertDialogAction asChild className="h-11 rounded-xl bg-secondary px-5 text-secondary-foreground hover:bg-secondary/90">
              <Link to={cancelPath}>Buang Perubahan</Link>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmOpen} onOpenChange={(open) => !submitting && setConfirmOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Daftar murid baharu?</AlertDialogTitle>
            <AlertDialogDescription>Murid ini akan didaftarkan dalam sekolah dan kelas asal yang dipilih.</AlertDialogDescription>
          </AlertDialogHeader>

          <dl className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
            <div className="space-y-1"><dt className="text-sm font-semibold text-foreground">Nama Penuh</dt><dd className="text-sm text-muted-foreground">{pendingPayload?.fullName ?? "-"}</dd></div>
            <div className="space-y-1"><dt className="text-sm font-semibold text-foreground">Tahun</dt><dd className="text-sm text-muted-foreground">{pendingPayload ? `Tahun ${pendingPayload.yearLevel}` : "-"}</dd></div>
          </dl>

          {confirmError ? (
            <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
              {confirmError}
            </p>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 rounded-xl px-5" disabled={submitting}>Batal</AlertDialogCancel>
            <Button
              type="button"
              variant="secondary"
              className="h-11 gap-2 rounded-xl px-5 font-semibold focus-visible:ring-secondary/30"
              disabled={submitting}
              onClick={() => void handleConfirm()}
              aria-live="polite"
            >
              {submitting ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <BadgeCheck className="size-4" aria-hidden="true" />}
              {submitting ? "Mendaftar..." : "Tambah Murid"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={successOpen} onOpenChange={(open) => { if (!open) handleFinishSuccess(); }}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Murid berjaya didaftarkan</AlertDialogTitle>
            <AlertDialogDescription>
              Berikan maklumat log masuk ini kepada murid. PIN ini hanya dipaparkan sekali.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 rounded-2xl border border-border bg-muted/30 p-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nama Murid</p>
              <p className="break-words text-base font-semibold text-foreground">{createdResult?.student.fullName ?? "-"}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-secondary/20 bg-card p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">ID Murid</p>
                <p className="mt-1 break-all font-mono text-lg font-bold text-foreground">{createdResult?.credentials.studentId ?? "-"}</p>
              </div>
              <div className="rounded-xl border border-secondary/20 bg-card p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">PIN Murid</p>
                <p className="mt-1 font-mono text-lg font-bold tracking-[0.35em] text-foreground">{createdResult?.credentials.temporaryPin ?? "----"}</p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kelas Asal</p>
              <p className="text-sm font-semibold text-foreground">{credentialClassLabel(createdResult)}</p>
            </div>
          </div>

          <AlertDialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-11 gap-2 rounded-xl px-5"
              onClick={() => void handleCopyCredentials()}
              aria-label="Salin Maklumat Log Masuk"
            >
              <Copy className="size-4" aria-hidden="true" />
              Salin Maklumat Log Masuk
            </Button>
            <Button type="button" variant="secondary" className="h-11 rounded-xl px-5 font-semibold" onClick={handleFinishSuccess}>
              Selesai
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <span className="sr-only" role="status" aria-live="polite">{submitting ? "Murid sedang didaftarkan." : ""}</span>
    </>
  );
}
