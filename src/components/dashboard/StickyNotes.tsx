import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, X, Pin, ClipboardList, Cloud, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { sbGetAppSetting, sbSetAppSetting } from '../../lib/supabaseClient';

interface Note {
  id: string;
  content: string;
  pinned: boolean;
  updatedAt: string;
}

const DEFAULT_NOTES: Note[] = [
  {
    id: '1',
    content: '2,4째주 금요일은 청소\n출근 9시 10분까지',
    pinned: true,
    updatedAt: new Date().toISOString(),
  },
];

const NOTES_KEY = 'sticky_notes'

async function apiGetNotes(): Promise<Note[]> {
  try {
    const raw = await sbGetAppSetting(NOTES_KEY)
    if (!raw) return []
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

async function apiSaveNotes(notes: Note[]): Promise<void> {
  try {
    await sbSetAppSetting(NOTES_KEY, JSON.stringify(notes))
  } catch {
    // silent fail
  }
}

function NoteEditor({
  note,
  compact,
  onSave,
  onCancel,
}: {
  note: Note;
  compact?: boolean;
  onSave: (content: string) => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const composing = useRef(false);

  useEffect(() => {
    ref.current?.focus();
    const len = ref.current?.value.length ?? 0;
    ref.current?.setSelectionRange(len, len);
  }, []);

  const save = () => {
    if (composing.current) return;
    onSave(ref.current?.value ?? '');
  };

  return (
    <textarea
      ref={ref}
      defaultValue={note.content}
      className="w-full h-full bg-transparent text-yellow-950 text-[11px] resize-none outline-none p-2.5 pt-7 font-medium leading-snug"
      placeholder="메모..."
      maxLength={80}
      onCompositionStart={() => { composing.current = true; }}
      onCompositionEnd={() => { composing.current = false; }}
      onBlur={() => { setTimeout(save, 50); }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        }
      }}
    />
  );
}

export default function StickyNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showList, setShowList] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    apiGetNotes().then((loaded) => {
      const parsed = loaded.length > 0 ? loaded : DEFAULT_NOTES;
      setNotes(parsed);
      setActiveId(parsed.find((n) => n.pinned)?.id ?? parsed[0]?.id ?? null);
      if (loaded.length > 0) setLastSynced(new Date().toISOString());
    });
  }, []);

  const persist = useCallback((updated: Note[]) => {
    setNotes(updated);
    apiSaveNotes(updated).then(() => setLastSynced(new Date().toISOString()));
  }, []);

  const sync = async () => {
    setSyncing(true);
    await apiSaveNotes(notes);
    setLastSynced(new Date().toISOString());
    setSyncing(false);
  };

  const saveNote = (id: string, content: string) => {
    setNotes((prev) => {
      const updated = prev.map((n) =>
        n.id === id ? { ...n, content, updatedAt: new Date().toISOString() } : n,
      );
      apiSaveNotes(updated).then(() => setLastSynced(new Date().toISOString()));
      return updated;
    });
    setEditingId(null);
  };

  const startEdit = (note: Note) => {
    setEditingId(note.id);
    setActiveId(note.id);
  };

  const addNote = () => {
    const note: Note = {
      id: Date.now().toString(),
      content: '',
      pinned: false,
      updatedAt: new Date().toISOString(),
    };
    persist([note, ...notes]);
    setActiveId(note.id);
    setEditingId(note.id);
    setShowList(false);
  };

  const deleteNote = (id: string) => {
    if (editingId === id) setEditingId(null);
    const updated = notes.filter((n) => n.id !== id);
    persist(updated);
    if (activeId === id) {
      setActiveId(updated.find((n) => n.pinned)?.id ?? updated[0]?.id ?? null);
    }
  };

  const togglePin = (id: string) => {
    persist(notes.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)));
  };

  const activeNote = notes.find((n) => n.id === activeId) ?? notes[0];

  const NoteSquare = ({ note, compact }: { note: Note; compact?: boolean }) => {
    const isEditing = editingId === note.id;

    return (
      <div
        className={clsx(
          'relative rounded-sm shadow-lg',
          compact ? 'w-[108px] h-[108px]' : 'w-[140px] h-[140px] mx-auto',
        )}
        style={{
          background: 'linear-gradient(160deg, #fef08a 0%, #fde047 55%, #facc15 100%)',
          boxShadow: '2px 3px 8px rgba(0,0,0,0.25)',
          transform: note.pinned ? 'rotate(-1.5deg)' : 'rotate(0.5deg)',
        }}
        onDoubleClick={() => { if (compact) { setActiveId(note.id); setShowList(false); startEdit(note); } }}
      >
        <div className="absolute top-1 right-1 flex gap-0.5 z-10">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => togglePin(note.id)}
            className={clsx(
              'w-5 h-5 rounded-sm flex items-center justify-center transition-colors',
              note.pinned ? 'bg-amber-200/80 text-amber-900' : 'bg-black/5 text-yellow-900/40 hover:bg-amber-200/60',
            )}
            title="고정"
          >
            <Pin className="w-3 h-3" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => deleteNote(note.id)}
            className="w-5 h-5 rounded-sm flex items-center justify-center bg-black/5 text-yellow-900/40 hover:text-red-700 hover:bg-red-100/60"
            title="삭제"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        {isEditing ? (
          <NoteEditor
            key={note.id}
            note={note}
            compact={compact}
            onSave={(content) => saveNote(note.id, content)}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <div
            role="button"
            tabIndex={0}
            className="w-full h-full cursor-text p-2.5 pt-7"
            onClick={() => startEdit(note)}
            onKeyDown={(e) => { if (e.key === 'Enter') startEdit(note); }}
          >
            <p className="text-yellow-950 text-[11px] whitespace-pre-wrap font-medium leading-snug h-full overflow-hidden pointer-events-none">
              {note.content || '클릭하여 입력'}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="card !p-0 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-navy-600">
        <h3 className="text-sm font-medium text-white">📌 스티커 메모</h3>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowList(!showList)}
            className={clsx(
              'flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors',
              showList ? 'bg-navy-700 text-accent-light' : 'text-slate-light hover:bg-navy-700',
            )}
          >
            <ClipboardList className="w-3 h-3" />
            목록 ({notes.length})
          </button>
          <button
            onClick={addNote}
            className="w-7 h-7 rounded border border-dashed border-navy-600 hover:border-accent text-slate-light hover:text-accent-light flex items-center justify-center transition-colors"
            title="메모 추가"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 px-3 py-4 min-h-[168px] flex items-center justify-center">
        {notes.length === 0 ? (
          <button
            onClick={addNote}
            className="w-[140px] h-[140px] rounded-sm border-2 border-dashed border-navy-600 flex flex-col items-center justify-center gap-2 text-slate-lab hover:border-accent hover:text-accent-light transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="text-xs">메모 추가</span>
          </button>
        ) : showList ? (
          <div className="flex flex-wrap gap-3 justify-center w-full">
            {notes.map((note) => (
              <NoteSquare key={note.id} note={note} compact />
            ))}
          </div>
        ) : activeNote ? (
          <NoteSquare note={activeNote} />
        ) : null}
      </div>

      <div className="flex items-center justify-between px-3 py-2 border-t border-navy-600 bg-navy-900/40">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-lab">
          <Cloud className="w-3 h-3" />
          {lastSynced ? (
            <span>Synced · {lastSynced.slice(0, 19)}</span>
          ) : (
            <span>Not synced</span>
          )}
        </div>
        <button
          onClick={sync}
          disabled={syncing}
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-slate-light hover:text-accent-light hover:bg-navy-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={clsx('w-3 h-3', syncing && 'animate-spin')} />
          {syncing ? 'Saving...' : 'Sync'}
        </button>
      </div>
    </div>
  );
}
