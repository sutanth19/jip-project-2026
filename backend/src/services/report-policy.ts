import { MasteryLevel, ProgressTrend } from "@prisma/client";

/** Digital MoLIB visualisation policy, not an official PBD scoring scale. */
export const REPORT_POLICY = {
  levelWeights: { [MasteryLevel.NOT_STARTED]: 0, [MasteryLevel.EMERGING]: 25, [MasteryLevel.DEVELOPING]: 50, [MasteryLevel.ACHIEVED]: 75, [MasteryLevel.MASTERED]: 100 } as const,
  trendLabels: { [ProgressTrend.IMPROVING]: "Meningkat", [ProgressTrend.STABLE]: "Stabil", [ProgressTrend.DECLINING]: "Menurun", [ProgressTrend.INSUFFICIENT_DATA]: "Data tidak mencukupi" } as const,
  reportTitle: "Laporan Kemajuan Literasi Digital",
} as const;
