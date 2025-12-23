import { ArrowDown, ArrowUp } from "lucide-react";

interface SortIconProps {
  field: string;
  sort?: string;
  order?: "asc" | "desc";
}

export const SortIcon = ({ field, sort, order }: SortIconProps) => {
  if (sort !== field) return null;
  return order === "asc" ? (
    <ArrowUp className="ml-2 h-4 w-4" />
  ) : (
    <ArrowDown className="ml-2 h-4 w-4" />
  );
};
