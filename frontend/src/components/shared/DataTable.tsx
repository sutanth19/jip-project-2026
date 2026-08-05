import type { ReactNode } from "react";

type Column<T> = {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
};

type DataTableProps<T> = {
  rows: T[];
  columns: Column<T>[];
  getRowKey: (row: T) => string;
  emptyMessage?: string;
};

export function DataTable<T>({
  rows,
  columns,
  getRowKey,
  emptyMessage = "Tiada rekod.",
}: DataTableProps<T>) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-muted text-muted-foreground">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-4 py-3 text-left font-medium">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row) => (
              <tr key={getRowKey(row)} className="border-t">
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3 align-top">
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-4 py-8 text-center text-muted-foreground" colSpan={columns.length}>
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

