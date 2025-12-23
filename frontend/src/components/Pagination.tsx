import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number | ((prev: number) => number)) => void;
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: PaginationProps) {
  return (
    <div className="flex items-center justify-end space-x-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange((p) => Math.max(1, p - 1))}
        disabled={page === 1}
        data-testid="prev-page"
      >
        <ChevronLeft className="h-4 w-4" />
        Previous
      </Button>
      <div className="text-sm">
        Page {page} of {totalPages}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange((p) => p + 1)}
        disabled={page >= (totalPages || 1)}
        data-testid="next-page"
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
