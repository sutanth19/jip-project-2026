import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";

import { ConfirmDialog, EmptyState, ErrorState, ManagementPageLayout } from "@/components/shared";
import { ActivityWizardStepper, SelectedTemplateSummary } from "@/features/admin/components/AdminActivityCreateWizard";
import { AdminActivityWizardStepFooter } from "@/features/admin/components/AdminActivityWizardStepFooter";
import { ActivityContentSummary } from "@/features/admin/components/ActivityContentSummary";
import { ActivityQuestionNavigator } from "@/features/admin/components/ActivityQuestionNavigator";
import { ArrangeSyllablesQuestionForm } from "@/features/admin/components/ArrangeSyllablesQuestionForm";
import { useActivityContent } from "@/features/admin/hooks/use-activity-content";
import { Skeleton } from "@/components/ui/skeleton";
import { getActivityWizardProgress } from "@/features/admin/utils/admin-activity-create";
import { arrangeSyllablesQuestionSchema } from "@/features/admin/utils/arrange-syllables-content";
import { useToast } from "@/providers/toast-context-value";

const stepOnePath = (activityId: string) => `/admin/aktiviti/${activityId}/cipta/maklumat`;
const stepTwoPath = (activityId: string) => `/admin/aktiviti/${activityId}/cipta/kurikulum`;
const stepThreePath = (activityId: string) => `/admin/aktiviti/${activityId}/cipta/kandungan`;
const stepFourPath = (activityId: string) => `/admin/aktiviti/${activityId}/cipta/tetapan`;
const galleryPath = "/admin/aktiviti/cipta/membaca";

