export type StudentRecord = Record<string, unknown>;
export type StudentList = { records: StudentRecord[]; pagination: StudentRecord | null };
export type StudentResource = "assignments" | "submissions" | "assessments" | "notifications" | "announcements";
