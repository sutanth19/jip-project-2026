import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, GraduationCap, Hash, KeyRound, LoaderCircle, ShieldCheck, UserPen } from "lucide-react";
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
import { RemedialSkillSelect } from "@/features/curriculum/components/RemedialSkillSelect";
import { getDefaultRemedialProgrammeId, listRemedialSkillsByProgramme } from "@/features/curriculum/api/remedial-skill.api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { remedialSkillOptionLabel } from "@/features/curriculum/utils/remedial-skill";
import type { TeacherClassListItem } from "@/features/teacher/types/teacher-class.types";
import type { TeacherStudentDetail } from "@/features/teacher/types/teacher-student.types";
import {
  buildTeacherStudentEditPayload,
  filterActiveTeacherClassesByYear,
  includeCurrentTeacherStudentClass,
  mapTeacherStudentEditSubmissionError,
  teacherStudentEditClassLabel,
  teacherStudentEditDefaultValues,
  teacherStudentEditFormSchema,
  type TeacherStudentEditFormInput,
  type TeacherStudentEditFormValues,
} from "@/features/teacher/utils/teacher-student-edit";
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

function isArchivedClass(detail: TeacherStudentDetail): boolean {
  return detail.class.accountStatus === "ARCHIVED";
}

export function TeacherStudentEditForm({
  detail,
  classes,
  classesLoading,
  classesError,
  onRetryClasses,
  submitting,
  onSubmit,
}: {
  detail: TeacherStudentDetail;
  classes: TeacherClassListItem[];
  classesLoading: boolean;
  classesError: boolean;
  onRetryClasses: () => void;
  submitting: boolean;
  onSubmit: (payload: ReturnType<typeof buildTeacherStudentEditPayload>) => Promise<void>;
}) {
  const navigate = useNavigate();
  const [discardOpen, setDiscardOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmError, setConfirmError] = React.useState<string | null>(null);
  const [pendingPayload, setPendingPayload] = React.useState<ReturnType<typeof buildTeacherStudentEditPayload> | null>(null);
  const defaults = React.useMemo(() => teacherStudentEditDefaultValues(detail), [detail]);
  const form = useForm<TeacherStudentEditFormInput, unknown, TeacherStudentEditFormValues>({
    resolver: zodResolver(teacherStudentEditFormSchema),
    defaultValues: defaults,
    mode: "onChange",
  });
  const selectedYearLevel = useWatch({ control: form.control, name: "yearLevel" });
  const selectedClassId = useWatch({ control: form.control, name: "classId" });
  const selectedRemedialSkillId = useWatch({ control: form.control, name: "remedialSkillId" });
  const initialClassId = React.useRef(detail.classId);
  const initialYearLevel = React.useRef(String(detail.class.yearLevel));

  const filteredClasses = React.useMemo(() => {
    const yearFiltered = filterActiveTeacherClassesByYear(classes, selectedYearLevel);
    if (String(detail.class.yearLevel) !== selectedYearLevel) {
      return yearFiltered;
    }

    return includeCurrentTeacherStudentClass(yearFiltered, detail);
  }, [classes, detail, selectedYearLevel]);
  const remedialProgramme = useQuery({
    queryKey: ["teacher", "students", "remedial-programme"],
    queryFn: getDefaultRemedialProgrammeId,
  });
  const remedialSkills = useQuery({
    queryKey: ["teacher", "students", "remedial-skills", remedialProgramme.data],
    queryFn: () => listRemedialSkillsByProgramme(remedialProgramme.data as string),
    enabled: Boolean(remedialProgramme.data),
  });

  React.useEffect(() => {
    form.reset(defaults);
  }, [defaults, form]);

  React.useEffect(() => {
    if (initialClassId.current === selectedClassId && initialYearLevel.current === selectedYearLevel) {
      return;
    }

    if (!selectedClassId) return;
    if (!filteredClasses.some((item) => item.id === selectedClassId)) {
      form.setValue("classId", "", { shouldDirty: true, shouldValidate: true });
    }
  }, [filteredClasses, form, selectedClassId, selectedYearLevel]);

  const handleCancel = () => {
    if (form.formState.isDirty) {
      setDiscardOpen(true);
      return;
    }
    navigate(`/guru/murid/${detail.id}`);
  };

  const submit = form.handleSubmit((values) => {
    setConfirmError(null);
    setPendingPayload(buildTeacherStudentEditPayload(values));
    setConfirmOpen(true);
  });

  const classPlaceholder = !selectedYearLevel
    ? "Pilih tahun terlebih dahulu"
    : classesLoading
      ? "Memuatkan kelas..."
      : "Pilih kelas asal";

  const classDisabled = submitting || classesLoading || classesError || !selectedYearLevel;
  const hasNoActiveClass = Boolean(selectedYearLevel) && !classesLoading && !classesError && filterActiveTeacherClassesByYear(classes, selectedYearLevel).length === 0;
  const currentClassArchived = isArchivedClass(detail) && detail.class.yearLevel === Number(selectedYearLevel);

  const handleConfirm = async () => {
    if (!pendingPayload) return;

    try {
      await onSubmit(pendingPayload);
      setConfirmOpen(false);
    } catch (error) {
      const mapped = mapTeacherStudentEditSubmissionError(error);
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
              <UserPen className="size-7" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-semibold text-foreground">Maklumat Murid</h2>
              <p className="mt-1 text-sm text-muted-foreground">Kemas kini maklumat asas dan penempatan kelas murid.</p>
            </div>
          </div>
        </div>

        <div className="border-t border-border">
          <div className="mx-5 mt-5 rounded-xl border border-secondary/20 bg-secondary/5 p-4 sm:mx-6 sm:mt-6">
            <div className="mx-auto flex w-full max-w-5xl items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                <ShieldCheck className="size-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-foreground">ID Murid tidak boleh diubah</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">ID log masuk murid dijana oleh sistem dan kekal digunakan bersama PIN.</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">PIN tidak dipaparkan atas sebab keselamatan.</p>
                <div className="mt-4 flex flex-wrap items-center justify-start gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary/10 px-2.5 py-1 text-xs font-semibold text-secondary"><Hash className="size-3.5" aria-hidden="true" /> ID Murid</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary/10 px-2.5 py-1 text-xs font-semibold text-secondary"><KeyRound className="size-3.5" aria-hidden="true" /> PIN sulit</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6 p-5 sm:p-6">
            <div className="mx-auto w-full max-w-5xl space-y-6">
              <div className="w-full space-y-2">
                <Label htmlFor="teacher-student-edit-full-name" className="text-sm font-semibold text-foreground">Nama Penuh <RequiredMark /></Label>
                <Input
                  id="teacher-student-edit-full-name"
                  disabled={submitting}
                  autoComplete="name"
                  maxLength={150}
                  aria-invalid={Boolean(form.formState.errors.fullName)}
                  aria-describedby={form.formState.errors.fullName ? "teacher-student-edit-full-name-error" : "teacher-student-edit-full-name-helper"}
                  className={cn("h-12 rounded-xl border-input bg-background/60 pr-12 text-base text-foreground placeholder:text-muted-foreground hover:border-primary/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20", form.formState.errors.fullName && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20")}
                  placeholder="Contoh: Kumar Raj"
                  {...form.register("fullName")}
                />
                <FieldError id="teacher-student-edit-full-name-error" message={form.formState.errors.fullName?.message} />
                <p id="teacher-student-edit-full-name-helper" className="text-sm leading-6 text-muted-foreground">Masukkan nama penuh seperti dalam rekod sekolah.</p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="w-full space-y-2">
                  <Label htmlFor="teacher-student-edit-year-level" className="text-sm font-semibold text-foreground">Tahun <RequiredMark /></Label>
                  <Controller
                    control={form.control}
                    name="yearLevel"
                    render={({ field, fieldState }) => (
                      <>
                        <Select value={field.value} onValueChange={field.onChange} disabled={submitting}>
                          <SelectTrigger id="teacher-student-edit-year-level" aria-invalid={Boolean(fieldState.error)} aria-describedby={fieldState.error ? "teacher-student-edit-year-level-error" : undefined} className={cn("h-12 w-full rounded-xl bg-background/60 text-base focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20", fieldState.error && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20")}>
                            <SelectValue placeholder="Pilih tahun" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 6 }, (_, index) => String(index + 1)).map((value) => (
                              <SelectItem key={value} value={value}>Tahun {value}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FieldError id="teacher-student-edit-year-level-error" message={fieldState.error?.message} />
                      </>
                    )}
                  />
                </div>

                <div className="w-full space-y-2">
                  <Label htmlFor="teacher-student-edit-gender" className="text-sm font-semibold text-foreground">Jantina <RequiredMark /></Label>
                  <Controller
                    control={form.control}
                    name="gender"
                    render={({ field, fieldState }) => (
                      <>
                        <Select value={field.value} onValueChange={field.onChange} disabled={submitting}>
                          <SelectTrigger id="teacher-student-edit-gender" aria-invalid={Boolean(fieldState.error)} aria-describedby={fieldState.error ? "teacher-student-edit-gender-error" : undefined} className={cn("h-12 w-full rounded-xl bg-background/60 text-base focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20", fieldState.error && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20")}>
                            <SelectValue placeholder="Pilih jantina" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MALE">Lelaki</SelectItem>
                            <SelectItem value="FEMALE">Perempuan</SelectItem>
                          </SelectContent>
                        </Select>
                        <FieldError id="teacher-student-edit-gender-error" message={fieldState.error?.message} />
                      </>
                    )}
                  />
                </div>
              </div>

              <div className="w-full space-y-2">
                <Label htmlFor="teacher-student-edit-class-id" className="text-sm font-semibold text-foreground">Kelas Asal <RequiredMark /></Label>
                <Controller
                  control={form.control}
                  name="classId"
                  render={({ field, fieldState }) => (
                    <>
                      <Select value={field.value} onValueChange={field.onChange} disabled={classDisabled}>
                        <SelectTrigger id="teacher-student-edit-class-id" aria-invalid={Boolean(fieldState.error)} aria-describedby={fieldState.error ? "teacher-student-edit-class-id-error" : "teacher-student-edit-class-id-helper"} className={cn("h-12 w-full rounded-xl bg-background/60 text-base focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20", fieldState.error && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20")}>
                          <SelectValue placeholder={classPlaceholder} />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredClasses.map((item) => (
                            <SelectItem key={item.id} value={item.id} disabled={item.accountStatus === "ARCHIVED" && item.id === detail.classId}>
                              {teacherStudentEditClassLabel(item)}{item.accountStatus === "ARCHIVED" && item.id === detail.classId ? " (Diarkibkan)" : ""}
                            </SelectItem>
                          ))}
                          {currentClassArchived && !filteredClasses.some((item) => item.id === detail.classId) ? (
                            <SelectItem key={detail.class.id} value={detail.classId} disabled>
                              {teacherStudentEditClassLabel(detail.class)} (Diarkibkan)
                            </SelectItem>
                          ) : null}
                        </SelectContent>
                      </Select>
                      <FieldError id="teacher-student-edit-class-id-error" message={fieldState.error?.message} />
                    </>
                  )}
                />
                <p id="teacher-student-edit-class-id-helper" className="text-sm leading-6 text-muted-foreground">Senarai kelas aktif dipaparkan mengikut tahun yang dipilih.</p>
              </div>

              <div className="w-full space-y-2">
                <Label htmlFor="teacher-student-edit-remedial-skill-id" className="text-sm font-semibold text-foreground">Kemahiran Pemulihan <RequiredMark /></Label>
                <Controller
                  control={form.control}
                  name="remedialSkillId"
                  render={({ field, fieldState }) => (
                    <>
                      <RemedialSkillSelect
                        value={field.value}
                        id="teacher-student-edit-remedial-skill-id"
                        describedBy={fieldState.error ? "teacher-student-edit-remedial-skill-id-error" : "teacher-student-edit-remedial-skill-id-helper"}
                        onChange={field.onChange}
                        error={fieldState.error?.message}
                        disabled={submitting || remedialProgramme.isLoading || remedialProgramme.isError || remedialSkills.isLoading || remedialSkills.isError || (remedialSkills.data?.length ?? 0) === 0}
                        skills={remedialSkills.data ?? []}
                        isLoading={remedialProgramme.isLoading || remedialSkills.isLoading}
                        isError={remedialProgramme.isError || remedialSkills.isError}
                        onRetry={() => {
                          void remedialProgramme.refetch();
                          void remedialSkills.refetch();
                        }}
                      />
                      <FieldError id="teacher-student-edit-remedial-skill-id-error" message={fieldState.error?.message} />
                    </>
                  )}
                />
                <p id="teacher-student-edit-remedial-skill-id-helper" className="text-sm leading-6 text-muted-foreground">Pilih kemahiran pemulihan semasa murid menggunakan senarai rasmi KP-PRA hingga KP32.</p>
              </div>

              {classesError ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive" role="alert">
                  <p className="font-semibold">Senarai kelas tidak dapat dimuatkan.</p>
                  <Button type="button" variant="outline" className="mt-3 h-10 rounded-xl" onClick={onRetryClasses}>Cuba Lagi</Button>
                </div>
              ) : null}

              {hasNoActiveClass ? (
                <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
                  <p className="font-semibold text-foreground">Tiada kelas aktif bagi tahun ini</p>
                  <p className="mt-1 text-muted-foreground">Tambah kelas terlebih dahulu sebelum mengemas kini penempatan murid.</p>
                  <Button asChild variant="outline" className="mt-3 h-10 rounded-xl">
                    <Link to="/guru/kelas">Urus Kelas</Link>
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="w-full border-t border-border bg-muted/30 p-5 sm:p-6">
          <div className="mx-auto flex w-full max-w-5xl flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="h-11 rounded-xl px-5" disabled={submitting} onClick={handleCancel}>Batal</Button>
            <Button type="submit" variant="secondary" className="h-11 min-w-[180px] gap-2 rounded-xl bg-secondary px-6 font-semibold text-secondary-foreground hover:bg-secondary/90 focus-visible:ring-secondary/30 disabled:opacity-60" disabled={!form.formState.isValid || submitting || classDisabled}>
              {submitting ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <GraduationCap className="size-4" aria-hidden="true" />}
              Simpan Perubahan
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
              <Link to={`/guru/murid/${detail.id}`}>Buang Perubahan</Link>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmOpen} onOpenChange={(open) => !submitting && setConfirmOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sahkan dan Simpan</AlertDialogTitle>
            <AlertDialogDescription>Pastikan maklumat murid dan penempatan kelas asal adalah betul.</AlertDialogDescription>
          </AlertDialogHeader>

          <dl className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
            <div className="space-y-1"><dt className="text-sm font-semibold text-foreground">Nama Penuh</dt><dd className="text-sm text-muted-foreground">{pendingPayload?.fullName ?? "-"}</dd></div>
            <div className="space-y-1"><dt className="text-sm font-semibold text-foreground">Tahun</dt><dd className="text-sm text-muted-foreground">{pendingPayload ? `Tahun ${pendingPayload.yearLevel}` : "-"}</dd></div>
            <div className="space-y-1"><dt className="text-sm font-semibold text-foreground">Kemahiran Pemulihan</dt><dd className="text-sm text-muted-foreground">{selectedRemedialSkillId ? remedialSkillOptionLabel(remedialSkills.data?.find((item) => item.id === selectedRemedialSkillId) ?? { code: "-", name: "-" }) : "-"}</dd></div>
            <div className="space-y-1"><dt className="text-sm font-semibold text-foreground">Jantina</dt><dd className="text-sm text-muted-foreground">{pendingPayload?.gender === "FEMALE" ? "Perempuan" : pendingPayload?.gender === "MALE" ? "Lelaki" : "-"}</dd></div>
          </dl>

          {confirmError ? <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">{confirmError}</p> : null}

          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 rounded-xl px-5" disabled={submitting}>Batal</AlertDialogCancel>
            <Button type="button" variant="secondary" className="h-11 gap-2 rounded-xl px-5 font-semibold focus-visible:ring-secondary/30" disabled={submitting} onClick={() => void handleConfirm()} aria-live="polite">
              {submitting ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <GraduationCap className="size-4" aria-hidden="true" />}
              Sahkan dan Simpan
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <span className="sr-only" role="status" aria-live="polite">{submitting ? "Murid sedang dikemas kini." : ""}</span>
    </>
  );
}
