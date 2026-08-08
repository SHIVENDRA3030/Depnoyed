"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, StickyNote, Loader2 } from "lucide-react";
import type { AppSimulatorProps } from "../app-simulator";

interface Note {
  id: string;
  title: string;
  body: string;
  updatedAt: number;
}

/**
 * Notes simulator — a lightweight Gitea-style "self-hosted" app whose data is
 * persisted to the deployment's dedicated volume under the key "notes_doc".
 */
export function NotesSimulator(props: AppSimulatorProps) {
  const volumeApi = `/api/preview/${props.subdomain}/volume`;
  const [notes, setNotes] = useState<Note[]>(() => parseNotes(props.initialData["notes_doc"]));
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Keep the volume in sync whenever notes change.
    if (busy) return;
    void fetch(volumeApi, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ op: "set", key: "notes_doc", value: JSON.stringify(notes) }),
    });
  }, [notes, busy, volumeApi]);

  function addNote() {
    if (!title.trim() && !body.trim()) return;
    const note: Note = {
      id: Math.random().toString(36).slice(2),
      title: title.trim() || "Untitled",
      body: body.trim(),
      updatedAt: Date.now(),
    };
    setNotes((n) => [note, ...n]);
    setTitle("");
    setBody("");
  }

  async function deleteNote(id: string) {
    setBusy(true);
    setNotes((n) => n.filter((x) => x.id !== id));
    setBusy(false);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Plus className="size-4 text-emerald-600" /> New note
        </h2>
        <div className="mt-4 space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write something…"
            rows={6}
            className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
          <button
            onClick={addNote}
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700"
          >
            <Plus className="size-4" /> Add note
          </button>
        </div>
        <p className="mt-4 text-[11px] text-muted-foreground">
          Notes are saved to volume <span className="font-mono">{props.volumeName}</span> and survive restarts.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <StickyNote className="size-4 text-emerald-600" /> Your notes
          </h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {notes.length} total
          </span>
        </div>

        <div className="mt-4 max-h-[28rem] space-y-3 overflow-y-auto pr-1">
          {notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
              <StickyNote className="size-7 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">No notes yet. Create one to see persistence in action.</p>
            </div>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="group rounded-lg border border-border bg-background p-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold">{note.title}</h3>
                  <button
                    onClick={() => deleteNote(note.id)}
                    disabled={busy}
                    className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                    aria-label="Delete note"
                  >
                    {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                  </button>
                </div>
                {note.body && <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{note.body}</p>}
                <p className="mt-2 text-[10px] text-muted-foreground/70">
                  {new Date(note.updatedAt).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function parseNotes(raw?: string): Note[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Note[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}
