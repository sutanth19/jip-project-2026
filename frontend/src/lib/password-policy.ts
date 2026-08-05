export type PasswordRequirement = {
  id: "length" | "uppercase" | "lowercase" | "number" | "special";
  label: string;
  isMet: (value: string) => boolean;
};

export const passwordRequirements: PasswordRequirement[] = [
  {
    id: "length",
    label: "Sekurang-kurangnya 8 aksara",
    isMet: (value) => value.length >= 8 && value.length <= 128,
  },
  {
    id: "uppercase",
    label: "Sekurang-kurangnya 1 huruf besar",
    isMet: (value) => /[A-Z]/.test(value),
  },
  {
    id: "lowercase",
    label: "Sekurang-kurangnya 1 huruf kecil",
    isMet: (value) => /[a-z]/.test(value),
  },
  {
    id: "number",
    label: "Sekurang-kurangnya 1 nombor",
    isMet: (value) => /[0-9]/.test(value),
  },
  {
    id: "special",
    label: "Sekurang-kurangnya 1 aksara khas",
    isMet: (value) => /[^A-Za-z0-9\s]/.test(value),
  },
];

export function getPasswordRequirementStatus(value: string) {
  return passwordRequirements.map((requirement) => ({
    ...requirement,
    met: requirement.isMet(value),
  }));
}

export function isStrongPassword(value: string): boolean {
  return passwordRequirements.every((requirement) => requirement.isMet(value));
}

export function getPasswordStrength(value: string): {
  score: number;
  label: "Masukkan kata laluan" | "Lemah" | "Sederhana" | "Kuat" | "Sangat kuat";
} {
  if (!value) {
    return { score: 0, label: "Masukkan kata laluan" };
  }

  const metCount = getPasswordRequirementStatus(value).filter((requirement) => requirement.met).length;

  if (metCount <= 2) {
    return { score: metCount, label: "Lemah" };
  }

  if (metCount === 3) {
    return { score: metCount, label: "Sederhana" };
  }

  if (metCount === 4) {
    return { score: metCount, label: "Kuat" };
  }

  return { score: metCount, label: "Sangat kuat" };
}
