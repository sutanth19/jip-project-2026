import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  activateQuestionBankItemForActivity,
  addDigitalActivityItem,
  addQuestionBankCurriculumLinkForActivity,
  createQuestionBankItemForActivity,
  getActivityDetailForContent,
  listDigitalActivityItems,
  removeDigitalActivityItem,
  reorderDigitalActivityItems,
  updateDigitalActivityItem,
} from "@/features/admin/api/arrange-syllables-content.api";
import type { ArrangeSyllablesQuestionForm } from "@/features/admin/utils/arrange-syllables-content";
import {
  createEmptyQuestion,
  duplicateQuestion,
  hasValidPersistedContent,
  hasPersistedQuestionIdentity,
  mapItemDtoToQuestion,
  reorderQuestionsByIds,
} from "@/features/admin/utils/arrange-syllables-content";
import { useToast } from "@/providers/toast-context-value";
import { ApiError } from "@/lib/api";

export const activityContentQueryKeys = {
  activityDetail: (activityId: string) => ["admin", "activities", "detail", activityId] as const,
  items: (activityId: string) => ["admin", "activities", "items", activityId] as const,
};

function getContentErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 404 && (error.code === "DIGITAL_ACTIVITY_ITEM_NOT_FOUND" || error.code === "DIGITAL_ACTIVITY_NOT_FOUND")) {
    return "Data soalan telah berubah dan tidak dapat disegerakkan. Muat semula halaman dan cuba lagi.";
  }
  if (error instanceof Error && error.message === "ITEM_STATE_INCONSISTENT") {
    return "Data soalan telah berubah dan tidak dapat disegerakkan. Muat semula halaman dan cuba lagi.";
  }
  if (error instanceof Error && error.message === "ITEM_SAVE_FAILED") {
    return "Soalan tidak dapat disimpan. Sila semak maklumat dan cuba semula.";
  }
  return "Kandungan aktiviti tidak dapat disimpan. Sila cuba semula.";
}

export function getActivityContentSaveMode(question: ArrangeSyllablesQuestionForm) {
  if (question.isPersisted) {
    return question.activityItemId ? "update" : "inconsistent";
  }

  return question.questionBankItemId ? "recover" : "create";
}

function hasQuestionOrderChanged(
  currentQuestions: ArrangeSyllablesQuestionForm[],
  persistedQuestions: ArrangeSyllablesQuestionForm[],
): boolean {
  if (currentQuestions.length !== persistedQuestions.length) {
    return true;
  }

  return currentQuestions.some((question, index) => question.localId !== persistedQuestions[index]?.localId);
}

