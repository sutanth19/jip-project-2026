export type TeacherRecord = Record<string, unknown>;

export type TeacherListResult = {
  records: TeacherRecord[];
  pagination: { page: number; limit: number; total: number; totalPages?: number } | null;
};

export type TeacherResource =
  | "classes" | "students" | "activities" | "assignments" | "submissions"
  | "assessments" | "evidence" | "mastery" | "notifications" | "announcements" | "ai";
