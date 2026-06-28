# ✦ Claude AI Assistant for Phoenix Code

🇺🇸 **English** | 🇲🇽 [Español](README.es.md)

**Author:** Erik Dávila
**Version:** 2.5.6
**Requires:** Phoenix Code Desktop + Claude Code CLI installed

---

## What is this?

An extension that integrates **Claude AI** directly into Phoenix Code. You can chat with Claude, ask it to edit files in your project, perform git operations with AI — all without leaving the editor and without any extra setup.

---

## Prerequisites

Before using the extension you need to have the **Claude Code CLI** installed:

```bash
npm install -g @anthropic-ai/claude-code
```

Then authenticate with your Anthropic account:

```bash
claude
```

Follow the on-screen steps to log in. You only need to do this once.

---

## Installation

Search for **"Claude AI Assistant"** in the Phoenix Code Extension Manager and install it with one click.

> **Developers:** To test local changes, use **Debug → Load Project As Extension** and select the repository folder.

---

## How to open the panel

You have three ways to open and close the Claude panel:

| Method | Action |
|--------|--------|
| `Ctrl + Shift + C` | Open / Close panel |
| **✦** icon in the right sidebar | Open / Close panel |
| Menu **Edit → Claude: Open panel** | Open panel |

---

## The three panel modes

The panel has three tabs at the top: **Chat**, **Edit** and **Git**. Each one has a distinct purpose.

---

### 💬 Chat Mode

The default mode. Use it to converse with Claude about your code or project.

**What can you do?**
- Ask questions about your code
- Request new code or files to be generated
- Ask for explanations, suggestions or analysis
- Claude remembers the entire conversation for the current session

**Available quick buttons:**

| Button | What it does |
|--------|-------------|
| **Explain selected code** | Select code in the editor → Claude explains it in detail |
| **Refactor selected code** | Select code → Claude improves it and explains the changes |
| **Find and fix bugs** | Select code → Claude detects bugs and shows the corrected code |
| **Review whole project** | Claude reads all project files and gives a general analysis |
| **Generate documentation** | Select code → Claude generates JSDoc or comments for the language |

**How to attach code:**
1. Select the code you want in the editor
2. Click **"Attach selection"**
3. Type your question and press **Enter**

Claude will receive your question along with the attached code as context.

**Chat mode shortcuts:**

| Shortcut | Action |
|----------|--------|
| `Enter` | Send message |
| `Shift + Enter` | New line in the message |
| `Ctrl + Shift + E` | Explain selected code (opens panel automatically) |
| `Ctrl + Alt + R` | Refactor selected code |
| `Ctrl + Shift + B` | Find and fix bugs in selection |

**"New" button:** Clears the history and starts a fresh conversation from scratch.

**Language selector:** Click the **⋮** button (top-right corner of the panel) → **Language** to choose from 31 available languages. Your selection is saved automatically. If you never change it, the extension uses the language configured in Phoenix Code; if that language is not available, it falls back to English.

---

### ✏️ Edit Mode

Use it to have Claude **modify a file** in your project. Before writing to disk, it shows you a **diff preview** (added lines in green, removed lines in red) so you can approve or cancel the changes.

**How to use it?**
1. Open the file you want to edit in the editor
2. Switch to the **Edit** tab
3. Type the instruction in natural language, for example:
   - *"add validation to the email field"*
   - *"convert functions to async/await"*
   - *"add JSDoc comments to all functions"*
   - *"refactor this file to follow the MVC pattern"*
4. Press **Enter**

Claude generates the new content and shows the diff. Click **Apply** to write the file or **Cancel** to discard it. Phoenix Code reloads the file automatically when applied.

**Shortcut:**

| Shortcut | Action |
|----------|--------|
| `Ctrl + Shift + I` | Activate Edit mode (opens panel if closed) |

---

### 🌿 Git Mode

A dedicated panel for git operations with AI assistance.

**Available buttons:**

| Button | What it does |
|--------|-------------|
| **Status** | Shows the current repository status (`git status`) |
| **Log** | Shows the last 10 commits of the project |
| **Diff** | Shows current uncommitted changes |
| **✦ Auto-commit** | Claude analyzes your changes and automatically generates a descriptive commit message, then commits |
| **Push** | Pushes changes to the remote repository (`git push`) |

**Manual commit:**
1. Type the message in the text field
2. Click **Commit**

Claude runs `git add .` automatically before each commit.

> 💡 **Auto-commit** is the most useful feature: Claude reads the diff of your changes and generates a clear, descriptive commit message without you having to write it.

---

## All shortcuts summary

| Shortcut | Action |
|----------|--------|
| `Ctrl + Shift + C` | Open / Close Claude panel |
| `Ctrl + Shift + E` | Explain selected code |
| `Ctrl + Alt + R` | Refactor selected code |
| `Ctrl + Shift + B` | Find and fix bugs |
| `Ctrl + Shift + I` | Activate Edit mode |
| `Enter` (in chat) | Send message |
| `Shift + Enter` (in chat) | New line |

Also available in the **Edit** menu of Phoenix Code.

---

## FAQ

**Do I need an API Key?**
No. The extension uses the **Claude Code CLI** which authenticates with your Anthropic account (the same one you use on claude.ai or VS Code).

**Does it work without internet?**
No, Claude needs to connect to Anthropic's servers to respond.

**Can Claude see all my files?**
Yes, when you use the "Review whole project" button or ask questions about the project, Claude reads the files in the directory open in Phoenix Code. It ignores `node_modules`, `.git`, images and binary files.

**How does Claude know which project I'm in?**
It automatically detects the folder open in Phoenix Code via **File → Open Folder**. The top bar of the panel shows the project name and active file.

**Is the conversation saved between sessions?**
No, the history only exists while Phoenix Code is open. Restarting or pressing "New" clears the history.

**Does it work in the web version of Phoenix Code?**
No, it requires the **Desktop version** (desktop app) because it needs access to Node.js to run the Claude CLI.

---

## File structure

```
claude-for-phcode/
├── main.js          ← Editor panel (interface)
├── package.json     ← Extension configuration
├── lang/            ← Translations (31 languages)
│   ├── en.js
│   ├── es.js
│   └── ...
└── node/
    ├── index.js     ← Node.js backend (Claude CLI, files, git)
    └── package.json
```

---

*Developed by **Erik Dávila***
