import { BookOpen, Calculator, PencilLine, type LucideIcon } from "lucide-react";

export type AdminActivityTypeKey = "READING" | "WRITING" | "COUNTING";
export type AdminActivityTypeStatus = "AVAILABLE" | "COMING_SOON";
export type AdminActivityTypeTone = "primary" | "success" | "muted";

export type AdminActivityTypeOption = {
  key: AdminActivityTypeKey;
  title: string;
  description: string;
  buttonLabel: string;
  destination?: string;
  status: AdminActivityTypeStatus;
  icon: LucideIcon;
  tone: AdminActivityTypeTone;
};

export const adminActivityTypeOptions: AdminActivityTypeOption[] = [
  {
    key: "READING",
    title: "Membaca",
    description: "Aktiviti untuk mengenal, membina dan membaca huruf, suku kata, perkataan atau ayat.",
    buttonLabel: "Pilih Membaca",
    destination: "/admin/aktiviti/cipta/membaca",
    status: "AVAILABLE",
    icon: BookOpen,
    tone: "primary",
  },
  {
    key: "WRITING",
    title: "Menulis",
    description: "Aktiviti untuk menyalin, menaip, melengkapkan dan membina perkataan atau ayat.",
    buttonLabel: "Pilih Menulis",
    destination: "/admin/aktiviti/cipta/menulis",
    status: "AVAILABLE",
    icon: PencilLine,
    tone: "success",
  },
  {
    key: "COUNTING",
    title: "Mengira",
    description: "Aktiviti asas nombor, operasi matematik dan penyelesaian masalah.",
    buttonLabel: "Belum Tersedia",
    status: "COMING_SOON",
    icon: Calculator,
    tone: "muted",
  },
];

export const activityTypeToneClasses: Record<AdminActivityTypeTone, { icon: string; button: string }> = {
  primary: {
    icon: "border-primary/15 bg-primary/10 text-primary",
    button: "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary/30",
  },
  success: {
    icon: "border-secondary/20 bg-secondary/10 text-secondary",
    button: "bg-secondary text-secondary-foreground hover:bg-secondary/90 focus-visible:ring-secondary/30",
  },
  muted: {
    icon: "border-border bg-muted text-muted-foreground",
    button: "border-border bg-muted text-muted-foreground",
  },
};
