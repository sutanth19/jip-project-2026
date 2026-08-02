import { z } from "zod";

const uuid = (message: string) => z.string().trim().uuid(message);

export const attemptIdParamsSchema = z.object({ attemptId: uuid("ID percubaan tidak sah.") }).strict();
export const saveAttemptSchema = z.object({ answers: z.array(z.unknown()).default([]) }).strict();

export type SaveAttemptRequest = z.infer<typeof saveAttemptSchema>;
