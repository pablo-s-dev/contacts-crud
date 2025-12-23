import { Search } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  onSearch,
  isLoading = false,
  placeholder = "Search by name, email, or phone...",
  className,
}: SearchInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onSearch();
    }
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className="max-w-sm"
      />
      <Button
        onClick={onSearch}
        disabled={isLoading}
        size="icon"
        variant="outline"
        type="button"
      >
        <Search className="h-4 w-4" />
      </Button>
    </div>
  );
}
