import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ActivityWizard } from "@/features/builder/components/ActivityWizard";
import { MediaPreviewCard } from "@/features/builder/components/MediaPreviewCard";
import { SafeRecordDetails } from "@/features/builder/components/SafeRecordDetails";
import { activityWizardSteps, answerTypes, builderEntities, getBuilderEntity } from "@/features/builder/config";
import { normalizeBuilderList } from "@/features/builder/utils/builder-record";

describe("Phase 27C builder module contracts", () => {
  it("maps the required builder modules to existing backend endpoints", () => {
    expect(getBuilderEntity("curriculumVersions").endpoint).toBe("/curriculum/versions");
    expect(getBuilderEntity("questionBank").endpoint).toBe("/question-bank/items");
    expect(getBuilderEntity("activityTemplates").endpoint).toBe("/activity-templates");
    expect(getBuilderEntity("digitalActivities").endpoint).toBe("/digital-activities");
    expect(builderEntities.every((entity) => entity.roles.includes("TEACHER"))).toBe(true);
  });

  it("keeps backend enum values exact for Question Bank answer types", () => {
    expect(answerTypes.map((item) => item.value)).toEqual([
      "NONE",
      "SINGLE_CHOICE",
      "MULTIPLE_CHOICE",
      "TEXT",
      "BOOLEAN",
      "ORDERED_ITEMS",
      "MATCHING_PAIRS",
    ]);
  });

  it("normalizes real collection DTO names from curriculum, question bank, and activity endpoints", () => {
    expect(normalizeBuilderList({ versions: [{ id: "v1" }], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } }).items).toEqual([{ id: "v1" }]);
    expect(normalizeBuilderList({ questionBankItems: [{ id: "q1" }] }).items).toEqual([{ id: "q1" }]);
    expect(normalizeBuilderList({ templates: [{ id: "t1" }] }).items).toEqual([{ id: "t1" }]);
    expect(normalizeBuilderList({ activities: [{ id: "a1" }] }).items).toEqual([{ id: "a1" }]);
  });

  it("renders the 10-step activity wizard without duplicating the Activity Player", () => {
    const markup = renderToStaticMarkup(<ActivityWizard activeStep="preview" />);

    expect(activityWizardSteps).toHaveLength(10);
    expect(markup).toContain("Maklumat Asas");
    expect(markup).toContain("Pratonton");
    expect(markup).toContain("Terbit");
  });

  it("filters answer keys and sensitive storage/auth values from builder detail rendering", () => {
    const markup = renderToStaticMarkup(
      <SafeRecordDetails
        record={{
          id: "question-1",
          content: "Pilih jawapan",
          correctAnswer: { value: "secret-answer" },
          mediaKey: "private/storage/key.png",
          setupToken: "secret-token",
          pinHash: "secret-pin",
        }}
      />,
    );

    expect(markup).toContain("Pilih jawapan");
    expect(markup).not.toContain("secret-answer");
    expect(markup).not.toContain("private/storage/key.png");
    expect(markup).not.toContain("secret-token");
    expect(markup).not.toContain("secret-pin");
  });

  it("renders media previews by MIME family without raw storage paths", () => {
    const markup = renderToStaticMarkup(<MediaPreviewCard label="Audio rujukan" mimeType="audio/mpeg" />);

    expect(markup).toContain("Audio rujukan");
    expect(markup).toContain("audio/mpeg");
  });
});

