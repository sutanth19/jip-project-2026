import { Link } from "react-router-dom";

import { DataTable, StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import type { AdminEntityConfig, AdminRecord } from "@/features/admin/types/admin.types";
import { getNestedValue, getRecordId, stringifyValue } from "@/features/admin/utils/record";
import { formatDate } from "@/utils/date";

function renderValue(record: AdminRecord, key: string, kind?: string) {
  const value = getNestedValue(record, key);

  if (kind === "status") {
    return <StatusBadge status={stringifyValue(value)} />;
  }

  if (kind === "date" && typeof value === "string") {
    return formatDate(value);
  }

  return stringifyValue(value);
}

export function AdminRecordTable({
  config,
  rows,
}: {
  config: AdminEntityConfig;
  rows: AdminRecord[];
}) {
  return (
    <DataTable
      rows={rows}
      getRowKey={getRecordId}
      emptyMessage="Belum ada rekod."
      columns={[
        ...config.columns.map((column) => ({
          key: column.key,
          header: column.label,
          render: (record: AdminRecord) => renderValue(record, column.key, column.kind),
        })),
        {
          key: "actions",
          header: "Tindakan",
          render: (record: AdminRecord) => (
            <Button asChild variant="outline" size="sm">
              <Link to={`${config.path}/${getRecordId(record)}`}>Lihat</Link>
            </Button>
          ),
        },
      ]}
    />
  );
}

