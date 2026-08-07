import "dotenv/config";
import { PrismaClient, DigitalActivityStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

type Mode = "dry-run" | "delete";

function parseArgs(argv: string[]): { mode: Mode; ids: string[]; includeAllDrafts: boolean } {
  const ids: string[] = [];
  let mode: Mode = "dry-run";
  let includeAllDrafts = false;

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--delete") {
      mode = "delete";
      continue;
    }
    if (arg === "--dry-run") {
      mode = "dry-run";
      continue;
    }
    if (arg === "--all-drafts") {
      includeAllDrafts = true;
      continue;
    }
    if (arg === "--id") {
      const value = argv[i + 1];
      if (!value) throw new Error("Missing value for --id");
      ids.push(value);
      i += 1;
      continue;
    }
    if (arg.startsWith("--id=")) {
      ids.push(arg.slice("--id=".length));
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return { mode, ids, includeAllDrafts };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const { mode, ids, includeAllDrafts } = parseArgs(process.argv);
  const where = ids.length > 0 ? { id: { in: ids } } : includeAllDrafts ? { status: DigitalActivityStatus.DRAFT } : { status: DigitalActivityStatus.DRAFT };

  const activities = await prisma.digitalActivity.findMany({
    where,
    select: {
      id: true,
      code: true,
      title: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      items: { select: { id: true, questionBankItemId: true } },
      curriculumLinks: { select: { id: true } },
      mediaLinks: { select: { id: true } },
      reviewHistory: { select: { id: true } },
      assignments: { select: { id: true } },
      pbdEvidence: { select: { id: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const questionBankItemIds = [
    ...new Set(activities.flatMap((activity) => activity.items.map((item) => item.questionBankItemId))),
  ];

  const counts = {
    activities: activities.length,
    items: activities.reduce((sum, activity) => sum + activity.items.length, 0),
    questionBankItemsReferenced: questionBankItemIds.length,
    curriculumLinks: activities.reduce((sum, activity) => sum + activity.curriculumLinks.length, 0),
    mediaLinks: activities.reduce((sum, activity) => sum + activity.mediaLinks.length, 0),
    reviewHistory: activities.reduce((sum, activity) => sum + activity.reviewHistory.length, 0),
    assignments: activities.reduce((sum, activity) => sum + activity.assignments.length, 0),
    pbdEvidence: activities.reduce((sum, activity) => sum + activity.pbdEvidence.length, 0),
  };

  console.log(JSON.stringify({ mode, ids, where, counts, activities }, null, 2));

  if (mode !== "delete") return;

  if (activities.length === 0) {
    console.log("Nothing to delete.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    const activityIds = activities.map((activity) => activity.id);

    if (activities.some((activity) => activity.assignments.length > 0)) {
      throw new Error("Refusing to delete activities that still have assignments.");
    }

    await tx.digitalActivityItem.deleteMany({ where: { digitalActivityId: { in: activityIds } } });
    await tx.digitalActivityMedia.deleteMany({ where: { digitalActivityId: { in: activityIds } } });
    await tx.digitalActivityCurriculumLink.deleteMany({ where: { digitalActivityId: { in: activityIds } } });
    await tx.digitalActivityReviewHistory.deleteMany({ where: { digitalActivityId: { in: activityIds } } });
    await tx.digitalActivity.deleteMany({ where: { id: { in: activityIds }, status: DigitalActivityStatus.DRAFT } });
  });

  console.log(JSON.stringify({ deletedActivities: activities.length, questionBankItemsStillKept: questionBankItemIds.length }, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
