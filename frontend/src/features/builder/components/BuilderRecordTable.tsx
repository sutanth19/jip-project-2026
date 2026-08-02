import { Link } from "react-router-dom";

import { DataTable, StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { RendererBadge } from "@/features/builder/components/BuilderBadges";
import type { BuilderEntityConfig, BuilderRecord } from "@/features/builder/types/builder.types";
import { builderValueToText, getBuilderRecordId, getBuilderValue } from "@/features/builder/utils/builder-record";
import { formatDate } from "@/utils/date";

function renderCell(record: BuilderRecord, key: string, kind?: string) {
  const value = getBuilderValue(record, key);
  const text = builderValueToText(value);

  if (kind === "status") {
    return <StatusBadge status={text} />;
  }

  if (kind === "date" && typeof value === "string") {
    return formatDate(value);
  }

  if (kind === "badge") {
    return <RendererBadge renderer={text} />;
  }

  return text;
}

export function BuilderRecordTable({ config, rows }: { config: BuilderEntityConfig; rows: BuilderRecord[] }) {
  return (
    <DataTable
      rows={rows}
      getRowKey={getBuilderRecordId}
      columns={[
        ...config.columns.map((column) => ({
          key: column.key,
          header: column.label,
          render: (record: BuilderRecord) => renderCell(record, column.key, column.kind),
        })),
        {
          key: "actions",
          header: "Tindakan",
          render: (record: BuilderRecord) => (
            <Button asChild variant="outline" size="sm">
              <Link to={`${config.path}/${getBuilderRecordId(record)}`}>Lihat</Link>
            </Button>
          ),
        },
      ]}
    />
  );
}

