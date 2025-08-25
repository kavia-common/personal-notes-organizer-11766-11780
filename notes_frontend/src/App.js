import React, { useEffect, useMemo, useState } from 'react';
import './App.css';
import './index.css';

/**
 * Types
 */
const DEFAULT_CATEGORIES = ['All Notes', 'Personal', 'Work', 'Ideas', 'Archive'];

/**
 * Utilities for Local Storage persistence
 */
const STORAGE_KEYS = {
  NOTES: 'notes_frontend__notes',
  CATEGORIES: 'notes_frontend__categories',
  THEME: 'notes_frontend__theme',
};

function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

/**
 * Data helpers
 */
function createNote({ title = '', content = '', category = 'Personal' }) {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    title,
    content,
    category,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    archived: category === 'Archive',
  };
}

function sortNotesByUpdatedAtDesc(a, b) {
  return b.updatedAt - a.updatedAt;
}

/**
 * UI Components
 */

// PUBLIC_INTERFACE
function App() {
  /** Theme handling */
  const [theme, setTheme] = useState(() => loadFromStorage(STORAGE_KEYS.THEME, 'light'));
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    saveToStorage(STORAGE_KEYS.THEME, theme);
  }, [theme]);

  // PUBLIC_INTERFACE
  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));

  /** Categories */
  const [categories, setCategories] = useState(() =>
    loadFromStorage(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES)
  );
  const [activeCategory, setActiveCategory] = useState('All Notes');
  const [newCategoryName, setNewCategoryName] = useState('');

  /** Notes */
  const [notes, setNotes] = useState(() => loadFromStorage(STORAGE_KEYS.NOTES, []));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNoteId, setSelectedNoteId] = useState(null);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.NOTES, notes);
  }, [notes]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.CATEGORIES, categories);
  }, [categories]);

  /** Derived data */
  const filteredNotes = useMemo(() => {
    let list = [...notes];
    if (activeCategory && activeCategory !== 'All Notes') {
      if (activeCategory === 'Archive') {
        list = list.filter((n) => n.archived);
      } else {
        list = list.filter((n) => n.category === activeCategory && !n.archived);
      }
    } else {
      list = list.filter((n) => !n.archived);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (n) =>
          (n.title || '').toLowerCase().includes(q) ||
          (n.content || '').toLowerCase().includes(q)
      );
    }
    return list.sort(sortNotesByUpdatedAtDesc);
  }, [notes, activeCategory, searchQuery]);

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedNoteId) || null,
    [notes, selectedNoteId]
  );

  /** Note actions */
  // PUBLIC_INTERFACE
  function handleCreateNote(categoryHint) {
    const category =
      categoryHint && categoryHint !== 'All Notes' ? categoryHint : 'Personal';
    const note = createNote({
      title: 'Untitled note',
      content: '',
      category,
    });
    setNotes((prev) => [note, ...prev]);
    setSelectedNoteId(note.id);
    if (!categories.includes(category) && category !== 'Archive') {
      setCategories((prev) => [...prev, category]);
    }
  }

  // PUBLIC_INTERFACE
  function handleUpdateNote(id, fields) {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, ...fields, updatedAt: Date.now() } : n
      )
    );
  }

  // PUBLIC_INTERFACE
  function handleDeleteNote(id) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (selectedNoteId === id) setSelectedNoteId(null);
  }

  // PUBLIC_INTERFACE
  function handleArchiveToggle(id) {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id
          ? {
              ...n,
              archived: !n.archived,
              category: !n.archived ? 'Archive' : n.category || 'Personal',
              updatedAt: Date.now(),
            }
          : n
      )
    );
  }

  /** Category actions */
  // PUBLIC_INTERFACE
  function addCategory(name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (categories.includes(trimmed)) return;
    setCategories((prev) => [...prev, trimmed]);
    setNewCategoryName('');
  }

  // PUBLIC_INTERFACE
  function renameCategory(oldName, newName) {
    const trimmed = newName.trim();
    if (!trimmed || ['All Notes', 'Archive'].includes(oldName)) return;
    if (categories.includes(trimmed)) return;
    setCategories((prev) => prev.map((c) => (c === oldName ? trimmed : c)));
    // Update notes with that category
    setNotes((prev) =>
      prev.map((n) => (n.category === oldName ? { ...n, category: trimmed } : n))
    );
    if (activeCategory === oldName) setActiveCategory(trimmed);
  }

  // PUBLIC_INTERFACE
  function deleteCategory(name) {
    if (['All Notes', 'Archive'].includes(name)) return;
    setCategories((prev) => prev.filter((c) => c !== name));
    // Move notes from deleted category to Personal
    setNotes((prev) =>
      prev.map((n) => (n.category === name ? { ...n, category: 'Personal' } : n))
    );
    if (activeCategory === name) setActiveCategory('All Notes');
  }

  /** Render */
  return (
    <div className="notes-app" data-theme={theme}>
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      <div className="content">
        <Sidebar
          categories={categories}
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
          onAddCategory={addCategory}
          onRenameCategory={renameCategory}
          onDeleteCategory={deleteCategory}
          newCategoryName={newCategoryName}
          setNewCategoryName={setNewCategoryName}
          colors={{ primary: '#1976d2', accent: '#fbc02d', secondary: '#424242' }}
        />
        <MainArea
          notes={filteredNotes}
          activeCategory={activeCategory}
          selectedNoteId={selectedNoteId}
          onSelectNote={setSelectedNoteId}
          onCreateNote={() => handleCreateNote(activeCategory)}
          onDeleteNote={handleDeleteNote}
          onArchiveToggle={handleArchiveToggle}
          onUpdateNote={handleUpdateNote}
          selectedNote={selectedNote}
          colors={{ primary: '#1976d2', accent: '#fbc02d', secondary: '#424242' }}
        />
      </div>
    </div>
  );
}

