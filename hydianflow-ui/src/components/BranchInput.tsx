import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { SuggestionList } from "@/components/SuggestionList";
import { useBranchSearch } from "@/lib/github";

export function BranchInput({
  repoFullName,
  value,
  onChange,
  enabled,
}: {
  repoFullName: string;
  value: string;
  onChange: (v: string) => void;
  enabled: boolean;
}) {
  const [focus, setFocus] = useState(false);
  const [query, setQuery] = useState(value);
  const q = useBranchSearch(repoFullName, enabled);
  const allItems = q.data ?? [];
  const items = allItems.filter((n) => n.toLowerCase().includes(query.trim().toLowerCase()));
  const [idx, setIdx] = useState(0);
  useEffect(() => setIdx(0), [query, items.length, focus, repoFullName]);

  const valid = /^[^/]+\/[^/]+$/.test(repoFullName.trim());

  return (
    <div className="relative">
      <Input
        placeholder="feature/my-branch (optional)"
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v);
          setQuery(v);
        }}
        onFocus={() => setFocus(true)}
        onBlur={() => setTimeout(() => setFocus(false), 120)}
        disabled={!valid}
        onKeyDown={(e) => {
          if (!focus || items.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setIdx((i) => Math.min(i + 1, items.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setIdx((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            const choice = items[idx] ?? items[0];
            if (!choice) return;
            onChange(choice);
            setFocus(false);
          } else if (e.key === "Escape") {
            setFocus(false);
          }
        }}
      />
      <SuggestionList
        visible={focus && valid && (q.isLoading || items.length > 0)}
        items={items}
        emptyText={q.isLoading ? "Loading…" : (repoFullName ? "No branches" : "Pick a repo first")}
        activeIndex={idx}
        onSelect={(name) => {
          onChange(name);
          setQuery(name);
          setFocus(false);
        }}
      />
    </div>
  );
}