export function AdminActivityContentPage() {
  const activityId = useParams().activityId ?? "";
  const navigate = useNavigate();
  const toast = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = React.useState(false);
  const [pendingNavigation, setPendingNavigation] = React.useState<string | null>(null);

  const content = useActivityContent(activityId);

  const progress = getActivityWizardProgress(content.activity);
  const hasCurriculumLink = progress.hasCurriculumLink;

  const validateSelectedQuestion = React.useCallback(() => {
    if (!content.selectedQuestion) return {};
    const result = arrangeSyllablesQuestionSchema.safeParse(content.selectedQuestion);
    if (result.success) return {};

    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join(".");
      if (path && !errors[path]) {
        errors[path] = issue.message;
      }
    }
    return errors;
  }, [content.selectedQuestion]);

  const questionErrors = validateSelectedQuestion();

  const handleUpdateQuestion = React.useCallback((updated: typeof content.selectedQuestion) => {
    if (!updated) return;
    content.updateQuestion(updated);
  }, [content]);

  const requestNavigation = React.useCallback((destination: string) => {
    if (content.dirty) {
      setPendingNavigation(destination);
      setDiscardDialogOpen(true);
      return;
    }
    navigate(destination);
  }, [content.dirty, navigate]);

  const confirmDiscard = React.useCallback(() => {
    setDiscardDialogOpen(false);
    navigate(pendingNavigation ?? galleryPath);
    setPendingNavigation(null);
  }, [navigate, pendingNavigation]);

  const handleSave = React.useCallback(async () => {
    if (!content.selectedQuestion) return;
    const result = arrangeSyllablesQuestionSchema.safeParse(content.selectedQuestion);
    if (!result.success) {
      toast.error("Ralat", "Sila lengkapkan semua medan yang diperlukan sebelum menyimpan.");
      requestAnimationFrame(() => {
        document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      });
      return;
    }
    try {
      await content.saveSelectedQuestion();
    } catch {
      // The mutation already surfaces a safe Malay error banner/toast.
    }
  }, [content, toast]);

  const handleContinue = React.useCallback(() => {
    if (!content.hasValidContent) {
      toast.error("Ralat", "Semua soalan mesti lengkap dan disimpan sebelum meneruskan.");
      return;
    }
    requestNavigation(stepFourPath(activityId));
  }, [content.hasValidContent, requestNavigation, activityId, toast]);

  const handleDelete = React.useCallback(() => {
    setDeleteDialogOpen(true);
  }, []);

  const confirmDelete = React.useCallback(() => {
    setDeleteDialogOpen(false);
    content.deleteSelectedQuestion();
  }, [content]);

  const showDraftError = content.activity && content.activity.status !== "DRAFT";

  return (
    <ManagementPageLayout
      breadcrumb={[
        { label: "Home", to: "/admin" },
        { label: "Aktiviti", to: "/admin/aktiviti" },
        { label: "Maklumat", to: stepOnePath(activityId) },
        { label: "Kurikulum", to: stepTwoPath(activityId) },
        { label: "Kandungan" },
      ]}
      title="Kandungan"
      description="Bina dan susun soalan Seret Suku Kata untuk aktiviti ini."
    >
      {content.activityLoading ? (
        <div className="space-y-6" aria-busy="true" aria-label="Memuatkan kandungan aktiviti">
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
          <div className="grid items-start gap-6 lg:grid-cols-5">
            <Skeleton className="h-[40rem] rounded-2xl lg:col-span-3" />
            <Skeleton className="h-[34rem] rounded-2xl lg:col-span-2" />
          </div>
        </div>
      ) : null}

      {content.activityError ? (
        <ErrorState
          title="Kandungan aktiviti tidak dapat dimuatkan"
          description="Sila cuba semula. Jika masalah berterusan, hubungi pentadbir sistem."
          actionLabel="Cuba Semula"
          onAction={content.refetchActivity}
        />
      ) : null}

      {showDraftError ? (
        <ErrorState
          title="Aktiviti draf diperlukan"
          description="Langkah Kandungan hanya boleh dilakukan untuk aktiviti berstatus draf."
          actionLabel="Kembali ke Pengurusan Aktiviti"
          onAction={() => navigate("/admin/aktiviti")}
        />
      ) : null}

      {!hasCurriculumLink && !content.activityLoading && !content.activityError && !showDraftError ? (
        <div className="space-y-6">
          <SelectedTemplateSummary />
          <ActivityWizardStepper
            activeStep="content"
            progress={progress}
            stepLinks={{
              information: stepOnePath(activityId),
              curriculum: stepTwoPath(activityId),
            }}
          />
          <EmptyState
            title="Kurikulum belum lengkap"
            description="Langkah Kandungan hanya boleh dibuka selepas pautan kurikulum sebenar disimpan."
            action={(
              <button
                type="button"
                className="h-11 rounded-xl border border-border bg-card px-5 font-semibold text-foreground shadow-sm hover:bg-muted"
                onClick={() => navigate(stepTwoPath(activityId))}
              >
                Kembali ke Kurikulum
              </button>
            )}
          />
        </div>
      ) : null}

      {content.activity && content.activity.status === "DRAFT" && hasCurriculumLink ? (
        <div className="space-y-6">
          <SelectedTemplateSummary />
          <ActivityWizardStepper
            activeStep="content"
            progress={progress}
            stepLinks={{
              information: stepOnePath(activityId),
              curriculum: stepTwoPath(activityId),
              content: stepThreePath(activityId),
            }}
            onNavigateStep={(destination) => requestNavigation(destination)}
          />

          {content.questions.length === 0 ? (
            <EmptyState
              title="Belum ada soalan"
              description="Tambah soalan pertama untuk membina aktiviti Seret Suku Kata."
              action={(
                <button
                  type="button"
                  className="h-11 rounded-xl bg-primary px-5 font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
                  onClick={content.addQuestion}
                >
                  Tambah Soalan
                </button>
              )}
            />
          ) : (
            <div className="space-y-6">
              <ActivityQuestionNavigator
                questions={content.questions}
                selectedQuestionId={content.selectedQuestionId}
                onSelect={(questionId) => content.setSelectedQuestionId(questionId)}
                onAdd={content.addQuestion}
                onReorder={content.reorderQuestions}
                disabled={content.isSaving || content.isDeleting}
              />

              <div className="grid items-stretch gap-6 lg:grid-cols-5">
                <div className="space-y-6 lg:col-span-3">
                  {content.selectedQuestion ? (
                    <ArrangeSyllablesQuestionForm
                      key={content.selectedQuestion.localId}
                      question={content.selectedQuestion}
                      index={content.questions.findIndex((question) => question.localId === content.selectedQuestion?.localId)}
                      errors={questionErrors}
                      onUpdate={handleUpdateQuestion}
                      onDuplicate={content.duplicateSelectedQuestion}
                      onDelete={handleDelete}
                      disabled={content.isSaving || content.isDeleting}
                    />
                  ) : null}

                  {content.serverError ? (
                    <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                      {content.serverError}
                    </p>
                  ) : null}
                </div>

                <div className="h-full lg:col-span-2">
                  <ActivityContentSummary
                    questions={content.questions}
                    selectedQuestion={content.selectedQuestion}
                    selectedQuestionIndex={content.questions.findIndex((question) => question.localId === content.selectedQuestion?.localId)}
                  />
                </div>
              </div>

              <div>
                <AdminActivityWizardStepFooter
                  isSaving={content.isSaving}
                  canSave={content.canSaveSelectedQuestion}
                  canContinue={content.hasValidContent && !content.isSaving}
                  onCancel={() => requestNavigation(galleryPath)}
                  onSave={handleSave}
                  onContinue={handleContinue}
                />
              </div>
            </div>
          )}
        </div>
      ) : null}

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Padam soalan?"
        description="Soalan ini akan dipadam daripada aktiviti. Tindakan ini tidak boleh dibatalkan selepas disimpan."
        cancelLabel="Batal"
        confirmLabel="Padam Soalan"
        variant="destructive"
        isLoading={content.isDeleting}
        onConfirm={confirmDelete}
      />

      <ConfirmDialog
        open={discardDialogOpen}
        onOpenChange={setDiscardDialogOpen}
        title="Buang perubahan?"
        description="Perubahan yang belum disimpan akan hilang jika anda meninggalkan langkah ini."
        cancelLabel="Teruskan Mengedit"
        confirmLabel="Buang Perubahan"
        variant="destructive"
        onConfirm={confirmDiscard}
      />
    </ManagementPageLayout>
  );
}
