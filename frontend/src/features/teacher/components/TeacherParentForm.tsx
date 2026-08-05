import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2, LoaderCircle, Plus, School, Users } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TeacherStudentListItem } from "@/features/teacher/types/teacher-student.types";
import type {
  TeacherParentCreatePayload,
  TeacherParentDetail,
  TeacherParentUpdatePayload,
} from "@/features/teacher/types/teacher-parent.types";
import {
  buildTeacherParentCreatePayload,
  buildTeacherParentUpdatePayload,
  type TeacherParentCreateFormInput,
  type TeacherParentCreateFormValues,
  type TeacherParentEditFormValues,
  teacherParentCreateDefaultValues,
  teacherParentCreateFormSchema,
  teacherParentEditDefaultValues,
  teacherParentEditFormSchema,
  teacherParentRelationshipLabel,
} from "@/features/teacher/utils/teacher-parent";
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

function studentLabel(item: TeacherStudentListItem): string {
  const className = item.class ? `${item.class.yearLevel} ${item.class.className}`.trim() : "Belum ditetapkan";
  return `${item.fullName} • ${item.studentId || "ID tidak tersedia"} • ${className}`;
}

type ParentFormMode = "create" | "edit";

type ParentFormProps = {
  mode: ParentFormMode;
  detail?: TeacherParentDetail | null;
  students: TeacherStudentListItem[];
  studentsLoading: boolean;
  studentsError: boolean;
  onRetryStudents: () => void;
  onSubmit: (payload: TeacherParentCreatePayload | TeacherParentUpdatePayload) => Promise<void>;
  submitting: boolean;
  cancelPath: string;
};

