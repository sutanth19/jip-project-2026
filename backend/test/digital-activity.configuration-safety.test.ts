import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { assertSafeMetadata } from "../src/utils/safe-json-schema.js";
import { validateDigitalActivityItemConfigurationForPersistence } from "../src/services/digitalActivity.service.js";
import { validateArrangeSyllablesConfiguration } from "../src/contracts/arrange-syllables.contract.js";

const allowedMediaUrlPaths = [
  ["arrangeSyllables", "media", "image", "url"],
  ["arrangeSyllables", "media", "audio", "url"],
] as const;

const validArrangeSyllablesConfiguration = {
  arrangeSyllables: {
    mode: "MISSING_SYLLABLES",
    interactionMode: "DRAG_TO_BLANK",
    words: [
      {
        id: "word-1",
        sequence: 1,
        syllables: [
          { id: "syllable-1", value: "BA", sequence: 1, isMissing: false },
          { id: "syllable-2", value: "TU", sequence: 2, isMissing: true },
        ],
      },
    ],
    distractors: [{ id: "distractor-1", value: "LA", sequence: 1 }],
    hint: null,
    media: {
      image: {
        mediaKey: "activity-image/example.png",
        url: "https://example.com/example.png",
        mimeType: "image/png",
        originalName: "example.png",
        mediaRole: "PRIMARY_IMAGE" as const,
        altText: null,
      },
      audio: {
        mediaKey: "activity-audio/example.mp3",
        url: "https://example.com/example.mp3",
        mimeType: "audio/mpeg",
        originalName: "example.mp3",
        mediaRole: "REFERENCE_AUDIO" as const,
        altText: null,
      },
    },
    showReferenceText: false,
    allowRetry: true,
    clearOnRetry: false,
    maximumSyllables: 10,
  },
};

test("safe metadata accepts ordinary structures and explicit Arrange Syllables media URLs only on the allowed paths", () => {
  assert.doesNotThrow(() => assertSafeMetadata({ plain: "teks selamat", nested: [{ count: 1 }, true, null] }));
  assert.doesNotThrow(() => assertSafeMetadata(validArrangeSyllablesConfiguration, { allowedUrlPaths: allowedMediaUrlPaths }));
  assert.doesNotThrow(() => validateDigitalActivityItemConfigurationForPersistence("arrange-syllables", validArrangeSyllablesConfiguration));
});

test("safe metadata rejects unsafe URLs, prototype pollution and unsupported URL paths", () => {
  assert.throws(() => assertSafeMetadata({ nested: { url: "https://example.com/blocked.png" } }));
  assert.throws(() => assertSafeMetadata({ arrangeSyllables: { media: { image: { url: "javascript:alert(1)" } } } }, { allowedUrlPaths: allowedMediaUrlPaths }));
  assert.throws(() => assertSafeMetadata({ arrangeSyllables: { media: { image: { url: "data:text/plain,boom" } } } }, { allowedUrlPaths: allowedMediaUrlPaths }));
  assert.throws(() => assertSafeMetadata({ __proto__: { polluted: true } }));
});

test("Arrange Syllables contract still rejects unsupported media fields while the persistence layer accepts the valid media shape", () => {
  assert.throws(() => validateArrangeSyllablesConfiguration({
    arrangeSyllables: {
      ...validArrangeSyllablesConfiguration.arrangeSyllables,
      media: {
        ...validArrangeSyllablesConfiguration.arrangeSyllables.media,
        poster: {
          mediaKey: "activity-image/poster.png",
          url: "https://example.com/poster.png",
          mimeType: "image/png",
          originalName: "poster.png",
          mediaRole: "PRIMARY_IMAGE",
          altText: null,
        },
      } as never,
    },
  }));
  assert.doesNotThrow(() => validateDigitalActivityItemConfigurationForPersistence("arrange-syllables", validArrangeSyllablesConfiguration));
});

test("Digital Activity item create/update paths use the same persistence safety helper", async () => {
  const serviceSource = await readFile(new URL("../src/services/digitalActivity.service.ts", import.meta.url), "utf8");

  assert.ok(serviceSource.includes("validateDigitalActivityItemConfigurationForPersistence"));
  assert.ok(serviceSource.includes("arrangeSyllablesMediaUrlPaths"));
});

test("Digital Activity preview keeps settingsCompletedAt in the preview payload", async () => {
  const serviceSource = await readFile(new URL("../src/services/digitalActivity.service.ts", import.meta.url), "utf8");

  assert.ok(serviceSource.includes("settingsCompletedAt: record.settingsCompletedAt"));
});
