export function SuggestionList({
  visible,
  items,
  onSelect,
  emptyText,
  activeIndex,
}: {
  visible: boolean;
  items: string[];
  onSelect: (v: string) => void;
  emptyText?: string;
  activeIndex?: number;
}) {
  if (!visible) return null;
  return (
    <div className="absolute z-50 mt-1 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-sm max-h-56">
      {items.length === 0 ? (
        <div className="px-3 py-2 text-sm text-muted-foreground">{emptyText ?? "No results"}</div>
      ) : (
        <ul role="listbox" className="py-1">
          {items.map((v, i) => (
            <li
              key={v}
              role="option"
              tabIndex={-1}
              className={`cursor-pointer px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground ${
                activeIndex === i ? "bg-accent text-accent-foreground" : ""
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(v);
              }}
            >
              {v}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