export function TeacherParentForm({
  mode,
  detail,
  students,
  studentsLoading,
  studentsError,
  onRetryStudents,
  onSubmit,
  submitting,
  cancelPath,
}: ParentFormProps) {
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmError, setConfirmError] = React.useState<string | null>(null);
  const [pendingPayload, setPendingPayload] = React.useState<TeacherParentCreatePayload | TeacherParentUpdatePayload | null>(null);
  const [studentSearch, setStudentSearch] = React.useState("");
  const defaults = React.useMemo<TeacherParentCreateFormInput>(() => {
    if (mode === "edit" && detail) return teacherParentEditDefaultValues(detail);
    return teacherParentCreateDefaultValues;
  }, [detail, mode]);

  const form = useForm<TeacherParentCreateFormInput, unknown, TeacherParentCreateFormValues>({
    resolver: zodResolver(mode === "create" ? teacherParentCreateFormSchema : teacherParentEditFormSchema),
    defaultValues: defaults,
    mode: "onChange",
  });
  const selectedStudentIds = useWatch({ control: form.control, name: "studentIds" }) ?? [];
  const relationship = useWatch({ control: form.control, name: "relationship" });

  React.useEffect(() => {
    form.reset(defaults);
  }, [defaults, form]);

  const filteredStudents = React.useMemo(() => {
    const term = studentSearch.trim().toLowerCase();
    return students.filter((student) => {
      if (!term) return true;
      return [student.fullName, student.studentId, student.class ? `${student.class.yearLevel} ${student.class.className}` : ""].some((value) => value.toLowerCase().includes(term));
    });
  }, [studentSearch, students]);

  const toggleStudent = (studentId: string, checked: boolean) => {
    const next = checked ? [...selectedStudentIds, studentId] : selectedStudentIds.filter((value) => value !== studentId);
    form.setValue("studentIds", [...new Set(next)] as never, { shouldDirty: true, shouldValidate: true });
  };

  const handleCancel = () => {
    if (form.formState.isDirty) {
      setConfirmOpen(true);
      setPendingPayload(null);
      setConfirmError("Maklumat yang belum disimpan akan hilang.");
      return;
    }
    navigate(cancelPath);
  };

  const submit = form.handleSubmit((values) => {
    setConfirmError(null);
    setPendingPayload(mode === "create" ? buildTeacherParentCreatePayload(values as TeacherParentCreateFormValues) : buildTeacherParentUpdatePayload(values as TeacherParentEditFormValues));
    setConfirmOpen(true);
  });

  const selectedCount = selectedStudentIds.length;
  const handleConfirm = async () => {
    if (!pendingPayload) return;
    try {
      await onSubmit(pendingPayload);
      setConfirmOpen(false);
      if (mode === "create") form.reset(teacherParentCreateDefaultValues);
    } catch (error) {
      setConfirmError(error instanceof Error ? error.message : "Maklumat ibu bapa tidak dapat disimpan.");
    }
  };

  return (
    <>
      <form onSubmit={submit} className="w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm" noValidate>
        <div className="p-5 sm:p-6">
          <div className="mx-auto flex w-full max-w-5xl items-center gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground shadow-sm">
              <Users className="size-7" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-semibold text-foreground">{mode === "create" ? "Tambah Ibu Bapa" : "Edit Ibu Bapa"}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {mode === "create" ? "Cipta akaun ibu bapa dan pautkan murid yang berkaitan." : "Kemaskini maklumat asas dan pautan murid ibu bapa."}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-border">
          <div className="mx-5 mt-5 rounded-xl border border-secondary/20 bg-secondary/5 p-4 sm:mx-6 sm:mt-6">
            <div className="mx-auto flex w-full max-w-5xl items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                <School className="size-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground">Maklumat Log Masuk</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Sistem akan menghantar e-mel kepada ibu bapa untuk melengkapkan penyediaan akaun.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary/10 px-2.5 py-1 text-xs font-semibold text-secondary">Login menggunakan e-mel</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary/10 px-2.5 py-1 text-xs font-semibold text-secondary">Kata laluan ditetapkan sendiri</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6 p-5 sm:p-6">
            <div className="mx-auto w-full max-w-5xl space-y-6">
              <div className="w-full space-y-2">
                <Label htmlFor="parent-full-name" className="text-sm font-semibold text-foreground">Nama Penuh <RequiredMark /></Label>
                <Input id="parent-full-name" disabled={submitting} autoComplete="name" maxLength={150} placeholder="Contoh: Puan Siti Aisyah" className="h-12 rounded-xl border-input bg-background/60 text-base text-foreground placeholder:text-muted-foreground hover:border-primary/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20" {...form.register("fullName" as never)} />
                <FieldError id="parent-full-name-error" message={form.formState.errors.fullName?.message as string | undefined} />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="w-full space-y-2">
                  <Label htmlFor="parent-email" className="text-sm font-semibold text-foreground">E-mel <RequiredMark /></Label>
                  <Input id="parent-email" type="email" disabled={submitting} autoComplete="email" placeholder="ibu@example.com" className="h-12 rounded-xl border-input bg-background/60 text-base text-foreground placeholder:text-muted-foreground hover:border-primary/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20" {...form.register("email" as never)} />
                  <FieldError id="parent-email-error" message={form.formState.errors.email?.message as string | undefined} />
                </div>
                <div className="w-full space-y-2">
                  <Label htmlFor="parent-phone" className="text-sm font-semibold text-foreground">No Telefon <RequiredMark /></Label>
                  <Input id="parent-phone" type="tel" inputMode="tel" disabled={submitting} autoComplete="tel" placeholder="0123456789" className="h-12 rounded-xl border-input bg-background/60 text-base text-foreground placeholder:text-muted-foreground hover:border-primary/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20" {...form.register("phone" as never)} />
                  <FieldError id="parent-phone-error" message={form.formState.errors.phone?.message as string | undefined} />
                </div>
              </div>

              <div className="w-full space-y-2">
                <Label htmlFor="parent-relationship" className="text-sm font-semibold text-foreground">Hubungan <RequiredMark /></Label>
                <Controller
                  control={form.control}
                  name={"relationship" as never}
                  render={({ field, fieldState }) => (
                    <>
                      <Select value={field.value} onValueChange={(value: string) => field.onChange(value)} disabled={submitting}>
                        <SelectTrigger id="parent-relationship" aria-invalid={Boolean(fieldState.error)} className={cn("h-12 w-full rounded-xl bg-background/60 text-base focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20", fieldState.error && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20")}>
                          <SelectValue placeholder="Pilih hubungan" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FATHER">Father</SelectItem>
                          <SelectItem value="MOTHER">Mother</SelectItem>
                          <SelectItem value="GUARDIAN">Guardian</SelectItem>
                        </SelectContent>
                      </Select>
                      <FieldError id="parent-relationship-error" message={fieldState.error?.message as string | undefined} />
                    </>
                  )}
                />
              </div>

              <div className="w-full space-y-2">
                <Label className="text-sm font-semibold text-foreground">Pilih Murid <RequiredMark /></Label>
                <div className="rounded-2xl border border-border bg-background/30 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Input value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} placeholder="Cari murid mengikut nama, ID murid atau kelas..." className="h-11 rounded-xl bg-background/60" />
                    <span className="text-sm text-muted-foreground">{selectedCount} murid dipilih</span>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {studentsError ? (
                      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                        Tidak dapat memuatkan senarai murid. <Button type="button" variant="link" className="h-auto px-0 text-destructive" onClick={onRetryStudents}>Cuba lagi</Button>
                      </div>
                    ) : null}
                    {studentsLoading ? (
                      <p className="text-sm text-muted-foreground">Memuatkan senarai murid...</p>
                    ) : null}
                    {!studentsLoading && filteredStudents.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Tiada murid aktif ditemui.</p>
                    ) : null}
                    {filteredStudents.map((student) => {
                      const checked = selectedStudentIds.includes(student.id);
                      return (
                        <label key={student.id} className={cn("flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors", checked ? "border-primary/30 bg-primary/5" : "border-border bg-card hover:bg-muted/35")}>
                          <Checkbox checked={checked} onCheckedChange={(value) => toggleStudent(student.id, value === true)} className="mt-1" />
                          <Avatar className="size-10">
                            {student.avatar ? <AvatarImage src={student.avatar} alt="" /> : null}
                            <AvatarFallback className="bg-secondary/10 text-xs font-semibold text-secondary">{student.fullName.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="break-words text-sm font-semibold text-foreground">{student.fullName}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{studentLabel(student)}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  <FieldError id="parent-studentIds-error" message={form.formState.errors.studentIds?.message as string | undefined} />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="w-full space-y-2">
                  <Label htmlFor="parent-occupation" className="text-sm font-semibold text-foreground">Pekerjaan</Label>
                  <Input id="parent-occupation" disabled={submitting} placeholder="Contoh: Peniaga" className="h-12 rounded-xl border-input bg-background/60 text-base text-foreground placeholder:text-muted-foreground hover:border-primary/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20" {...form.register("occupation" as never)} />
                </div>
                <div className="w-full space-y-2">
                  <Label htmlFor="parent-avatar" className="text-sm font-semibold text-foreground">URL Avatar</Label>
                  <Input id="parent-avatar" disabled={submitting} placeholder="https://..." className="h-12 rounded-xl border-input bg-background/60 text-base text-foreground placeholder:text-muted-foreground hover:border-primary/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20" {...form.register("avatar" as never)} />
                </div>
              </div>

              <div className="w-full space-y-2">
                <Label htmlFor="parent-address" className="text-sm font-semibold text-foreground">Alamat</Label>
                <textarea id="parent-address" rows={4} disabled={submitting} placeholder="Alamat surat-menyurat" className="min-h-28 w-full rounded-xl border border-input bg-background/60 p-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20" {...form.register("address" as never)} />
              </div>

              <div className="rounded-xl border border-secondary/20 bg-secondary/5 p-4">
                <p className="text-sm font-semibold text-foreground">Ringkasan</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Hubungan dipilih: {teacherParentRelationshipLabel(relationship as never)}. {selectedCount} murid akan dipautkan kepada akaun ini.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border bg-muted/30 p-5 sm:p-6">
          <div className="mx-auto flex w-full max-w-5xl flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="h-11 rounded-xl px-5" onClick={handleCancel} disabled={submitting}>
              Batal
            </Button>
            <Button type="submit" className="h-11 min-w-[180px] gap-2 rounded-xl bg-secondary px-6 font-semibold text-secondary-foreground hover:bg-secondary/90 focus-visible:ring-secondary/30" disabled={submitting}>
              {submitting ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
              {mode === "create" ? "Tambah Ibu Bapa" : "Simpan Perubahan"}
            </Button>
          </div>
        </div>
      </form>

      <AlertDialog open={confirmOpen} onOpenChange={(open) => !submitting && setConfirmOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{mode === "create" ? "Tambah ibu bapa?" : "Simpan perubahan ibu bapa?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {mode === "create"
                ? "Akaun ibu bapa akan dicipta dan e-mel jemputan akan dihantar."
                : "Maklumat ibu bapa dan pautan murid akan dikemas kini."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {confirmError ? <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">{confirmError}</p> : null}
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 rounded-xl px-5" disabled={submitting}>Batal</AlertDialogCancel>
            <Button type="button" className="h-11 rounded-xl px-5" disabled={submitting} onClick={handleConfirm}>
              {submitting ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="size-4" aria-hidden="true" />}
              {mode === "create" ? "Sahkan dan Tambah" : "Sahkan dan Simpan"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
