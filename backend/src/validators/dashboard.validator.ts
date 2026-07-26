import { z } from "zod";

export const dashboardQuerySchema = z.object({
  recentLimit: z.coerce.number().int().min(1).max(20).default(5),
}).strict();

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
