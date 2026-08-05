import { z } from "zod";

import type {
  TeacherParentCreatePayload,
  TeacherParentListItem,
  TeacherParentListQuery,
  TeacherParentListResponse,
  TeacherParentRelationship,
  TeacherParentStatus,
  TeacherParentUpdatePayload,
} from "@/features/teacher/types/teacher-parent.types";
import { formatDateTime } from "@/utils/date";

export const teacherParentPageSizeOptions = [10, 20, 50] as const;

export const teacherParentStatusOptions: { label: string; value: "all" | TeacherParentStatus }[] = [
  { label: "Semua status", value: "all" },
  { label: "Aktif", value: "ACTIVE" },
  { label: "Menunggu", value: "PENDING" },
  { label: "Digantung", value: "SUSPENDED" },
  { label: "Diarkibkan", value: "ARCHIVED" },
];

export const teacherParentRelationshipOptions: { label: string; value: "all" | TeacherParentRelationship }[] = [
  { label: "Semua hubungan", value: "all" },
  { label: "Father", value: "FATHER" },
  { label: "Mother", value: "MOTHER" },
  { label: "Guardian", value: "GUARDIAN" },
];

export const defaultTeacherParentQuery: TeacherParentListQuery = {
  page: 1,
  limit: 10,
  sortBy: "createdAt",
  sortOrder: "desc",
};

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringOr(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function teacherParentRelationshipLabel(value?: TeacherParentRelationship | null): string {
  if (value === "FATHER") return "Bapa";
  if (value === "MOTHER") return "Ibu";
  if (value === "GUARDIAN") return "Penjaga";
  return "Tidak ditetapkan";
}

export function teacherParentStatusLabel(value: TeacherParentStatus): string {
  if (value === "ACTIVE") return "Aktif";
  if (value === "PENDING") return "Menunggu";
  if (value === "SUSPENDED") return "Digantung";
  if (value === "ARCHIVED") return "Diarkibkan";
  return "Dikunci";
}

export function teacherParentSetupStatus(value: { accountStatus: TeacherParentStatus; isFirstLogin: boolean }): "PENDING" | "EXPIRED" | "COMPLETED" | "ARCHIVED" {
  if (value.accountStatus === "ARCHIVED") return "ARCHIVED";
  if (value.isFirstLogin) return "PENDING";
  return "COMPLETED";
}

export function teacherParentInitials(name: string): string {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return initials || "I";
}

export function formatTeacherParentDate(value: string | null, fallback = "Tidak tersedia"): string {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : formatDateTime(date);
}

export function normalizeTeacherParentListItem(value: unknown): TeacherParentListItem | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const id = stringOr(record.id);
  const fullName = stringOr(record.fullName);
  const phone = stringOr(record.phone);
  if (!id || !fullName || !phone) return null;

  return {
    id,
    fullName,
    phone,
    email: stringOr(record.email),
    occupation: stringOr(record.occupation),
    avatar: stringOr(record.avatar),
    accountStatus: (record.accountStatus as TeacherParentStatus | undefined) ?? "PENDING",
    studentCount: numberOr(record.studentCount, 0),
    relationship: (record.relationship as TeacherParentRelationship | null | undefined) ?? null,
  };
}

export function normalizeTeacherParentListResponse(payload: unknown): TeacherParentListResponse {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return { parents: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false } };
  }
  const record = payload as Record<string, unknown>;
  const parents = Array.isArray(record.parents)
    ? record.parents.map(normalizeTeacherParentListItem).filter((item): item is TeacherParentListItem => item !== null)
    : [];
  const pagination = typeof record.pagination === "object" && record.pagination !== null && !Array.isArray(record.pagination)
    ? (record.pagination as Record<string, unknown>)
    : {};
  return {
    parents,
    pagination: {
      page: numberOr(pagination.page, 1),
      limit: numberOr(pagination.limit, parents.length || 10),
      total: numberOr(pagination.total, parents.length),
      totalPages: numberOr(pagination.totalPages, parents.length > 0 ? 1 : 0),
      hasNextPage: Boolean(pagination.hasNextPage),
      hasPreviousPage: Boolean(pagination.hasPreviousPage),
    },
  };
}

export function teacherParentListQueryToSearchParams(query: Partial<TeacherParentListQuery>) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === "") return;
    params.set(key, String(value));
  });
  const value = params.toString();
  return value ? `?${value}` : "";
}

