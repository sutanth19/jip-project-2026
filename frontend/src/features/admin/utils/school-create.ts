import { z } from "zod";

import { isValidMalaysianPhone } from "@/features/admin/utils/admin-account-edit";
import { parseApiError } from "@/lib/api";

export type SchoolCreateFieldName =
  | "schoolCode"
  | "schoolName"
  | "principalName"
  | "contactEmail"
  | "phone"
  | "address"
  | "logo";

export type SchoolCreateValues = Record<SchoolCreateFieldName, string>;

export type SchoolCreatePayload = {
  schoolCode: string;
  schoolName: string;
  address: string;
  phone: string;
  principalName?: string;
  contactEmail?: string;
  logo?: string;
};

export type SchoolCreateSubmissionError = {
  field?: SchoolCreateFieldName;
  message: string;
};

export const schoolCreateDefaultValues: SchoolCreateValues = {
  schoolCode: "",
  schoolName: "",
  principalName: "",
  contactEmail: "",
  phone: "",
  address: "",
  logo: "",
};

const optionalTrimmed = z.string().trim();

export const schoolCreateFormSchema = z.object({
  schoolCode: z
    .string()
    .trim()
    .min(2, "Kod sekolah diperlukan.")
    .max(30, "Kod sekolah terlalu panjang.")
    .regex(
      /^[A-Za-z0-9_-]+$/,
      "Kod sekolah hanya boleh mengandungi huruf, nombor, garis bawah dan tanda sempang.",
    ),
  schoolName: z
    .string()
    .trim()
    .min(3, "Nama sekolah diperlukan.")
    .max(150, "Nama sekolah terlalu panjang."),
  principalName: optionalTrimmed.max(150, "Nama pengetua terlalu panjang."),
  contactEmail: optionalTrimmed
    .refine((value) => value === "" || z.email().safeParse(value).success, {
      message: "Sila masukkan alamat e-mel yang sah.",
    })
    .refine((value) => value.length <= 254, {
      message: "E-mel perhubungan terlalu panjang.",
    }),
  phone: z
    .string()
    .trim()
    .min(1, "Nombor telefon diperlukan.")
    .refine(isValidMalaysianPhone, {
      message: "Sila masukkan nombor telefon Malaysia yang sah.",
    }),
  address: z
    .string()
    .trim()
    .min(5, "Alamat sekolah diperlukan.")
    .max(500, "Alamat sekolah terlalu panjang."),
  logo: optionalTrimmed
    .max(2_048, "Laluan logo terlalu panjang.")
    .refine((value) => value === "" || value.startsWith("/") || /^https?:\/\//i.test(value), {
      message: "Logo mestilah URL atau laluan yang sah.",
    }),
});

export function buildSchoolCreatePayload(values: SchoolCreateValues): SchoolCreatePayload {
  const payload: SchoolCreatePayload = {
    schoolCode: values.schoolCode.trim().toUpperCase(),
    schoolName: values.schoolName.trim(),
    address: values.address.trim(),
    phone: values.phone.trim(),
  };
  const principalName = values.principalName.trim();
  const contactEmail = values.contactEmail.trim().toLowerCase();
  const logo = values.logo.trim();

  if (principalName) {
    payload.principalName = principalName;
  }

  if (contactEmail) {
    payload.contactEmail = contactEmail;
  }

  if (logo) {
    payload.logo = logo;
  }

  return payload;
}

function displayCreateValue(value: string): string {
  return value.trim() ? value.trim() : "Tidak tersedia";
}

export function getSchoolCreateSummary(values: SchoolCreateValues) {
  return [
    { name: "schoolCode", label: "Kod sekolah", value: values.schoolCode.trim().toUpperCase() },
    { name: "schoolName", label: "Nama sekolah", value: displayCreateValue(values.schoolName) },
    { name: "principalName", label: "Nama pengetua", value: displayCreateValue(values.principalName) },
    { name: "contactEmail", label: "E-mel perhubungan", value: displayCreateValue(values.contactEmail) },
    { name: "phone", label: "Nombor telefon", value: displayCreateValue(values.phone) },
    { name: "address", label: "Alamat", value: displayCreateValue(values.address) },
  ] satisfies Array<{ name: SchoolCreateFieldName; label: string; value: string }>;
}

export function isSchoolCreateSubmitEnabled({
  isValid,
  isSubmitting,
}: {
  isValid: boolean;
  isSubmitting: boolean;
}): boolean {
  return isValid && !isSubmitting;
}

export function mapSchoolCreateSubmissionError(error: unknown): SchoolCreateSubmissionError {
  const parsed = parseApiError(error);

  if (parsed.code === "SCHOOL_CODE_EXISTS") {
    return { field: "schoolCode", message: "Kod sekolah ini telah digunakan." };
  }

  if (parsed.code === "SCHOOL_NAME_EXISTS") {
    return { field: "schoolName", message: "Nama sekolah ini telah digunakan." };
  }

  if (parsed.code === "SCHOOL_EMAIL_EXISTS") {
    return {
      field: "contactEmail",
      message: "E-mel perhubungan ini telah digunakan oleh sekolah lain.",
    };
  }

  if (parsed.code === "SCHOOL_CONFLICT") {
    return { message: "Maklumat sekolah bercanggah dengan rekod sedia ada." };
  }

  if (parsed.code === "UNKNOWN_ERROR" || !parsed.message) {
    return { message: "Sekolah tidak dapat dicipta. Sila cuba sekali lagi." };
  }

  return { message: parsed.message };
}
