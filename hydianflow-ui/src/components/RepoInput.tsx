import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { SuggestionList } from "@/components/SuggestionList";
import { useRepoSearch, type RepoOpt } from "@/lib/github";

export function RepoInput({
  value,
  onChange,
  onConfirm,
}: {
  value: string;
  onChange: (v: string) => void;
  onConfirm: (fullName: string) => void;
}) {
  const [query, setQuery] = useState(value);
  const [focus, setFocus] = useState(false);
  const itemsQuery = useRepoSearch(query);
  const items = (itemsQuery.data ?? []).map((r: RepoOpt) => r.full_name);
  const [idx, setIdx] = useState(0);

  useEffect(() => setIdx(0), [query, items.length, focus]);

  return (
    <div className="relative">
      <Input
        placeholder="owner/repo (optional)"
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v);
          setQuery(v);
        }}
        onFocus={() => setFocus(true)}
        onBlur={() => setTimeout(() => setFocus(false), 120)}
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
            onConfirm(choice);
            setFocus(false);
          } else if (e.key === "Escape") {
            setFocus(false);
          }
        }}
      />
      <SuggestionList
        visible={focus && items.length > 0}
        items={items}
        emptyText={query.length >= 2 ? "No repositories" : "Type at least 2 characters"}
        activeIndex={idx}
        onSelect={(full) => {
          onConfirm(full);
          setFocus(false);
        }}
      />
    </div>
  );
}