export function teacherParentResetQuery(): Partial<TeacherParentListQuery> {
  return { search: undefined, status: undefined, relationship: undefined, page: 1 };
}

export const teacherParentCreateFormSchema = z.object({
  fullName: z.string().trim().min(3, "Nama penuh diperlukan.").max(150, "Nama penuh terlalu panjang."),
  email: z.string().trim().email("E-mel tidak sah.").max(254, "E-mel terlalu panjang."),
  phone: z.string().trim().min(9, "Nombor telefon tidak sah.").max(20, "Nombor telefon terlalu panjang."),
  relationship: z.enum(["FATHER", "MOTHER", "GUARDIAN"]),
  studentIds: z.array(z.string().uuid("ID murid tidak sah.")).min(1, "Sekurang-kurangnya seorang murid perlu dipilih."),
  occupation: z.string().trim().max(100, "Pekerjaan terlalu panjang.").optional().or(z.literal("")),
  address: z.string().trim().max(500, "Alamat terlalu panjang.").optional().or(z.literal("")),
  avatar: z.string().trim().max(2048, "Avatar terlalu panjang.").optional().or(z.literal("")),
});

export const teacherParentEditFormSchema = z.object({
  fullName: z.string().trim().min(3, "Nama penuh diperlukan.").max(150, "Nama penuh terlalu panjang."),
  email: z.string().trim().email("E-mel tidak sah.").max(254, "E-mel terlalu panjang."),
  phone: z.string().trim().min(9, "Nombor telefon tidak sah.").max(20, "Nombor telefon terlalu panjang."),
  relationship: z.enum(["FATHER", "MOTHER", "GUARDIAN"]),
  studentIds: z.array(z.string().uuid("ID murid tidak sah.")).min(1, "Sekurang-kurangnya seorang murid perlu dipilih."),
  occupation: z.string().trim().max(100, "Pekerjaan terlalu panjang.").optional().or(z.literal("")),
  address: z.string().trim().max(500, "Alamat terlalu panjang.").optional().or(z.literal("")),
  avatar: z.string().trim().max(2048, "Avatar terlalu panjang.").optional().or(z.literal("")),
});

export type TeacherParentCreateFormInput = z.input<typeof teacherParentCreateFormSchema>;
export type TeacherParentCreateFormValues = z.output<typeof teacherParentCreateFormSchema>;
export type TeacherParentEditFormInput = z.input<typeof teacherParentEditFormSchema>;
export type TeacherParentEditFormValues = z.output<typeof teacherParentEditFormSchema>;

export const teacherParentCreateDefaultValues: TeacherParentCreateFormInput = {
  fullName: "",
  email: "",
  phone: "",
  relationship: "GUARDIAN",
  studentIds: [],
  occupation: "",
  address: "",
  avatar: "",
};

export function teacherParentEditDefaultValues(detail: { fullName: string; email: string | null; phone: string; relationship: TeacherParentRelationship | null; students: Array<{ student: { id: string } }> }): TeacherParentEditFormInput {
  return {
    fullName: detail.fullName,
    email: detail.email ?? "",
    phone: detail.phone,
    relationship: detail.relationship ?? "GUARDIAN",
    studentIds: detail.students.map((student) => student.student.id),
    occupation: "",
    address: "",
    avatar: "",
  };
}

export function buildTeacherParentCreatePayload(values: TeacherParentCreateFormValues): TeacherParentCreatePayload {
  return {
    fullName: values.fullName.trim(),
    email: values.email.trim(),
    phone: values.phone.trim(),
    relationship: values.relationship,
    studentIds: values.studentIds,
    occupation: values.occupation?.trim() || undefined,
    address: values.address?.trim() || undefined,
    avatar: values.avatar?.trim() || undefined,
  };
}

export function buildTeacherParentUpdatePayload(values: TeacherParentEditFormValues): TeacherParentUpdatePayload {
  return {
    fullName: values.fullName.trim(),
    email: values.email.trim(),
    phone: values.phone.trim(),
    relationship: values.relationship,
    studentIds: values.studentIds,
    occupation: values.occupation?.trim() || null,
    address: values.address?.trim() || null,
    avatar: values.avatar?.trim() || null,
  };
}