function Header({ theme, onToggleTheme, searchQuery, onSearchChange }) {
  return (
    <header className="header">
      <div className="brand">
        <span className="brand-logo">🗒️</span>
        <span className="brand-name">Personal Notes Organizer</span>
      </div>
      <div className="header-actions">
        <div className="search">
          <input
            aria-label="Search notes"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <button className="btn outline" onClick={onToggleTheme}>
          {theme === 'light' ? 'Dark mode' : 'Light mode'}
        </button>
      </div>
    </header>
  );
}

function Sidebar({
  categories,
  activeCategory,
  onSelectCategory,
  onAddCategory,
  onRenameCategory,
  onDeleteCategory,
  newCategoryName,
  setNewCategoryName,
  colors,
}) {
  const [editingCat, setEditingCat] = useState(null);
  const [editValue, setEditValue] = useState('');

  return (
    <aside className="sidebar" aria-label="Note categories">
      <div className="sidebar-header">
        <span className="sidebar-title">Categories</span>
        <button
          className="btn primary"
          onClick={() => onAddCategory(newCategoryName)}
          title="Add Category"
        >
          + Add
        </button>
      </div>
      <div className="sidebar-newcat">
        <input
          placeholder="New category name"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onAddCategory(newCategoryName);
          }}
        />
      </div>
      <ul className="category-list">
        {categories.map((cat) => (
          <li
            key={cat}
            className={`category-item ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => onSelectCategory(cat)}
          >
            {editingCat === cat ? (
              <div className="inline-edit" onClick={(e) => e.stopPropagation()}>
                <input
                  value={editValue}
                  autoFocus
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onRenameCategory(cat, editValue);
                      setEditingCat(null);
                      setEditValue('');
                    }
                    if (e.key === 'Escape') {
                      setEditingCat(null);
                      setEditValue('');
                    }
                  }}
                />
                <button
                  className="btn small"
                  onClick={() => {
                    onRenameCategory(cat, editValue);
                    setEditingCat(null);
                    setEditValue('');
                  }}
                >
                  Save
                </button>
              </div>
            ) : (
              <>
                <span className="category-name">{cat}</span>
                {!['All Notes', 'Archive'].includes(cat) && (
                  <span className="category-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="icon-btn"
                      title="Rename"
                      onClick={() => {
                        setEditingCat(cat);
                        setEditValue(cat);
                      }}
                    >
                      ✏️
                    </button>
                    <button
                      className="icon-btn"
                      title="Delete"
                      onClick={() => onDeleteCategory(cat)}
                    >
                      🗑️
                    </button>
                  </span>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
      <div className="sidebar-footer" style={{ color: colors.secondary }}>
        Tip: Click a category to filter notes.
      </div>
    </aside>
  );
}

function MainArea({
  notes,
  activeCategory,
  selectedNoteId,
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  onArchiveToggle,
  onUpdateNote,
  selectedNote,
  colors,
}) {
  return (
    <main className="main">
      <div className="toolbar">
        <div className="toolbar-left">
          <button className="btn primary" onClick={onCreateNote}>
            + New Note
          </button>
          <span className="toolbar-title">{activeCategory}</span>
          <span className="toolbar-count">{notes.length} notes</span>
        </div>
      </div>
      <div className="panes">
        <NoteList
          notes={notes}
          selectedNoteId={selectedNoteId}
          onSelectNote={onSelectNote}
          onDeleteNote={onDeleteNote}
          onArchiveToggle={onArchiveToggle}
          colors={colors}
        />
        <EditorPane
          note={selectedNote}
          onChange={(fields) => selectedNote && onUpdateNote(selectedNote.id, fields)}
          onDelete={() => selectedNote && onDeleteNote(selectedNote.id)}
          onArchiveToggle={() => selectedNote && onArchiveToggle(selectedNote.id)}
          colors={colors}
        />
      </div>
    </main>
  );
}

function NoteList({ notes, selectedNoteId, onSelectNote, onDeleteNote, onArchiveToggle }) {
  return (
    <section className="note-list" aria-label="Notes list">
      {notes.length === 0 && (
        <div className="empty-state">No notes here yet. Create one to get started.</div>
      )}
      <ul>
        {notes.map((n) => (
          <li
            key={n.id}
            className={`note-card ${selectedNoteId === n.id ? 'selected' : ''}`}
            onClick={() => onSelectNote(n.id)}
          >
            <div className="note-card-header">
              <div className="note-card-title">{n.title || 'Untitled note'}</div>
              <div className="note-card-actions" onClick={(e) => e.stopPropagation()}>
                <button
                  className="icon-btn"
                  title={n.archived ? 'Unarchive' : 'Archive'}
                  onClick={() => onArchiveToggle(n.id)}
                >
                  {n.archived ? '📤' : '📥'}
                </button>
                <button
                  className="icon-btn"
                  title="Delete"
                  onClick={() => onDeleteNote(n.id)}
                >
                  🗑️
                </button>
              </div>
            </div>
            <div className="note-card-content">
              {(n.content || '').slice(0, 120) || 'No content yet...'}
            </div>
            <div className="note-card-meta">
              <span>
                {new Date(n.updatedAt).toLocaleString([], {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
              <span className="chip">{n.category}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function EditorPane({ note, onChange, onDelete, onArchiveToggle }) {
  if (!note) {
    return (
      <section className="editor empty" aria-label="Editor">
        <div className="empty-state">Select a note to view and edit it here.</div>
      </section>
    );
  }

  return (
    <section className="editor" aria-label="Editor">
      <div className="editor-actions">
        <button className="btn outline" onClick={onArchiveToggle}>
          {note.archived ? 'Unarchive' : 'Archive'}
        </button>
        <button className="btn danger" onClick={onDelete}>
          Delete
        </button>
      </div>
      <input
        className="editor-title"
        value={note.title}
        onChange={(e) => onChange({ title: e.target.value })}
        placeholder="Note title"
      />
      <textarea
        className="editor-content"
        value={note.content}
        onChange={(e) => onChange({ content: e.target.value })}
        placeholder="Start typing your note..."
      />
    </section>
  );
}

export default App;
