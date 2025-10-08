import * as React from "react";
import { Check, ChevronsUpDown, UserRoundX } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Member } from "@/lib/members";

export function AssigneeSelect({
  members,
  value,
  onChange,
  placeholder = "Assign…",
}: {
  members: Member[];
  value: number | null | undefined;
  onChange: (userId: number | null) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = members.find((m) => m.id === value) || null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" role="combobox" aria-expanded={open} className="w-44 justify-between">
          {selected ? selected.name : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0">
        <Command>
          <CommandInput placeholder="Search people…" />
          <CommandEmpty>No people found.</CommandEmpty>

          <CommandGroup heading="Members">
            <CommandItem
              value="(unassigned)"
              onSelect={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              <UserRoundX className="mr-2 h-4 w-4 opacity-70" />
              <span>Unassigned</span>
              <Check className={cn("ml-auto h-4 w-4", !selected ? "opacity-100" : "opacity-0")} />
            </CommandItem>

            {members.map((m) => (
              <CommandItem
                key={m.id}
                value={`${m.name} ${m.github_login ?? ""}`.trim()}
                onSelect={() => {
                  onChange(m.id);
                  setOpen(false);
                }}
              >
                <span className="truncate">{m.name}</span>
                <Check className={cn("ml-auto h-4 w-4", selected?.id === m.id ? "opacity-100" : "opacity-0")} />
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
