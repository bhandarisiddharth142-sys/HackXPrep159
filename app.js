/**
 * Lumina Notes Engine - Main Application Logic
 */

(function () {
  'use strict';

  // --- State Initialization ---
  const LOCAL_STORAGE_KEY = 'lumina_notes_data';
  const THEME_STORAGE_KEY = 'lumina_theme';

  let state = {
    notes: [],
    activeNoteId: null,
    filter: { type: 'all', value: null },
    searchKeyword: '',
    sortBy: 'updated',
    viewMode: 'split', // 'split', 'edit', 'preview'
    theme: localStorage.getItem(THEME_STORAGE_KEY) || 'dark',
    autoSaveTimer: null
  };

  // --- DOM Elements ---
  const DOM = {
    appContainer: document.getElementById('app'),
    sidebar: document.getElementById('sidebar'),
    mobileToggleBtn: document.getElementById('mobile-toggle-btn'),
    btnNewNote: document.getElementById('btn-new-note'),
    
    // Nav Items & Counters
    navItems: document.querySelectorAll('.nav-item'),
    countAll: document.getElementById('count-all'),
    countPinned: document.getElementById('count-pinned'),
    countFavorites: document.getElementById('count-favorites'),
    countTrash: document.getElementById('count-trash'),
    categoryList: document.getElementById('category-list'),
    tagList: document.getElementById('tag-list'),
    
    // Theme & Options
    themeToggle: document.getElementById('theme-toggle'),
    themeIcon: document.getElementById('theme-icon'),
    openStatsBtn: document.getElementById('open-stats-btn'),
    closeStatsBtn: document.getElementById('close-stats-btn'),
    statsModal: document.getElementById('stats-modal'),
    exportBackupBtn: document.getElementById('export-backup-btn'),
    importBackupBtn: document.getElementById('import-backup-btn'),
    importFileInput: document.getElementById('import-file-input'),

    // Note List Panel
    searchInput: document.getElementById('search-input'),
    sortSelect: document.getElementById('sort-select'),
    currentFilterTitle: document.getElementById('current-filter-title'),
    notesListContainer: document.getElementById('notes-list-container'),

    // Workspace & Editor
    mainWorkspace: document.getElementById('main-workspace'),
    noteTitleInput: document.getElementById('note-title-input'),
    btnModeSplit: document.getElementById('btn-mode-split'),
    btnModeEdit: document.getElementById('btn-mode-edit'),
    btnModePreview: document.getElementById('btn-mode-preview'),
    btnFavorite: document.getElementById('btn-favorite'),
    btnPin: document.getElementById('btn-pin'),
    btnExportNote: document.getElementById('btn-export-note'),
    btnDeleteNote: document.getElementById('btn-delete-note'),

    // Workspace Meta Bar
    noteCategorySelect: document.getElementById('note-category-select'),
    colorSwatches: document.querySelectorAll('.color-swatch'),
    noteTagsWrapper: document.getElementById('note-tags-wrapper'),
    addTagInput: document.getElementById('add-tag-input'),
    saveIndicator: document.getElementById('save-indicator'),
    saveStatusText: document.getElementById('save-status-text'),

    // Editor & Preview
    editorToolbar: document.getElementById('editor-toolbar'),
    editorContainer: document.getElementById('editor-container'),
    noteEditor: document.getElementById('note-editor'),
    notePreview: document.getElementById('note-preview'),

    // Stats Elements
    statTotalNotes: document.getElementById('stat-total-notes'),
    statTotalWords: document.getElementById('stat-total-words'),
    statTotalTags: document.getElementById('stat-total-tags'),
    statReadingTime: document.getElementById('stat-reading-time'),
    
    // Toast Container
    toastContainer: document.getElementById('toast-container')
  };

  // --- App Startup ---
  function init() {
    loadTheme();
    loadNotes();

    // Select initial active note if available
    const availableNotes = getFilteredNotes();
    if (availableNotes.length > 0) {
      state.activeNoteId = availableNotes[0].id;
    }

    bindEvents();
    renderApp();
  }

  // --- Theme Management ---
  function loadTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    updateThemeIcon();
  }

  function toggleTheme() {
    const themes = ['dark', 'light', 'oled'];
    const currentIndex = themes.indexOf(state.theme);
    state.theme = themes[(currentIndex + 1) % themes.length];
    localStorage.setItem(THEME_STORAGE_KEY, state.theme);
    document.documentElement.setAttribute('data-theme', state.theme);
    updateThemeIcon();
    showToast(`Theme switched to ${state.theme.toUpperCase()}`, 'moon');
  }

  function updateThemeIcon() {
    if (!DOM.themeIcon) return;
    if (state.theme === 'light') {
      DOM.themeIcon.setAttribute('data-lucide', 'sun');
    } else if (state.theme === 'oled') {
      DOM.themeIcon.setAttribute('data-lucide', 'zap');
    } else {
      DOM.themeIcon.setAttribute('data-lucide', 'moon');
    }
    if (window.lucide) lucide.createIcons();
  }

  // --- LocalStorage Operations ---
  function loadNotes() {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        state.notes = JSON.parse(stored);
      } else {
        // Load default starter notes
        state.notes = (typeof DEFAULT_SAMPLE_NOTES !== 'undefined') ? DEFAULT_SAMPLE_NOTES : [];
        saveNotesToStorage();
      }
    } catch (e) {
      console.error('Failed to load notes from localStorage', e);
      state.notes = [];
    }
  }

  function saveNotesToStorage() {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state.notes));
      setSaveStatus('saved');
    } catch (e) {
      console.error('Failed to save notes to localStorage', e);
      showToast('Storage quota exceeded or error saving!', 'alert-triangle');
    }
  }

  function triggerAutoSave() {
    setSaveStatus('saving');
    clearTimeout(state.autoSaveTimer);
    state.autoSaveTimer = setTimeout(() => {
      saveNotesToStorage();
    }, 400);
  }

  function setSaveStatus(status) {
    if (!DOM.saveIndicator || !DOM.saveStatusText) return;
    if (status === 'saving') {
      DOM.saveIndicator.classList.add('saving');
      DOM.saveStatusText.textContent = 'Editing...';
    } else {
      DOM.saveIndicator.classList.remove('saving');
      DOM.saveStatusText.textContent = 'Saved';
    }
  }

  // --- Active Note Helpers ---
  function getActiveNote() {
    return state.notes.find(n => n.id === state.activeNoteId) || null;
  }

  // --- Filtering & Sorting ---
  function getFilteredNotes() {
    let result = state.notes.filter(note => {
      // Filter out trash unless we are specifically viewing trash
      if (state.filter.type === 'trash') {
        return note.isTrash === true;
      }
      if (note.isTrash === true) {
        return false;
      }

      // Filter by type
      if (state.filter.type === 'pinned') return note.isPinned;
      if (state.filter.type === 'favorites') return note.isFavorite;
      if (state.filter.type === 'category') return note.category === state.filter.value;
      if (state.filter.type === 'tag') return note.tags && note.tags.includes(state.filter.value);

      return true;
    });

    // Search query filter
    if (state.searchKeyword.trim() !== '') {
      const q = state.searchKeyword.toLowerCase().trim();
      result = result.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        (n.tags && n.tags.some(t => t.toLowerCase().includes(q)))
      );
    }

    // Sort result
    result.sort((a, b) => {
      // Pinned notes always stay at top when viewing 'all'
      if (state.filter.type === 'all') {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
      }

      if (state.sortBy === 'updated') {
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      }
      if (state.sortBy === 'created') {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      if (state.sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

    return result;
  }

  // --- CRUD Handlers ---
  function createNewNote() {
    const newNote = {
      id: 'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: 'Untitled Note',
      content: '',
      category: 'Personal',
      tags: [],
      color: '#6366f1',
      isPinned: false,
      isFavorite: false,
      isArchived: false,
      isTrash: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    state.notes.unshift(newNote);
    state.activeNoteId = newNote.id;

    // Reset filter to 'all' if in trash
    if (state.filter.type === 'trash') {
      state.filter = { type: 'all', value: null };
    }

    saveNotesToStorage();
    renderApp();
    
    // Focus title input
    if (DOM.noteTitleInput) {
      DOM.noteTitleInput.focus();
      DOM.noteTitleInput.select();
    }

    showToast('New note created', 'plus-circle');
  }

  function updateActiveNoteField(field, value) {
    const note = getActiveNote();
    if (!note) return;

    note[field] = value;
    note.updatedAt = new Date().toISOString();

    triggerAutoSave();

    // Re-render note preview if content edited
    if (field === 'content') {
      renderMarkdownPreview();
      updateNoteCardInList(note);
    } else if (field === 'title') {
      updateNoteCardInList(note);
    } else {
      renderApp();
    }
  }

  function togglePinActiveNote(id) {
    const targetId = id || state.activeNoteId;
    const note = state.notes.find(n => n.id === targetId);
    if (!note) return;

    note.isPinned = !note.isPinned;
    note.updatedAt = new Date().toISOString();
    saveNotesToStorage();
    renderApp();
    showToast(note.isPinned ? 'Note pinned' : 'Note unpinned', 'pin');
  }

  function toggleFavoriteActiveNote(id) {
    const targetId = id || state.activeNoteId;
    const note = state.notes.find(n => n.id === targetId);
    if (!note) return;

    note.isFavorite = !note.isFavorite;
    note.updatedAt = new Date().toISOString();
    saveNotesToStorage();
    renderApp();
    showToast(note.isFavorite ? 'Added to favorites' : 'Removed from favorites', 'star');
  }

  function deleteActiveNote(id) {
    const targetId = id || state.activeNoteId;
    const noteIndex = state.notes.findIndex(n => n.id === targetId);
    if (noteIndex === -1) return;

    const note = state.notes[noteIndex];

    if (!note.isTrash) {
      // Move to Trash
      note.isTrash = true;
      note.updatedAt = new Date().toISOString();
      showToast('Moved note to Trash', 'trash-2');
    } else {
      // Permanent Delete
      state.notes.splice(noteIndex, 1);
      showToast('Permanently deleted note', 'trash');
    }

    saveNotesToStorage();

    // Pick new active note if active note was deleted
    const filtered = getFilteredNotes();
    if (filtered.length > 0) {
      state.activeNoteId = filtered[0].id;
    } else {
      state.activeNoteId = null;
    }

    renderApp();
  }

  function restoreNote(id) {
    const note = state.notes.find(n => n.id === id);
    if (!note) return;

    note.isTrash = false;
    note.updatedAt = new Date().toISOString();
    saveNotesToStorage();
    renderApp();
    showToast('Restored note from Trash', 'rotate-ccw');
  }

  // --- Tag Management ---
  function addTagToActiveNote(tagText) {
    const note = getActiveNote();
    if (!note || !tagText.trim()) return;

    const cleaned = tagText.trim().replace(/^#/, '').toLowerCase();
    if (!note.tags) note.tags = [];

    if (!note.tags.includes(cleaned)) {
      note.tags.push(cleaned);
      note.updatedAt = new Date().toISOString();
      saveNotesToStorage();
      renderApp();
    }
  }

  function removeTagFromActiveNote(tagText) {
    const note = getActiveNote();
    if (!note || !note.tags) return;

    note.tags = note.tags.filter(t => t !== tagText);
    note.updatedAt = new Date().toISOString();
    saveNotesToStorage();
    renderApp();
  }

  // --- Rendering UI Functions ---
  function renderApp() {
    renderSidebarCounts();
    renderTagsList();
    renderNoteCardsList();
    renderActiveNoteWorkspace();

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  function renderSidebarCounts() {
    const nonTrash = state.notes.filter(n => !n.isTrash);
    if (DOM.countAll) DOM.countAll.textContent = nonTrash.length;
    if (DOM.countPinned) DOM.countPinned.textContent = nonTrash.filter(n => n.isPinned).length;
    if (DOM.countFavorites) DOM.countFavorites.textContent = nonTrash.filter(n => n.isFavorite).length;
    if (DOM.countTrash) DOM.countTrash.textContent = state.notes.filter(n => n.isTrash).length;
  }

  function renderTagsList() {
    if (!DOM.tagList) return;

    // Collect all unique tags across non-trash notes
    const tagMap = {};
    state.notes.filter(n => !n.isTrash).forEach(n => {
      if (n.tags) {
        n.tags.forEach(tag => {
          tagMap[tag] = (tagMap[tag] || 0) + 1;
        });
      }
    });

    const tags = Object.keys(tagMap).sort();
    DOM.tagList.innerHTML = '';

    if (tags.length === 0) {
      DOM.tagList.innerHTML = `<li style="padding: 0.5rem; font-size: 0.8rem; color: var(--text-muted);">No tags yet</li>`;
      return;
    }

    tags.forEach(tag => {
      const li = document.createElement('li');
      li.className = 'nav-item' + (state.filter.type === 'tag' && state.filter.value === tag ? ' active' : '');
      li.setAttribute('data-filter-type', 'tag');
      li.setAttribute('data-tag', tag);
      li.innerHTML = `
        <div class="nav-item-left">
          <i data-lucide="tag"></i>
          <span>#${escapeHtml(tag)}</span>
        </div>
        <span class="nav-badge">${tagMap[tag]}</span>
      `;
      DOM.tagList.appendChild(li);
    });
  }

  function renderNoteCardsList() {
    if (!DOM.notesListContainer) return;

    const filteredNotes = getFilteredNotes();
    DOM.notesListContainer.innerHTML = '';

    // Update Header Filter title text
    if (DOM.currentFilterTitle) {
      if (state.filter.type === 'all') DOM.currentFilterTitle.textContent = 'All Notes';
      else if (state.filter.type === 'pinned') DOM.currentFilterTitle.textContent = 'Pinned Notes';
      else if (state.filter.type === 'favorites') DOM.currentFilterTitle.textContent = 'Favorite Notes';
      else if (state.filter.type === 'trash') DOM.currentFilterTitle.textContent = 'Trash Bin';
      else if (state.filter.type === 'category') DOM.currentFilterTitle.textContent = `Folder: ${state.filter.value}`;
      else if (state.filter.type === 'tag') DOM.currentFilterTitle.textContent = `Tag: #${state.filter.value}`;
    }

    if (filteredNotes.length === 0) {
      DOM.notesListContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📝</div>
          <h3>No Notes Found</h3>
          <p>Click <strong>+ New Note</strong> to get started!</p>
        </div>
      `;
      return;
    }

    filteredNotes.forEach(note => {
      const card = document.createElement('div');
      card.className = `note-card ${note.id === state.activeNoteId ? 'active' : ''}`;
      card.setAttribute('data-id', note.id);
      card.style.setProperty('--card-color', note.color || '#6366f1');

      const snippet = note.content ? note.content.replace(/[#*`_~>-]/g, '').substring(0, 100) : 'Empty note...';
      const formattedDate = formatDate(note.updatedAt);

      const tagPillsHtml = (note.tags || []).slice(0, 3).map(t => `<span class="tag-pill">#${escapeHtml(t)}</span>`).join('');

      card.innerHTML = `
        <div class="note-card-header">
          <h4 class="note-card-title">${escapeHtml(note.title || 'Untitled Note')}</h4>
          <div class="card-actions-top">
            ${note.isPinned ? `<button class="icon-btn-tiny pinned" data-action="pin" title="Unpin"><i data-lucide="pin"></i></button>` : ''}
            ${note.isFavorite ? `<button class="icon-btn-tiny starred" data-action="star" title="Favorite"><i data-lucide="star"></i></button>` : ''}
            ${note.isTrash ? `<button class="icon-btn-tiny" data-action="restore" title="Restore"><i data-lucide="rotate-ccw"></i></button>` : ''}
          </div>
        </div>
        <p class="note-card-snippet">${escapeHtml(snippet)}</p>
        <div class="note-card-footer">
          <span>${formattedDate}</span>
          <div class="tag-pills">${tagPillsHtml}</div>
        </div>
      `;

      DOM.notesListContainer.appendChild(card);
    });
  }

  function updateNoteCardInList(note) {
    const card = DOM.notesListContainer.querySelector(`.note-card[data-id="${note.id}"]`);
    if (!card) return;

    const titleEl = card.querySelector('.note-card-title');
    if (titleEl) titleEl.textContent = note.title || 'Untitled Note';

    const snippetEl = card.querySelector('.note-card-snippet');
    if (snippetEl) {
      const snippet = note.content ? note.content.replace(/[#*`_~>-]/g, '').substring(0, 100) : 'Empty note...';
      snippetEl.textContent = snippet;
    }
  }

  function renderActiveNoteWorkspace() {
    const activeNote = getActiveNote();

    if (!activeNote) {
      if (DOM.mainWorkspace) DOM.mainWorkspace.style.display = 'none';
      return;
    }

    if (DOM.mainWorkspace) DOM.mainWorkspace.style.display = 'flex';

    // Title
    if (DOM.noteTitleInput) DOM.noteTitleInput.value = activeNote.title || '';

    // Category
    if (DOM.noteCategorySelect) DOM.noteCategorySelect.value = activeNote.category || 'Personal';

    // Color Swatches
    DOM.colorSwatches.forEach(swatch => {
      const swatchColor = swatch.getAttribute('data-color');
      if (swatchColor === (activeNote.color || '#6366f1')) {
        swatch.classList.add('selected');
      } else {
        swatch.classList.remove('selected');
      }
    });

    // Pinned & Favorite Buttons
    if (DOM.btnPin) {
      DOM.btnPin.classList.toggle('active', !!activeNote.isPinned);
      DOM.btnPin.style.color = activeNote.isPinned ? 'var(--warning-color)' : '';
    }
    if (DOM.btnFavorite) {
      DOM.btnFavorite.classList.toggle('active', !!activeNote.isFavorite);
      DOM.btnFavorite.style.color = activeNote.isFavorite ? '#facc15' : '';
    }

    // Trash state adjustments
    if (DOM.btnDeleteNote) {
      DOM.btnDeleteNote.title = activeNote.isTrash ? 'Permanently Delete' : 'Move to Trash';
    }

    // Render Tags Chips
    if (DOM.noteTagsWrapper) {
      // Clear old chips except input
      const existingChips = DOM.noteTagsWrapper.querySelectorAll('.tag-chip');
      existingChips.forEach(c => c.remove());

      if (activeNote.tags) {
        activeNote.tags.forEach(tag => {
          const chip = document.createElement('span');
          chip.className = 'tag-chip';
          chip.innerHTML = `
            #${escapeHtml(tag)}
            <span class="tag-chip-remove" data-tag="${escapeHtml(tag)}">&times;</span>
          `;
          DOM.noteTagsWrapper.insertBefore(chip, DOM.addTagInput);
        });
      }
    }

    // Editor Textarea
    if (DOM.noteEditor) {
      DOM.noteEditor.value = activeNote.content || '';
    }

    // Preview
    renderMarkdownPreview();
  }

  // --- Markdown Renderer ---
  function renderMarkdownPreview() {
    const activeNote = getActiveNote();
    if (!activeNote || !DOM.notePreview) return;

    const rawMarkdown = activeNote.content || '*No content yet...*';

    try {
      // Configure marked parser options
      if (window.marked) {
        marked.setOptions({
          gfm: true,
          breaks: true
        });
        const rawHtml = marked.parse(rawMarkdown);
        const cleanHtml = window.DOMPurify ? DOMPurify.sanitize(rawHtml) : rawHtml;
        DOM.notePreview.innerHTML = cleanHtml;

        // Apply syntax highlighting
        if (window.Prism) {
          Prism.highlightAllUnder(DOM.notePreview);
        }

        // Attach Interactive Checkboxes logic in preview pane!
        attachInteractiveCheckboxes();
      } else {
        DOM.notePreview.textContent = rawMarkdown;
      }
    } catch (err) {
      console.error('Markdown rendering error:', err);
      DOM.notePreview.textContent = rawMarkdown;
    }
  }

  // --- Interactive Checkbox Toggle in Preview Pane ---
  function attachInteractiveCheckboxes() {
    const checkboxes = DOM.notePreview.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach((cb, index) => {
      cb.removeAttribute('disabled'); // Make checkable in preview
      cb.addEventListener('change', () => {
        toggleMarkdownCheckboxAtIndex(index, cb.checked);
      });
    });
  }

  function toggleMarkdownCheckboxAtIndex(targetIndex, isChecked) {
    const note = getActiveNote();
    if (!note || !note.content) return;

    let currentIndex = 0;
    const lines = note.content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Check for markdown task list item regex (- [ ] or - [x])
      if (/^\s*[-*+]\s+\[[ xX]\]/.test(line)) {
        if (currentIndex === targetIndex) {
          if (isChecked) {
            lines[i] = line.replace(/\[[ ]\]/, '[x]');
          } else {
            lines[i] = line.replace(/\[[xX]\]/, '[ ]');
          }
          break;
        }
        currentIndex++;
      }
    }

    note.content = lines.join('\n');
    note.updatedAt = new Date().toISOString();

    if (DOM.noteEditor) {
      DOM.noteEditor.value = note.content;
    }

    triggerAutoSave();
  }

  // --- Formatting Toolbar Functions ---
  function applyFormatting(formatType) {
    if (!DOM.noteEditor) return;

    const textarea = DOM.noteEditor;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    let replacement = '';
    let cursorOffset = 0;

    switch (formatType) {
      case 'bold':
        replacement = `**${selectedText || 'bold text'}**`;
        cursorOffset = selectedText ? 0 : 2;
        break;
      case 'italic':
        replacement = `*${selectedText || 'italic text'}*`;
        cursorOffset = selectedText ? 0 : 1;
        break;
      case 'strikethrough':
        replacement = `~~${selectedText || 'strikethrough'}~~`;
        cursorOffset = selectedText ? 0 : 2;
        break;
      case 'h1':
        replacement = `# ${selectedText || 'Heading 1'}`;
        break;
      case 'h2':
        replacement = `## ${selectedText || 'Heading 2'}`;
        break;
      case 'h3':
        replacement = `### ${selectedText || 'Heading 3'}`;
        break;
      case 'ul':
        replacement = selectedText ? selectedText.split('\n').map(l => `- ${l}`).join('\n') : '- List item';
        break;
      case 'ol':
        replacement = selectedText ? selectedText.split('\n').map((l, i) => `${i + 1}. ${l}`).join('\n') : '1. List item';
        break;
      case 'task':
        replacement = selectedText ? selectedText.split('\n').map(l => `- [ ] ${l}`).join('\n') : '- [ ] Task item';
        break;
      case 'code':
        replacement = selectedText.includes('\n')
          ? `\`\`\`javascript\n${selectedText || '// code here'}\n\`\`\``
          : `\`${selectedText || 'code'}\``;
        break;
      case 'quote':
        replacement = `> ${selectedText || 'Quote text'}`;
        break;
      case 'table':
        replacement = `\n| Header 1 | Header 2 |\n| :--- | :--- |\n| Item 1 | Item 2 |\n`;
        break;
      case 'hr':
        replacement = `\n---\n`;
        break;
    }

    textarea.value = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);
    textarea.focus();
    
    const newCursorPos = start + replacement.length - cursorOffset;
    textarea.setSelectionRange(newCursorPos, newCursorPos);

    // Update state
    updateActiveNoteField('content', textarea.value);
  }

  // --- Export & Import Functions ---
  function exportSingleNote() {
    const note = getActiveNote();
    if (!note) return;

    const filename = `${(note.title || 'untitled').toLowerCase().replace(/[^a-z0-9]/g, '_')}.md`;
    const blob = new Blob([note.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${filename}`, 'download');
  }

  function exportBackupJSON() {
    const dataStr = JSON.stringify(state.notes, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lumina_notes_backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Exported backup JSON file', 'download');
  }

  function importBackupJSON(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (Array.isArray(imported)) {
          state.notes = imported;
          saveNotesToStorage();
          if (state.notes.length > 0) state.activeNoteId = state.notes[0].id;
          renderApp();
          showToast(`Successfully imported ${imported.length} notes!`, 'check-circle');
        } else {
          showToast('Invalid backup file format', 'alert-triangle');
        }
      } catch (err) {
        showToast('Error reading JSON backup file', 'alert-triangle');
      }
    };
    reader.readAsText(file);
  }

  // --- Statistics Calculation ---
  function updateStatisticsModal() {
    const activeNotes = state.notes.filter(n => !n.isTrash);
    let totalWords = 0;
    const tagSet = new Set();

    activeNotes.forEach(n => {
      if (n.content) {
        const words = n.content.trim().split(/\s+/).filter(w => w.length > 0);
        totalWords += words.length;
      }
      if (n.tags) {
        n.tags.forEach(t => tagSet.add(t));
      }
    });

    const readingTime = Math.ceil(totalWords / 200);

    if (DOM.statTotalNotes) DOM.statTotalNotes.textContent = activeNotes.length;
    if (DOM.statTotalWords) DOM.statTotalWords.textContent = totalWords.toLocaleString();
    if (DOM.statTotalTags) DOM.statTotalTags.textContent = tagSet.size;
    if (DOM.statReadingTime) DOM.statReadingTime.textContent = `${readingTime} min`;
  }

  // --- UI Toast Alerts ---
  function showToast(message, iconName = 'info') {
    if (!DOM.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <i data-lucide="${iconName}"></i>
      <span>${escapeHtml(message)}</span>
    `;

    DOM.toastContainer.appendChild(toast);
    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  // --- Event Listeners Binding ---
  function bindEvents() {
    // New Note Button
    if (DOM.btnNewNote) {
      DOM.btnNewNote.addEventListener('click', createNewNote);
    }

    // Sidebar Mobile Toggle
    if (DOM.mobileToggleBtn) {
      DOM.mobileToggleBtn.addEventListener('click', () => {
        DOM.sidebar.classList.toggle('open');
      });
    }

    // Navigation Items (Filters)
    document.addEventListener('click', (e) => {
      const navItem = e.target.closest('.nav-item');
      if (navItem) {
        const filterType = navItem.getAttribute('data-filter-type');
        const category = navItem.getAttribute('data-category');
        const tag = navItem.getAttribute('data-tag');

        if (filterType === 'all' || filterType === 'pinned' || filterType === 'favorites' || filterType === 'trash') {
          state.filter = { type: filterType, value: null };
        } else if (filterType === 'category') {
          state.filter = { type: 'category', value: category };
        } else if (filterType === 'tag') {
          state.filter = { type: 'tag', value: tag };
        }

        // Auto select first note in list
        const filtered = getFilteredNotes();
        if (filtered.length > 0) {
          state.activeNoteId = filtered[0].id;
        }

        renderApp();
      }
    });

    // Theme Toggle
    if (DOM.themeToggle) {
      DOM.themeToggle.addEventListener('click', toggleTheme);
    }

    // Search Input
    if (DOM.searchInput) {
      DOM.searchInput.addEventListener('input', (e) => {
        state.searchKeyword = e.target.value;
        renderNoteCardsList();
      });
    }

    // Sort Select
    if (DOM.sortSelect) {
      DOM.sortSelect.addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        renderNoteCardsList();
      });
    }

    // Note Card Clicks
    if (DOM.notesListContainer) {
      DOM.notesListContainer.addEventListener('click', (e) => {
        const actionBtn = e.target.closest('.icon-btn-tiny');
        const card = e.target.closest('.note-card');

        if (actionBtn) {
          const action = actionBtn.getAttribute('data-action');
          const noteId = card.getAttribute('data-id');
          if (action === 'pin') togglePinActiveNote(noteId);
          else if (action === 'star') toggleFavoriteActiveNote(noteId);
          else if (action === 'restore') restoreNote(noteId);
          return;
        }

        if (card) {
          state.activeNoteId = card.getAttribute('data-id');
          renderNoteCardsList();
          renderActiveNoteWorkspace();
        }
      });
    }

    // Note Workspace Controls
    if (DOM.noteTitleInput) {
      DOM.noteTitleInput.addEventListener('input', (e) => {
        updateActiveNoteField('title', e.target.value);
      });
    }

    if (DOM.noteCategorySelect) {
      DOM.noteCategorySelect.addEventListener('change', (e) => {
        updateActiveNoteField('category', e.target.value);
      });
    }

    // Color Swatches
    DOM.colorSwatches.forEach(swatch => {
      swatch.addEventListener('click', () => {
        const color = swatch.getAttribute('data-color');
        updateActiveNoteField('color', color);
      });
    });

    // Add Tag Input
    if (DOM.addTagInput) {
      DOM.addTagInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault();
          addTagToActiveNote(e.target.value);
          e.target.value = '';
        }
      });
    }

    // Tag Chip Remove
    if (DOM.noteTagsWrapper) {
      DOM.noteTagsWrapper.addEventListener('click', (e) => {
        if (e.target.classList.contains('tag-chip-remove')) {
          const tag = e.target.getAttribute('data-tag');
          removeTagFromActiveNote(tag);
        }
      });
    }

    // Editor Textarea Input
    if (DOM.noteEditor) {
      DOM.noteEditor.addEventListener('input', (e) => {
        updateActiveNoteField('content', e.target.value);
      });
    }

    // Formatting Toolbar Buttons
    if (DOM.editorToolbar) {
      DOM.editorToolbar.addEventListener('click', (e) => {
        const btn = e.target.closest('.toolbar-btn');
        if (btn) {
          const format = btn.getAttribute('data-format');
          applyFormatting(format);
        }
      });
    }

    // View Modes (Split / Edit / Preview)
    const viewButtons = [DOM.btnModeSplit, DOM.btnModeEdit, DOM.btnModePreview];
    viewButtons.forEach(btn => {
      if (btn) {
        btn.addEventListener('click', () => {
          const mode = btn.getAttribute('data-mode');
          state.viewMode = mode;
          viewButtons.forEach(b => b && b.classList.remove('active'));
          btn.classList.add('active');

          if (DOM.editorContainer) {
            DOM.editorContainer.className = `editor-container mode-${mode}`;
          }
        });
      }
    });

    // Workspace Action Buttons
    if (DOM.btnPin) {
      DOM.btnPin.addEventListener('click', () => togglePinActiveNote());
    }
    if (DOM.btnFavorite) {
      DOM.btnFavorite.addEventListener('click', () => toggleFavoriteActiveNote());
    }
    if (DOM.btnExportNote) {
      DOM.btnExportNote.addEventListener('click', exportSingleNote);
    }
    if (DOM.btnDeleteNote) {
      DOM.btnDeleteNote.addEventListener('click', () => deleteActiveNote());
    }

    // Backup Export & Import
    if (DOM.exportBackupBtn) {
      DOM.exportBackupBtn.addEventListener('click', exportBackupJSON);
    }
    if (DOM.importBackupBtn) {
      DOM.importBackupBtn.addEventListener('click', () => DOM.importFileInput.click());
    }
    if (DOM.importFileInput) {
      DOM.importFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          importBackupJSON(e.target.files[0]);
        }
      });
    }

    // Statistics Modal
    if (DOM.openStatsBtn) {
      DOM.openStatsBtn.addEventListener('click', () => {
        updateStatisticsModal();
        DOM.statsModal.classList.add('active');
      });
    }
    if (DOM.closeStatsBtn) {
      DOM.closeStatsBtn.addEventListener('click', () => {
        DOM.statsModal.classList.remove('active');
      });
    }
    if (DOM.statsModal) {
      DOM.statsModal.addEventListener('click', (e) => {
        if (e.target === DOM.statsModal) {
          DOM.statsModal.classList.remove('active');
        }
      });
    }
  }

  // --- Utility Functions ---
  function formatDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;

    if (diffMs < 60000) return 'Just now';
    if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`;
    if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)}h ago`;

    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/[&<>"']/g, function (m) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[m];
    });
  }

  // Run initial setup on page load
  document.addEventListener('DOMContentLoaded', init);

})();
