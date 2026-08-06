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
  mapItemDtoToQuestion,
} from "@/features/admin/utils/arrange-syllables-content";
import { useToast } from "@/providers/toast-context-value";

export const activityContentQueryKeys = {
  activityDetail: (activityId: string) => ["admin", "activities", "detail", activityId] as const,
  items: (activityId: string) => ["admin", "activities", "items", activityId] as const,
};

function getContentErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message === "ITEM_SAVE_FAILED") {
    return "Soalan tidak dapat disimpan. Sila semak maklumat dan cuba semula.";
  }
  return "Kandungan aktiviti tidak dapat disimpan. Sila cuba semula.";
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
    () => questions.find((question) => question.id === selectedQuestionId) ?? questions[0] ?? null,
    [questions, selectedQuestionId],
  );

  const saveMutation = useMutation({
    mutationFn: async (question: ArrangeSyllablesQuestionForm) => {
      if (!activity.data?.programme?.id) {
        throw new Error("PROGRAMME_UNAVAILABLE");
      }

      if (question.isPersisted && question.questionBankItemId && question.activityItemId) {
        await updateDigitalActivityItem(activityId, question.activityItemId, question);
        return question;
      }

      const questionBankItemId = await createQuestionBankItemForActivity(question, activity.data.programme.id);
      await addQuestionBankCurriculumLinkForActivity(questionBankItemId, activity.data);
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
        question.id === savedQuestion.id ? savedQuestion : question
      )));
      setSelectedQuestionId(savedQuestion.id ?? null);
      setDirty(false);
      toast.success("Berjaya", "Soalan berjaya disimpan.");
    },
    onError: (error) => {
      setServerError(getContentErrorMessage(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (question: ArrangeSyllablesQuestionForm) => {
      if (question.isPersisted && question.activityItemId) {
        await removeDigitalActivityItem(activityId, question.activityItemId);
      }
    },
    onSuccess: async () => {
      setServerError(null);
      await queryClient.invalidateQueries({ queryKey: activityContentQueryKeys.items(activityId) });
      await queryClient.invalidateQueries({ queryKey: activityContentQueryKeys.activityDetail(activityId) });
      setLocalQuestions((current) => current.filter((question) => question.id !== selectedQuestionId));
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
      const persisted = orderedQuestions.filter((question) => question.isPersisted && question.activityItemId);
      if (persisted.length === orderedQuestions.length) {
        await reorderDigitalActivityItems(activityId, persisted.map((question) => question.activityItemId!));
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: activityContentQueryKeys.items(activityId) });
      toast.success("Berjaya", "Susunan soalan berjaya dikemas kini.");
    },
    onError: () => {
      setServerError("Susunan soalan tidak dapat disimpan. Sila cuba semula.");
    },
  });

  const updateQuestion = React.useCallback((updated: ArrangeSyllablesQuestionForm) => {
    setLocalQuestions((current) => current.map((question) => (
      question.id === updated.id ? updated : question
    )));
    setDirty(true);
  }, []);

  const addQuestion = React.useCallback(() => {
    const nextSequence = questions.length;
    const newQuestion = createEmptyQuestion(nextSequence);
    setLocalQuestions((current) => [...current, newQuestion]);
    setSelectedQuestionId(newQuestion.id ?? null);
    setDirty(true);
  }, [questions.length]);

  const saveSelectedQuestion = React.useCallback(async () => {
    if (!selectedQuestion) return;
    setServerError(null);
    await saveMutation.mutateAsync(selectedQuestion);
  }, [saveMutation, selectedQuestion]);

  const deleteSelectedQuestion = React.useCallback(() => {
    if (!selectedQuestion) return;
    deleteMutation.mutate(selectedQuestion);
  }, [deleteMutation, selectedQuestion]);

  const duplicateSelectedQuestion = React.useCallback(() => {
    if (!selectedQuestion) return;
    const nextSequence = questions.length;
    const newQuestion = duplicateQuestion(selectedQuestion, nextSequence);
    setLocalQuestions((current) => [...current, newQuestion]);
    setSelectedQuestionId(newQuestion.id ?? null);
    setDirty(true);
  }, [questions.length, selectedQuestion]);

  const moveQuestionUp = React.useCallback(() => {
    if (!selectedQuestion) return;
    const index = questions.findIndex((question) => question.id === selectedQuestion.id);
    if (index <= 0) return;
    const reordered = [...questions];
    [reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]];
    const resequenced = reordered.map((question, sequence) => ({ ...question, sequence }));
    setLocalQuestions(resequenced);
    setDirty(true);
    void reorderMutation.mutate(resequenced);
  }, [questions, reorderMutation, selectedQuestion]);

  const moveQuestionDown = React.useCallback(() => {
    if (!selectedQuestion) return;
    const index = questions.findIndex((question) => question.id === selectedQuestion.id);
    if (index === -1 || index >= questions.length - 1) return;
    const reordered = [...questions];
    [reordered[index + 1], reordered[index]] = [reordered[index], reordered[index + 1]];
    const resequenced = reordered.map((question, sequence) => ({ ...question, sequence }));
    setLocalQuestions(resequenced);
    setDirty(true);
    void reorderMutation.mutate(resequenced);
  }, [questions, reorderMutation, selectedQuestion]);

  const persistAllValidQuestions = React.useCallback(async () => {
    if (!hasValidPersistedContent(questions)) return;
    setServerError(null);
    try {
      for (const question of questions) {
        if (!question.isPersisted) {
          await saveMutation.mutateAsync(question);
        }
      }
      setDirty(false);
      toast.success("Berjaya", "Kandungan aktiviti berjaya disimpan.");
    } catch {
      setServerError("Kandungan aktiviti tidak dapat disimpan. Sila cuba semula.");
    }
  }, [questions, saveMutation, toast]);

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
    moveQuestionUp,
    moveQuestionDown,
    persistAllValidQuestions,
    hasValidContent: hasValidPersistedContent(questions),
    refetchActivity: () => void activity.refetch(),
    refetchItems: () => void items.refetch(),
  };
}