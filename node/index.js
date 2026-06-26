/**
 * Claude AI Assistant — Node.js backend
 * Se comunica con main.js via NodeConnector de Phoenix Code.
 * Ejecuta Claude CLI, lee archivos del proyecto y corre comandos git.
 */

const { spawn, exec } = require("child_process");
const fs   = require("fs");
const path = require("path");
const pkg  = require("../package.json");

// ── NodeConnector setup ────────────────────────────────────────────────────
const CONNECTOR_ID = "claude_assistant_connector";
let nodeConnector  = global.createNodeConnector(CONNECTOR_ID, exports);

// ── Memoria de conversación ────────────────────────────────────────────────
const sessions = {};

function getHistory(sessionId) {
    if (!sessions[sessionId]) sessions[sessionId] = [];
    return sessions[sessionId];
}

function addToHistory(sessionId, role, content) {
    if (!sessions[sessionId]) sessions[sessionId] = [];
    sessions[sessionId].push({ role, content });
    if (sessions[sessionId].length > 20) sessions[sessionId] = sessions[sessionId].slice(-20);
}

// ── Archivos del proyecto ──────────────────────────────────────────────────
const IGNORE_DIRS = new Set(["node_modules", ".git", "dist", "build", "out", ".next", "__pycache__", ".cache", "vendor", ".vscode"]);
const IGNORE_EXTS = new Set([".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".woff", ".woff2", ".ttf", ".eot", ".mp4", ".mp3", ".zip", ".tar", ".gz", ".exe", ".dll", ".pdf", ".lock"]);
const MAX_FILE_SIZE = 80 * 1024;
const MAX_FILES = 60;

function readProjectFiles(projectPath) {
    const files = [];
    function walk(dir, depth) {
        if (depth > 5 || files.length >= MAX_FILES) return;
        let entries;
        try { entries = fs.readdirSync(dir); } catch(e) { return; }
        for (const entry of entries) {
            if (files.length >= MAX_FILES) break;
            if (entry.startsWith(".")) continue;
            if (IGNORE_DIRS.has(entry)) continue;
            const fullPath = path.join(dir, entry);
            let stat;
            try { stat = fs.statSync(fullPath); } catch(e) { continue; }
            if (stat.isDirectory()) {
                walk(fullPath, depth + 1);
            } else if (stat.isFile()) {
                const ext = path.extname(entry).toLowerCase();
                if (IGNORE_EXTS.has(ext)) continue;
                if (stat.size > MAX_FILE_SIZE) continue;
                try {
                    const content = fs.readFileSync(fullPath, "utf8");
                    const rel = path.relative(projectPath, fullPath).replace(/\\/g, "/");
                    files.push({ path: rel, content });
                } catch(e) {}
            }
        }
    }
    walk(projectPath, 0);
    return files;
}

// ── Claude CLI ─────────────────────────────────────────────────────────────
function runClaude(prompt, cwd) {
    return new Promise((resolve, reject) => {
        const opts = { shell: true, env: { ...process.env } };
        if (cwd && fs.existsSync(cwd)) opts.cwd = cwd;

        const proc = spawn("claude", ["--print", "--output-format", "text", "--dangerously-skip-permissions"], opts);
        proc.stdin.write(prompt);
        proc.stdin.end();

        if (runClaude._currentProc) {
            try { runClaude._currentProc.kill(); } catch(e) {}
        }
        runClaude._currentProc = proc;

        let out = "", err = "";
        proc.stdout.on("data", d => { out += d.toString(); });
        proc.stderr.on("data", d => { err += d.toString(); });
        proc.on("close", code => {
            runClaude._currentProc = null;
            if (code === 0 || out.trim()) resolve(out.trim());
            else if (code === null) reject(new Error("Cancelled."));
            else reject(new Error(err.trim() || "Claude error code " + code));
        });
        proc.on("error", e => { runClaude._currentProc = null; reject(new Error("Could not run claude: " + e.message)); });
    });
}
runClaude._currentProc = null;

// ── Git ────────────────────────────────────────────────────────────────────
function runGit(args, cwd) {
    return new Promise((resolve, reject) => {
        exec("git " + args, { cwd, shell: true }, (err, stdout, stderr) => {
            if (err && !stdout) reject(new Error(stderr.trim() || err.message));
            else resolve((stdout + stderr).trim());
        });
    });
}

// ── Exports (funciones que llama main.js via execPeer) ─────────────────────

exports.ask = async function({ prompt, projectPath, sessionId = "default", includeProject = false, strings }) {
    const p       = strings || {};
    const history = getHistory(sessionId);

    let fullPrompt = p.systemAsk + "\n\n";

    if (projectPath && fs.existsSync(projectPath)) {
        const parts = projectPath.replace(/\\/g, "/").split("/");
        fullPrompt += p.projectLabel + parts[parts.length - 1] + " (" + projectPath + ")\n\n";

        const needsContext = includeProject
            || /proyecto|todos|archivos|estructura|revisa|analiza|review|project|files|all|structure/i.test(prompt);

        if (needsContext) {
            const files = readProjectFiles(projectPath);
            if (files.length > 0) {
                fullPrompt += p.projectFiles + "\n\n";
                fullPrompt += files.map(f => "### " + f.path + "\n```\n" + f.content + "\n```").join("\n\n");
                fullPrompt += "\n\n---\n\n";
            }
        }
    }

    if (history.length > 0) {
        fullPrompt += p.prevConvo + "\n";
        history.forEach(msg => {
            fullPrompt += (msg.role === "user" ? p.histUser : p.histAssistant) + msg.content + "\n\n";
        });
        fullPrompt += "---\n\n";
    }

    fullPrompt += p.userLabel + prompt;

    const reply = await runClaude(fullPrompt, projectPath);
    addToHistory(sessionId, "user", prompt);
    addToHistory(sessionId, "assistant", reply);
    return reply;
};

exports.editFile = async function({ instruction, filePath, projectPath, sessionId = "default", strings }) {
    const p = strings || {};
    if (!projectPath || !fs.existsSync(projectPath)) throw new Error(p.beErrNotFound + projectPath);

    const fullPath = path.join(projectPath, filePath.replace(/\//g, path.sep));
    const resolved = path.resolve(fullPath);
    if (!resolved.startsWith(path.resolve(projectPath))) throw new Error(p.beErrOutsideProject);

    let fileContent = "";
    try { fileContent = fs.readFileSync(fullPath, "utf8"); } catch(e) {}

    const history = getHistory(sessionId);
    let histCtx = "";
    if (history.length > 0) {
        histCtx = p.histContext + "\n";
        history.slice(-4).forEach(m => {
            histCtx += (m.role === "user" ? p.editHistUser : p.editHistAssist) + m.content.slice(0, 150) + "\n";
        });
        histCtx += "\n";
    }

    const editPrompt = p.systemEdit + "\n"
        + histCtx
        + p.editModify.replace("%s", filePath) + "\n\n"
        + instruction + "\n\n"
        + (fileContent
            ? p.editCurrent + "\n```\n" + fileContent + "\n```\n\n"
            : p.editCreate + "\n\n")
        + p.editImportant;

    const newContent = await runClaude(editPrompt, projectPath);
    const cleaned    = newContent.replace(/^```[\w]*\n?/, "").replace(/\n?```$/, "").trim();

    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, cleaned, "utf8");

    addToHistory(sessionId, "user",      p.editHistMsg.replace("%s", filePath).replace("%s", instruction));
    addToHistory(sessionId, "assistant", p.editHistReply.replace("%s", filePath));

    return p.editDone + filePath;
};

exports.git = async function({ action, projectPath, message, strings }) {
    const p = strings || {};
    if (!projectPath) throw new Error(p.beErrNoProject);

    switch(action) {
        case "status": return await runGit("status", projectPath);
        case "log":    return await runGit("log --oneline -10", projectPath);
        case "diff":   return await runGit("diff", projectPath);
        case "push":   return await runGit("push", projectPath);
        case "commit":
            if (!message) throw new Error(p.beErrNoCommitMsg);
            await runGit("add .", projectPath);
            return await runGit('commit -m "' + message.replace(/"/g, '\\"') + '"', projectPath);
        case "smart-commit": {
            const status   = await runGit("status", projectPath);
            const diff     = await runGit("diff", projectPath).catch(() => "");
            const msg      = await runClaude(
                p.smartCommit + status + p.smartCommitDiff + diff.slice(0, 2000),
                projectPath
            );
            const cleanMsg = msg.trim().split("\n")[0];
            await runGit("add .", projectPath);
            const result   = await runGit('commit -m "' + cleanMsg.replace(/"/g, '\\"') + '"', projectPath);
            return p.commitPrefix + cleanMsg + "\n\n" + result;
        }
        default:
            throw new Error(p.beErrUnknownAction + action);
    }
};

exports.clearHistory = async function({ sessionId = "default" }) {
    sessions[sessionId] = [];
    return true;
};

exports.ping = async function() {
    return { ok: true, version: pkg.version };
};

exports.cancel = async function() {
    if (runClaude._currentProc) {
        try { runClaude._currentProc.kill(); runClaude._currentProc = null; } catch(e) {}
        return true;
    }
    return false;
};

console.log("[Claude Node] Backend iniciado v" + pkg.version);
