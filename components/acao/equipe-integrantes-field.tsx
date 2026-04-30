"use client";

import * as React from "react";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { nameAccentColor } from "@/lib/ui/name-accent-color";
import {
  subscribeTeamIntegrantes,
  type TeamIntegranteDoc,
} from "@/lib/firestore/team-integrantes";
import {
  displayNameFromDirectoryEntry,
  fetchUserDirectory,
} from "@/lib/firestore/user-profile";
import { GripVertical, Plus, Trash2, Users } from "lucide-react";

function buildPickRows(
  team: TeamIntegranteDoc[],
  accountLabels: string[],
  currentValue: string[],
): { key: string; label: string }[] {
  const sel = new Set(currentValue.map((s) => s.trim().toLowerCase()));
  const seen = new Set<string>();
  const out: { key: string; label: string }[] = [];
  const add = (key: string, label: string) => {
    const t = label.trim();
    if (!t) return;
    const lc = t.toLowerCase();
    if (sel.has(lc) || seen.has(lc)) return;
    seen.add(lc);
    out.push({ key, label: t });
  };
  for (const r of team) {
    add(`t:${r.id}`, r.nome);
  }
  for (let i = 0; i < accountLabels.length; i++) {
    add(`u:${i}`, accountLabels[i]!);
  }
  out.sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  return out;
}

function SortableIntegranteRow({
  id,
  name,
  disabled,
  onRemove,
}: {
  id: number;
  name: string;
  disabled?: boolean;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-2 py-2 shadow-sm",
        isDragging && "z-10 opacity-90 ring-2 ring-[#9b0ba6]/25",
      )}
    >
      <button
        type="button"
        className={cn(
          "touch-none rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600",
          disabled && "pointer-events-none opacity-40",
        )}
        aria-label="Arrastar para reordenar"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span
        className="min-w-0 flex-1 truncate text-sm font-medium"
        style={{ color: nameAccentColor(name) }}
      >
        {name}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-zinc-400 hover:text-red-600"
        disabled={disabled}
        aria-label={`Remover ${name}`}
        onClick={onRemove}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function EquipeIntegrantesField({
  value,
  onChange,
  disabled,
  subscribeActive = true,
  fieldKey,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  /** Se falso, não subscreve o Firestore (ex.: modal fechado). */
  subscribeActive?: boolean;
  /** Mudar quando o registo em edição muda (reinicia estado interno). */
  fieldKey?: string;
}) {
  const [roster, setRoster] = React.useState<TeamIntegranteDoc[]>([]);
  const [accountPickLabels, setAccountPickLabels] = React.useState<string[]>(
    [],
  );
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [pickerMode, setPickerMode] = React.useState<"list" | "other">("list");
  const [outroNome, setOutroNome] = React.useState("");

  React.useEffect(() => {
    if (!subscribeActive) {
      setRoster([]);
      return;
    }
    return subscribeTeamIntegrantes(setRoster, () => setRoster([]));
  }, [subscribeActive]);

  React.useEffect(() => {
    if (!subscribeActive) {
      setAccountPickLabels([]);
      return;
    }
    let cancelled = false;
    void fetchUserDirectory().then((rows) => {
      if (cancelled) return;
      const labels = rows
        .map((r) => displayNameFromDirectoryEntry(r))
        .filter((x): x is string => !!x?.trim());
      setAccountPickLabels(labels);
    });
    return () => {
      cancelled = true;
    };
  }, [subscribeActive]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function addNome(raw: string) {
    const nome = raw.trim();
    if (!nome) return;
    const exists = value.some(
      (v) => v.trim().toLowerCase() === nome.toLowerCase(),
    );
    if (exists) return;
    onChange([...value, nome]);
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (over == null || active.id === over.id) return;
    const from = Number(active.id);
    const to = Number(over.id);
    if (!Number.isFinite(from) || !Number.isFinite(to)) return;
    onChange(arrayMove(value, from, to));
  }

  const rosterOptions = React.useMemo(
    () => buildPickRows(roster, accountPickLabels, value),
    [roster, accountPickLabels, value],
  );

  return (
    <div
      key={fieldKey}
      className="rounded-2xl border border-zinc-100 bg-zinc-50/50 px-5 py-4"
    >
      <div className="mb-4 flex items-start gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[#9b0ba6] shadow-sm ring-1 ring-zinc-100">
          <Users className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-zinc-800">Integrantes</h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            Opcional — arraste para reordenar.
            {value.length > 0 ? ` (${value.length})` : ""}
          </p>
        </div>
      </div>
      <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <Popover
              open={pickerOpen}
              onOpenChange={(o) => {
                setPickerOpen(o);
                if (!o) {
                  setPickerMode("list");
                  setOutroNome("");
                }
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl border-zinc-200 bg-white"
                  disabled={disabled}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Adicionar integrante
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[min(100vw-2rem,22rem)] p-0"
                align="start"
              >
                {pickerMode === "other" ? (
                  <div className="space-y-2 p-3">
                    <Label htmlFor="equipe-outro" className="text-zinc-600">
                      Nome livre
                    </Label>
                    <Input
                      id="equipe-outro"
                      value={outroNome}
                      onChange={(e) => setOutroNome(e.target.value)}
                      placeholder="Ex.: Maria Silva"
                      className="h-10 border-zinc-200"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addNome(outroNome);
                          setOutroNome("");
                          setPickerMode("list");
                          setPickerOpen(false);
                        }
                      }}
                    />
                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="rounded-lg"
                        onClick={() => {
                          setPickerMode("list");
                          setOutroNome("");
                        }}
                      >
                        Voltar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="rounded-lg bg-[#9b0ba6] text-white hover:bg-[#820a8f]"
                        onClick={() => {
                          addNome(outroNome);
                          setOutroNome("");
                          setPickerMode("list");
                          setPickerOpen(false);
                        }}
                      >
                        Adicionar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Command>
                    <CommandInput placeholder="Buscar nome…" />
                    <CommandList>
                      <CommandEmpty>
                        {rosterOptions.length === 0
                          ? "Nenhuma sugestão — use “Outro…”."
                          : "Nenhum resultado."}
                      </CommandEmpty>
                      {rosterOptions.length > 0 ? (
                        <CommandGroup heading="Lista de equipas e contas">
                          {rosterOptions.map((r) => (
                            <CommandItem
                              key={r.key}
                              value={r.label}
                              onSelect={() => {
                                addNome(r.label);
                                setPickerOpen(false);
                              }}
                            >
                              {r.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      ) : null}
                      <CommandGroup>
                        <CommandItem
                          value="__outro__"
                          onSelect={() => setPickerMode("other")}
                        >
                          Outro…
                        </CommandItem>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                )}
              </PopoverContent>
            </Popover>
          </div>

          {value.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={value.map((_, i) => i)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="space-y-2">
                  {value.map((name, index) => (
                    <li key={`${name}-${index}`}>
                      <SortableIntegranteRow
                        id={index}
                        name={name}
                        disabled={disabled}
                        onRemove={() =>
                          onChange(value.filter((_, i) => i !== index))
                        }
                      />
                    </li>
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          ) : (
            <p className="text-sm text-zinc-500">
              Nenhum integrante indicado. Opcional — útil para panfletagem e
              relatórios.
            </p>
          )}
      </div>
    </div>
  );
}