export function useActivityContent(activityId: string) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [selectedQuestionId, setSelectedQuestionId] = React.useState<string | null>(null);
  const [dirty, setDirty] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [localQuestions, setLocalQuestions] = React.useState<ArrangeSyllablesQuestionForm[]>([]);
  const hasHydratedLocalQuestions = React.useRef(false);

  const activity = useQuery({
    queryKey: activityContentQueryKeys.activityDetail(activityId),
    queryFn: () => getActivityDetailForContent(activityId),
    enabled: Boolean(activityId),
    staleTime: 30_000,
  });

  const items = useQuery({
    queryKey: activityContentQueryKeys.items(activityId),
    queryFn: () => listDigitalActivityItems(activityId),
    enabled: Boolean(activityId),
    staleTime: 30_000,
  });

  const persistedQuestions = React.useMemo<ArrangeSyllablesQuestionForm[]>(() => {
    if (!items.data?.length) return [];
    return items.data
      .map((item) => mapItemDtoToQuestion(item, item.sequence))
      .sort((left, right) => left.sequence - right.sequence);
  }, [items.data]);

  React.useEffect(() => {
    if (hasHydratedLocalQuestions.current || items.isLoading) return;
    hasHydratedLocalQuestions.current = true;
    setLocalQuestions(persistedQuestions);
  }, [items.isLoading, persistedQuestions]);

  const questions = localQuestions.length > 0 || persistedQuestions.length === 0
    ? localQuestions
    : persistedQuestions;

  const selectedQuestion = React.useMemo(
    () => questions.find((question) => question.localId === selectedQuestionId) ?? questions[0] ?? null,
    [questions, selectedQuestionId],
  );

  const saveMutation = useMutation({
    mutationFn: async (question: ArrangeSyllablesQuestionForm) => {
      const activityDetail = activity.data;
      const programmeId = activityDetail?.programme?.id;
      if (!programmeId) {
        throw new Error("PROGRAMME_UNAVAILABLE");
      }

      const saveMode = getActivityContentSaveMode(question);

      if (saveMode === "update") {
        const activityItemId = question.activityItemId;
        if (!activityItemId) {
          throw new Error("ITEM_STATE_INCONSISTENT");
        }

        await updateDigitalActivityItem(activityId, activityItemId, question);
        return { ...question, isPersisted: true };
      }

      if (saveMode === "inconsistent") {
        throw new Error("ITEM_STATE_INCONSISTENT");
      }

      if (saveMode === "recover" && question.questionBankItemId) {
        const activityItemId = await addDigitalActivityItem(activityId, question, question.questionBankItemId);
        return {
          ...question,
          id: question.questionBankItemId,
          activityItemId,
          isPersisted: true,
        };
      }

      const questionBankItemId = await createQuestionBankItemForActivity(question, programmeId);
      setLocalQuestions((current) => current.map((currentQuestion) => (
        currentQuestion.localId === question.localId
          ? {
              ...currentQuestion,
              id: questionBankItemId,
              questionBankItemId,
              isPersisted: false,
            }
          : currentQuestion
      )));
      await addQuestionBankCurriculumLinkForActivity(questionBankItemId, activityDetail);
      await activateQuestionBankItemForActivity(questionBankItemId);
      const activityItemId = await addDigitalActivityItem(activityId, question, questionBankItemId);

      return {
        ...question,
        id: questionBankItemId,
        activityItemId,
        questionBankItemId,
        isPersisted: true,
      };
    },
    onSuccess: async (savedQuestion) => {
      setServerError(null);
      await queryClient.invalidateQueries({ queryKey: activityContentQueryKeys.items(activityId) });
      await queryClient.invalidateQueries({ queryKey: activityContentQueryKeys.activityDetail(activityId) });
      setLocalQuestions((current) => current.map((question) => (
        question.localId === savedQuestion.localId ? savedQuestion : question
      )));
      setSelectedQuestionId(savedQuestion.localId);
      setDirty(false);
      toast.success("Berjaya", "Soalan berjaya disimpan.");
    },
    onError: (error) => {
      setServerError(getContentErrorMessage(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (question: ArrangeSyllablesQuestionForm) => {
      if (question.activityItemId) {
        await removeDigitalActivityItem(activityId, question.activityItemId);
      }
    },
    onSuccess: async () => {
      setServerError(null);
      await queryClient.invalidateQueries({ queryKey: activityContentQueryKeys.items(activityId) });
      await queryClient.invalidateQueries({ queryKey: activityContentQueryKeys.activityDetail(activityId) });
      setLocalQuestions((current) => current.filter((question) => question.localId !== selectedQuestionId));
      setSelectedQuestionId(null);
      setDirty(false);
      toast.success("Berjaya", "Soalan berjaya dipadam.");
    },
    onError: () => {
      setServerError("Soalan tidak dapat dipadam. Sila cuba semula.");
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (orderedQuestions: ArrangeSyllablesQuestionForm[]) => {
      const persisted = orderedQuestions.filter((question) => question.activityItemId);
      if (persisted.length === orderedQuestions.length) {
        await reorderDigitalActivityItems(activityId, persisted.map((question) => question.activityItemId!));
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: activityContentQueryKeys.items(activityId) });
      setDirty(false);
      toast.success("Berjaya", "Susunan soalan berjaya dikemas kini.");
    },
    onError: () => {
      setDirty(true);
      setServerError("Susunan soalan tidak dapat disimpan. Sila cuba semula.");
    },
  });

  const persistQuestionOrder = React.useCallback(async (orderedQuestions: ArrangeSyllablesQuestionForm[]) => {
    const allPersisted = orderedQuestions.every((question) => question.activityItemId);
    if (!allPersisted || !hasQuestionOrderChanged(orderedQuestions, persistedQuestions)) {
      return;
    }

    await reorderMutation.mutateAsync(orderedQuestions);
  }, [persistedQuestions, reorderMutation]);

  const updateQuestion = React.useCallback((updated: ArrangeSyllablesQuestionForm) => {
    setLocalQuestions((current) => current.map((question) => (
      question.localId === updated.localId ? updated : question
    )));
    setDirty(true);
  }, []);

  const addQuestion = React.useCallback(() => {
    const nextSequence = questions.length;
    const newQuestion = createEmptyQuestion(nextSequence);
    setLocalQuestions((current) => [...current, newQuestion]);
    setSelectedQuestionId(newQuestion.localId);
    setDirty(true);
  }, [questions.length]);

  const saveSelectedQuestion = React.useCallback(async () => {
    if (!selectedQuestion) return;
    setServerError(null);
    const orderedSnapshot = questions;
    const savedQuestion = await saveMutation.mutateAsync(selectedQuestion);
    const nextQuestions = orderedSnapshot.map((question) => (
      question.localId === savedQuestion.localId ? savedQuestion : question
    ));
    await persistQuestionOrder(nextQuestions);
  }, [persistQuestionOrder, questions, saveMutation, selectedQuestion]);

  const deleteSelectedQuestion = React.useCallback(() => {
    if (!selectedQuestion) return;
    deleteMutation.mutate(selectedQuestion);
  }, [deleteMutation, selectedQuestion]);

  const duplicateSelectedQuestion = React.useCallback(() => {
    if (!selectedQuestion) return;
    const nextSequence = questions.length;
    const newQuestion = duplicateQuestion(selectedQuestion, nextSequence);
    setLocalQuestions((current) => [...current, newQuestion]);
    setSelectedQuestionId(newQuestion.localId);
    setDirty(true);
  }, [questions.length, selectedQuestion]);

  const reorderQuestions = React.useCallback((activeQuestionId: string, overQuestionId: string) => {
    const reordered = reorderQuestionsByIds(questions, activeQuestionId, overQuestionId);
    if (reordered === questions) {
      return;
    }
    setLocalQuestions(reordered);
    setDirty(true);
  }, [questions]);

  const persistAllValidQuestions = React.useCallback(async () => {
    if (!hasValidPersistedContent(questions)) return;
    setServerError(null);
    try {
      for (const question of questions) {
        if (!hasPersistedQuestionIdentity(question)) {
          await saveMutation.mutateAsync(question);
        }
      }
      await persistQuestionOrder(questions);
      setDirty(false);
      toast.success("Berjaya", "Kandungan aktiviti berjaya disimpan.");
    } catch {
      setServerError("Kandungan aktiviti tidak dapat disimpan. Sila cuba semula.");
    }
  }, [persistQuestionOrder, questions, saveMutation, toast]);

  return {
    activity: activity.data ?? null,
    activityLoading: activity.isLoading,
    activityError: activity.isError,
    questions,
    selectedQuestion,
    selectedQuestionId,
    setSelectedQuestionId,
    isSaving: saveMutation.isPending || reorderMutation.isPending,
    isDeleting: deleteMutation.isPending,
    dirty,
    serverError,
    setServerError,
    addQuestion,
    updateQuestion,
    saveSelectedQuestion,
    deleteSelectedQuestion,
    duplicateSelectedQuestion,
    reorderQuestions,
    persistAllValidQuestions,
    hasValidContent: hasValidPersistedContent(questions),
    refetchActivity: () => void activity.refetch(),
    refetchItems: () => void items.refetch(),
  };
}
