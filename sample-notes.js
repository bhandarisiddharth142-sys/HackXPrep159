/**
 * Lumina Notes - Initial Starter Sample Notes
 */

const DEFAULT_SAMPLE_NOTES = [
  {
    id: "welcome-note-1",
    title: "✨ Welcome to Lumina Notes!",
    content: `# Welcome to Lumina Notes ✨

Lumina Notes is your sleek, modern, glassmorphic workspace designed for fast, beautiful note-taking with full **Markdown** support.

---

### 🚀 Key Features

- **⚡ Auto-Save**: Your changes are saved instantly to local storage.
- **🎨 Custom Styling & Colors**: Choose accent colors and switch between Light, Dark, and OLED themes.
- **🏷️ Tags & Folders**: Organize your thoughts with custom tags like \`#idea\`, \`#work\`, or custom categories.
- **📌 Pin & Star**: Keep important notes right at your fingertips.
- **📄 Import & Export**: Download single notes as \`.md\` / \`.txt\`, or backup everything to JSON.

---

### 💡 Quick Tips

1. Click the **+ New Note** button to start writing.
2. Toggle between **Split View**, **Editor Only**, or **Preview Mode** using the top toolbar.
3. Try clicking interactive checkboxes directly in preview mode!
`,
    category: "Personal",
    tags: ["welcome", "guide", "lumina"],
    color: "#6366f1",
    isPinned: true,
    isFavorite: true,
    isArchived: false,
    isTrash: false,
    createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: "markdown-demo-2",
    title: "📝 Markdown & Interactive Checklists",
    content: `# Markdown Feature Showcase

Lumina Notes supports rich markdown formatting!

### 📊 Task List (Try Clicking Them in Preview!)
- [x] Create a new note
- [x] Explore Markdown formatting
- [ ] Try dark theme toggle
- [ ] Export note as Markdown file
- [ ] Organize with tags

---

### 💬 Blockquotes & Quotes
> "Simplicity is about subtracting the obvious and adding the meaningful."  
> — *John Maeda*

---

### 📊 Sample Table

| Feature | Support | Status |
| :--- | :---: | ---: |
| Auto-Save | Yes | ✅ Active |
| Markdown | Yes | ✅ Active |
| Syntax Highlighting | Yes | ✅ Active |
| Backup & Restore | Yes | ✅ Active |
`,
    category: "Ideas",
    tags: ["markdown", "checklist", "demo"],
    color: "#10b981",
    isPinned: true,
    isFavorite: false,
    isArchived: false,
    isTrash: false,
    createdAt: new Date(Date.now() - 3600000 * 24 * 1).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 5).toISOString()
  },
  {
    id: "code-snippet-3",
    title: "⚡ Code Snippet Demo",
    content: `# Developer Code Snippets 💻

Lumina Notes highlights code blocks automatically!

### JavaScript Example
\`\`\`javascript
// Calculate reading time for a note
function calculateReadingTime(text) {
  const wordsPerMinute = 200;
  const words = text.trim().split(/\\s+/).filter(w => w.length > 0).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return { words, readingTime: \`\${minutes} min read\` };
}

console.log(calculateReadingTime("Lumina notes makes taking notes simple and fast!"));
\`\`\`

### Python Example
\`\`\`python
def summarize_text(text, max_len=100):
    """Clean and summarize text snippet"""
    cleaned = " ".join(text.split())
    if len(cleaned) <= max_len:
        return cleaned
    return cleaned[:max_len] + "..."
\`\`\`
`,
    category: "Code",
    tags: ["code", "javascript", "python"],
    color: "#f59e0b",
    isPinned: false,
    isFavorite: true,
    isArchived: false,
    isTrash: false,
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 1).toISOString()
  }
];
