export type ParentRecord = Record<string, unknown>;
export type ParentChild = ParentRecord & { id: string; fullName: string };
export type ParentResource = "assignments" | "submissions" | "assessments";
