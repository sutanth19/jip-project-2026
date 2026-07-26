export const MEDIA_PURPOSES = [
  "AVATAR",
  "SCHOOL_LOGO",
  "ACTIVITY_IMAGE",
  "ACTIVITY_DOCUMENT",
  "ACTIVITY_AUDIO",
  "ACTIVITY_VIDEO",
  "TRACING_ASSET",
  "STUDENT_SUBMISSION_IMAGE",
  "STUDENT_SUBMISSION_AUDIO",
  "STUDENT_SUBMISSION_DOCUMENT",
] as const;

export type MediaPurpose = (typeof MEDIA_PURPOSES)[number];

export interface StorageUploadInput {
  temporaryFilePath: string;
  purpose: MediaPurpose;
  extension: string;
}

export interface StoredFile {
  key: string;
  url: string | null;
}

export interface StorageAdapter {
  upload(input: StorageUploadInput): Promise<StoredFile>;
  delete(fileKey: string): Promise<void>;
  exists(fileKey: string): Promise<boolean>;
  getPublicUrl(fileKey: string): string | null;
  resolveReadPath?(fileKey: string): string;
}
