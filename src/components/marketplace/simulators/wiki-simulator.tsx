"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, FileText, Edit3, Eye, Trash2, Loader2, BookOpen } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { AppSimulatorProps } from "../app-simulator";

interface WikiPage {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

interface WikiData {
  pages: WikiPage[];
}

const DEFAULT_HOME_CONTENT = `# Welcome to Markdown Wiki

This is your **personal wiki** powered by Markdown. All pages are persisted to your deployment's dedicated volume and survive container restarts.

## Features

- **Live preview** — toggle between edit and view mode
- **Markdown rendering** — full Markdown syntax support
- **Persistent storage** — all data saved to your volume
- **Multiple pages** — create as many pages as you need

## Getting started

1. Click **New Page** in the sidebar to create a page
2. Use the **Edit** toggle to write Markdown content
3. Click **View** to see the rendered result

> Your wiki data is stored in volume and survives restarts!
`;

function generateId(): string {
  return Math.random().toString(36).slice(2);
}

function parseWikiData(raw?: string): WikiData {
  if (!raw) {
    return {
      pages: [
        {
          id: generateId(),
          title: "Home",
          content: DEFAULT_HOME_CONTENT,
          updatedAt: Date.now(),
        },
      ],
    };
  }
  try {
    const parsed = JSON.parse(raw) as WikiData;
    if (parsed && Array.isArray(parsed.pages)) return parsed;
  } catch {
    /* ignore */
  }
  return {
    pages: [
      {
        id: generateId(),
        title: "Home",
        content: DEFAULT_HOME_CONTENT,
        updatedAt: Date.now(),
      },
    ],
  };
}

/**
 * Wiki simulator — a lightweight wiki engine that renders Markdown content
 * with live preview. All pages are persisted to the deployment's dedicated
 * volume under the key "wiki_pages".
 */
export function WikiSimulator(props: AppSimulatorProps) {
  const volumeApi = `/api/preview/${props.subdomain}/volume`;

  // Compute initial data ONCE to avoid generating different random IDs
  // for wikiData and selectedPageId.
  const [initialData] = useState(() => parseWikiData(props.initialData["wiki_pages"]));

  const [wikiData, setWikiData] = useState<WikiData>(() => initialData);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(() =>
    initialData.pages.length > 0 ? initialData.pages[0].id : null
  );
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [showNewPage, setShowNewPage] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const saveToVolume = useCallback(
    (data: WikiData) => {
      void fetch(volumeApi, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          op: "set",
          key: "wiki_pages",
          value: JSON.stringify(data),
        }),
      });
    },
    [volumeApi]
  );

  useEffect(() => {
    if (busy) return;
    saveToVolume(wikiData);
  }, [wikiData, busy, saveToVolume]);

  const selectedPage = wikiData.pages.find((p) => p.id === selectedPageId) ?? null;

  function startEditing() {
    if (!selectedPage) return;
    setEditTitle(selectedPage.title);
    setEditContent(selectedPage.content);
    setEditing(true);
  }

  function saveEdit() {
    if (!selectedPage) return;
    setBusy(true);
    const updated = {
      ...wikiData,
      pages: wikiData.pages.map((p) =>
        p.id === selectedPage.id
          ? { ...p, title: editTitle.trim() || p.title, content: editContent, updatedAt: Date.now() }
          : p
      ),
    };
    setWikiData(updated);
    setEditing(false);
    setBusy(false);
  }

  function cancelEdit() {
    setEditing(false);
    setEditContent("");
    setEditTitle("");
  }

  function createPage() {
    if (!newTitle.trim()) return;
    setBusy(true);
    const newPage: WikiPage = {
      id: generateId(),
      title: newTitle.trim(),
      content: `# ${newTitle.trim()}\n\nStart writing here...`,
      updatedAt: Date.now(),
    };
    const updated = { ...wikiData, pages: [...wikiData.pages, newPage] };
    setWikiData(updated);
    setSelectedPageId(newPage.id);
    setNewTitle("");
    setShowNewPage(false);
    setBusy(false);
  }

  function deletePage(id: string) {
    setBusy(true);
    const updated = {
      ...wikiData,
      pages: wikiData.pages.filter((p) => p.id !== id),
    };
    setWikiData(updated);
    if (selectedPageId === id) {
      setSelectedPageId(updated.pages.length > 0 ? updated.pages[0].id : null);
    }
    setBusy(false);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
      {/* Sidebar */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <BookOpen className="size-4 text-violet-600" /> Pages
          </h2>
          <button
            onClick={() => setShowNewPage(!showNewPage)}
            className="inline-flex items-center gap-1 rounded-md bg-violet-600/10 px-2 py-1 text-xs font-medium text-violet-600 transition-colors hover:bg-violet-600/20"
          >
            <Plus className="size-3" /> New
          </button>
        </div>

        {showNewPage && (
          <div className="mt-3 space-y-2">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Page title"
              onKeyDown={(e) => e.key === "Enter" && createPage()}
              className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-sm shadow-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
            />
            <button
              onClick={createPage}
              disabled={!newTitle.trim() || busy}
              className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-violet-600 px-2.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-violet-700 disabled:opacity-50"
            >
              <Plus className="size-3" /> Create page
            </button>
          </div>
        )}

        <div className="mt-3 max-h-[28rem] space-y-1 overflow-y-auto pr-1">
          {wikiData.pages.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">No pages yet</p>
          ) : (
            wikiData.pages.map((page) => (
              <button
                key={page.id}
                onClick={() => {
                  setSelectedPageId(page.id);
                  setEditing(false);
                }}
                className={`group flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors ${
                  selectedPageId === page.id
                    ? "bg-violet-600/10 font-medium text-violet-700 dark:text-violet-300"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <FileText className="size-3.5 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{page.title}</span>
                {wikiData.pages.length > 1 && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePage(page.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.stopPropagation();
                        deletePage(page.id);
                      }
                    }}
                    className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                    aria-label="Delete page"
                  >
                    <Trash2 className="size-3" />
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        <p className="mt-4 text-[11px] text-muted-foreground">
          Saved to <span className="font-mono">{props.volumeName}</span>
        </p>
      </div>

      {/* Main content */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        {!selectedPage ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BookOpen className="size-10 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No page selected</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Select a page from the sidebar or create a new one.
            </p>
          </div>
        ) : editing ? (
          /* Edit mode */
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-violet-600">Editing: {selectedPage.title}</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={cancelEdit}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-violet-700 disabled:opacity-50"
                >
                  {busy ? <Loader2 className="size-3 animate-spin" /> : null} Save
                </button>
              </div>
            </div>

            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Page title"
              className="mt-4 h-9 w-full rounded-md border border-input bg-background px-3 text-sm font-semibold shadow-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
            />

            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Write Markdown content..."
              rows={18}
              className="mt-3 w-full resize-none rounded-md border border-input bg-background px-3 py-2 font-mono text-sm shadow-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
            />
          </div>
        ) : (
          /* View mode */
          <div>
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="size-4 text-violet-600" /> {selectedPage.title}
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">
                  Updated {new Date(selectedPage.updatedAt).toLocaleString()}
                </span>
                <button
                  onClick={startEditing}
                  className="inline-flex items-center gap-1.5 rounded-md bg-violet-600/10 px-2.5 py-1 text-xs font-medium text-violet-600 transition-colors hover:bg-violet-600/20"
                >
                  <Edit3 className="size-3" /> Edit
                </button>
              </div>
            </div>

            <div className="prose prose-sm mt-4 max-w-none dark:prose-invert">
              <ReactMarkdown>{selectedPage.content}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
