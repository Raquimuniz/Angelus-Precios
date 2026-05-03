import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, X } from "lucide-react";

interface MultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Seleccionar...",
  className = "",
}: MultiSelectProps) {
  const toggle = (opt: string) => {
    if (selected.includes(opt)) onChange(selected.filter(s => s !== opt));
    else onChange([...selected, opt]);
  };

  const allSelected = selected.length === options.length;

  const toggleAll = () => {
    if (allSelected) onChange([]);
    else onChange([...options]);
  };

  const label =
    selected.length === 0
      ? placeholder
      : selected.length === 1
      ? selected[0]
      : `${selected.length} seleccionados`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`h-9 min-w-[180px] max-w-xs justify-between gap-2 text-sm font-normal ${className}`}
        >
          <span className="truncate text-left flex-1">
            {selected.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              label
            )}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-2 w-64" align="start" style={{ maxHeight: 320, overflowY: "auto" }}>
        <div
          className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer border-b mb-1 pb-2"
          onClick={toggleAll}
        >
          <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
          <span className="text-sm font-semibold">Todos</span>
          {selected.length > 0 && (
            <span
              className="ml-auto text-xs text-muted-foreground hover:text-destructive"
              onClick={(e) => { e.stopPropagation(); onChange([]); }}
            >
              <X className="h-3 w-3" />
            </span>
          )}
        </div>
        {options.map(opt => (
          <div
            key={opt}
            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
            onClick={() => toggle(opt)}
          >
            <Checkbox
              checked={selected.includes(opt)}
              onCheckedChange={() => toggle(opt)}
            />
            <span className="text-sm truncate">{opt}</span>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}
