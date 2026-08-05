import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  return (
    <nav className="flex items-center justify-between gap-3" aria-label="Pagination">
      <Button
        type="button"
        variant="outline"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Sebelum
      </Button>
      <span className="text-sm text-muted-foreground">
        Halaman {page} daripada {Math.max(totalPages, 1)}
      </span>
      <Button
        type="button"
        variant="outline"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Seterus
        <ChevronRight className="size-4" aria-hidden="true" />
      </Button>
    </nav>
  );
}

