import { apiRequest } from "@/lib/api";
import type {
  ArrangeSyllablesActivityDetail,
  ArrangeSyllablesItemDto,
  ArrangeSyllablesMediaForm,
  ArrangeSyllablesQuestionForm,
} from "@/features/admin/utils/arrange-syllables-content";
import {
  buildDigitalActivityItemPayload,
  buildDigitalActivityItemUpdatePayload,
  buildQuestionBankCurriculumLinkPayload,
  buildQuestionBankItemPayload,
  buildQuestionBankItemUpdatePayload,
} from "@/features/admin/utils/arrange-syllables-content";

type QuestionBankItemPayload = {
  item?: {
    id: string;
    status: string;
    programmeId: string;
  };
};

type DigitalActivityItemPayload = {
  item?: {
    id: string;
    sequence: number;
  };
};

type DigitalActivityItemsPayload = {
  items?: ArrangeSyllablesItemDto[];
};

type ActivityDetailPayload = {
  activity?: ArrangeSyllablesActivityDetail;
};

type QuestionBankMediaPayload = {
  media?: {
    id: string;
  };
};

export async function createQuestionBankItemForActivity(
  question: ArrangeSyllablesQuestionForm,
  programmeId: string,
): Promise<string> {
  const payload = buildQuestionBankItemPayload(question, programmeId);
  const response = await apiRequest<QuestionBankItemPayload>("/question-bank/items", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.item?.id) {
    throw new Error("Question bank item create response did not include an item ID.");
  }

  return response.item.id;
}

export async function addQuestionBankCurriculumLinkForActivity(
  itemId: string,
  activity: ArrangeSyllablesActivityDetail,
): Promise<void> {
  const payload = buildQuestionBankCurriculumLinkPayload(activity);
  await apiRequest(`/question-bank/items/${itemId}/curriculum-links`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function activateQuestionBankItemForActivity(itemId: string): Promise<void> {
  await apiRequest(`/question-bank/items/${itemId}/activate`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function updateQuestionBankItemForActivity(
  itemId: string,
  question: ArrangeSyllablesQuestionForm,
): Promise<void> {
  const payload = buildQuestionBankItemUpdatePayload(question);
  await apiRequest(`/question-bank/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function addDigitalActivityItem(
  activityId: string,
  question: ArrangeSyllablesQuestionForm,
  questionBankItemId: string,
): Promise<string> {
  const payload = buildDigitalActivityItemPayload(question, questionBankItemId);
  const response = await apiRequest<DigitalActivityItemPayload>(`/digital-activities/${activityId}/items`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.item?.id) {
    throw new Error("Digital activity item create response did not include an item ID.");
  }

  return response.item.id;
}

export async function updateDigitalActivityItem(
  activityId: string,
  activityItemId: string,
  question: ArrangeSyllablesQuestionForm,
): Promise<void> {
  const payload = buildDigitalActivityItemUpdatePayload(question);
  await apiRequest(`/digital-activities/${activityId}/items/${activityItemId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function removeDigitalActivityItem(activityId: string, activityItemId: string): Promise<void> {
  await apiRequest(`/digital-activities/${activityId}/items/${activityItemId}`, {
    method: "DELETE",
  });
}

export async function reorderDigitalActivityItems(activityId: string, activityItemIds: string[]): Promise<void> {
  await apiRequest(`/digital-activities/${activityId}/items/reorder`, {
    method: "PATCH",
    body: JSON.stringify({ activityItemIds }),
  });
}

export async function listDigitalActivityItems(activityId: string): Promise<ArrangeSyllablesItemDto[]> {
  const response = await apiRequest<DigitalActivityItemsPayload>(`/digital-activities/${activityId}/items`);
  return response.items ?? [];
}

export async function getActivityDetailForContent(activityId: string): Promise<ArrangeSyllablesActivityDetail> {
  const response = await apiRequest<ActivityDetailPayload>(`/digital-activities/${activityId}`);

  if (!response.activity?.id) {
    throw new Error("Digital activity detail response did not include an activity ID.");
  }

  return response.activity;
}

export async function addQuestionBankMediaForActivity(
  itemId: string,
  media: ArrangeSyllablesMediaForm,
): Promise<void> {
  const response = await apiRequest<QuestionBankMediaPayload>(`/question-bank/items/${itemId}/media`, {
    method: "POST",
    body: JSON.stringify({
      mediaKey: media.mediaKey,
      mediaRole: media.mediaRole,
      mimeType: media.mimeType ?? undefined,
      originalName: media.originalName ?? undefined,
      altText: media.altText ?? undefined,
      sequence: 0,
    }),
  });

  if (!response.media?.id) {
    throw new Error("Question bank media create response did not include a media link ID.");
  }
}

export async function removeQuestionBankMediaForActivity(
  itemId: string,
  mediaLinkId: string,
): Promise<void> {
  await apiRequest(`/question-bank/items/${itemId}/media/${mediaLinkId}`, {
    method: "DELETE",
  });
}
