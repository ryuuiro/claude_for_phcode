define(function (require, exports, module) {
    "use strict";

    var AppInit           = brackets.getModule("utils/AppInit");
    var CommandManager    = brackets.getModule("command/CommandManager");
    var Menus             = brackets.getModule("command/Menus");
    var WorkspaceManager  = brackets.getModule("view/WorkspaceManager");
    var EditorManager     = brackets.getModule("editor/EditorManager");
    var ProjectManager    = brackets.getModule("project/ProjectManager");
    var KeyBindingManager = brackets.getModule("command/KeyBindingManager");
    var NodeConnector     = brackets.getModule("NodeConnector");

    var EXTENSION_ID      = "claude-assistant";
    var CONNECTOR_ID      = "claude_assistant_connector";
    var CMD_TOGGLE_PANEL  = EXTENSION_ID + ".togglePanel";
    var CMD_EXPLAIN       = EXTENSION_ID + ".explainCode";
    var CMD_REFACTOR      = EXTENSION_ID + ".refactorCode";
    var CMD_FIX_BUGS      = EXTENSION_ID + ".fixBugs";
    var CMD_EDIT_FILE     = EXTENSION_ID + ".editFile";

    var pluginPanel     = null;
    var $panel          = null;
    var isLoading       = false;
    var attachedContext = null;
    var currentMode     = "chat";
    var SESSION_ID      = "session_" + Date.now();
    var loadingTimer    = null;
    var nodeConnector   = null;

    // ── Language ───────────────────────────────────────────────────────────
    var SUPPORTED_LANGS = [
        { code: "bg",    label: "Български"           },
        { code: "cs",    label: "Čeština"             },
        { code: "da",    label: "Dansk"               },
        { code: "de",    label: "Deutsch"             },
        { code: "el",    label: "Ελληνικά"            },
        { code: "en",    label: "English"             },
        { code: "es",    label: "Español"             },
        { code: "fa",    label: "فارسی"               },
        { code: "fi",    label: "Suomi"               },
        { code: "fr",    label: "Français"            },
        { code: "gl",    label: "Galego"              },
        { code: "hr",    label: "Hrvatski"            },
        { code: "hu",    label: "Magyar"              },
        { code: "id",    label: "Bahasa Indonesia"    },
        { code: "it",    label: "Italiano"            },
        { code: "ja",    label: "日本語"              },
        { code: "ko",    label: "한국어"              },
        { code: "nb",    label: "Norsk Bokmål"        },
        { code: "nl",    label: "Nederlands"          },
        { code: "pl",    label: "Polski"              },
        { code: "pt-br", label: "Português (Brasil)"  },
        { code: "ro",    label: "Română"              },
        { code: "ru",    label: "Русский"             },
        { code: "sk",    label: "Slovenčina"          },
        { code: "sl",    label: "Slovenščina"         },
        { code: "sr",    label: "Srpski"              },
        { code: "sv",    label: "Svenska"             },
        { code: "tr",    label: "Türkçe"              },
        { code: "uk",    label: "Українська"          },
        { code: "zh-cn", label: "中文（简体）"        },
        { code: "zh-tw", label: "中文（繁體）"        }
    ];
    var LANGS = {};
    var LANG  = "en";

    function loadLang(code, cb) {
        if (LANGS[code]) { if (cb) cb(); return; }
        require(["lang/" + code], function(mod) {
            LANGS[code] = mod;
            if (cb) cb();
        }, function() {
            if (code !== "en") { loadLang("en", cb); } else { if (cb) cb(); }
        });
    }

    (function detectLang() {
        var codes = SUPPORTED_LANGS.map(function(l) { return l.code; });
        try {
            var saved = localStorage.getItem("claude_lang");
            if (saved && codes.indexOf(saved) !== -1) { LANG = saved; return; }
        } catch (e) {}
        try {
            var loc = (brackets.getLocale() || "en").split("-")[0].toLowerCase();
            if (codes.indexOf(loc) !== -1) { LANG = loc; }
        } catch (e) {}
    })();

    function t(key) {
        var val = LANGS[LANG] && LANGS[LANG][key] !== undefined ? LANGS[LANG][key] : undefined;
        if (val === undefined) val = LANGS["en"] && LANGS["en"][key] !== undefined ? LANGS["en"][key] : key;
        return val;
    }

    // ── Panel HTML builders ────────────────────────────────────────────────

    function buildWelcomeHTML() {
        return [
            '<div id="clai-welcome" style="text-align:center;color:#6c7086;padding:16px 0;line-height:1.8">',
            '<div style="font-size:26px;margin-bottom:6px">&#10022;</div>',
            '<div style="font-size:12px;color:#a6adc8;margin-bottom:12px">' + t("welcomeSubtitle") + '</div>',
            '<div style="display:flex;flex-direction:column;gap:5px">',
            '<button class="clai-qa" data-a="explain" style="background:#313244;border:1px solid #45475a;color:#cdd6f4;border-radius:6px;padding:6px 10px;cursor:pointer;font-size:11px;text-align:left">' + t("qaExplain") + '</button>',
            '<button class="clai-qa" data-a="refactor" style="background:#313244;border:1px solid #45475a;color:#cdd6f4;border-radius:6px;padding:6px 10px;cursor:pointer;font-size:11px;text-align:left">' + t("qaRefactor") + '</button>',
            '<button class="clai-qa" data-a="fix" style="background:#313244;border:1px solid #45475a;color:#cdd6f4;border-radius:6px;padding:6px 10px;cursor:pointer;font-size:11px;text-align:left">' + t("qaFix") + '</button>',
            '<button class="clai-qa" data-a="review" style="background:#313244;border:1px solid #45475a;color:#cdd6f4;border-radius:6px;padding:6px 10px;cursor:pointer;font-size:11px;text-align:left">' + t("qaReview") + '</button>',
            '<button class="clai-qa" data-a="docs" style="background:#313244;border:1px solid #45475a;color:#cdd6f4;border-radius:6px;padding:6px 10px;cursor:pointer;font-size:11px;text-align:left">' + t("qaDocs") + '</button>',
            '</div></div>'
        ].join("");
    }

    function buildInnerHTML() {
        return [
            // ── Header ──────────────────────────────────────────────────────
            '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#181825;border-bottom:1px solid #313244;flex-shrink:0">',
            '<span style="color:#cba6f7;font-weight:700;font-size:14px">&#10022; Claude</span>',
            '<div style="display:flex;gap:4px;align-items:center">',
            '<button id="clai-btn-chat" style="background:#313244;border:1px solid #cba6f7;color:#cba6f7;border-radius:4px;padding:2px 8px;cursor:pointer;font-size:11px">' + t("btnChat") + '</button>',
            '<button id="clai-btn-edit" style="background:transparent;border:1px solid #45475a;color:#a6adc8;border-radius:4px;padding:2px 8px;cursor:pointer;font-size:11px">' + t("btnEdit") + '</button>',
            '<button id="clai-btn-git" style="background:transparent;border:1px solid #45475a;color:#a6adc8;border-radius:4px;padding:2px 8px;cursor:pointer;font-size:11px">' + t("btnGit") + '</button>',
            '<button id="clai-btn-new" style="background:transparent;border:1px solid #45475a;color:#a6adc8;border-radius:4px;padding:2px 8px;cursor:pointer;font-size:11px">' + t("btnNew") + '</button>',
            // ⋮ menu
            '<div style="position:relative">',
            '<button id="clai-btn-menu" style="background:transparent;border:1px solid #45475a;color:#a6adc8;border-radius:4px;padding:1px 7px;cursor:pointer;font-size:14px;line-height:1.2">&#8942;</button>',
            '<div id="clai-dropdown" style="display:none;position:absolute;right:0;top:calc(100% + 4px);background:#1e1e2e;border:1px solid #45475a;border-radius:6px;padding:4px 0;z-index:9999;min-width:160px;box-shadow:0 4px 16px rgba(0,0,0,0.6)">',
            '<button id="clai-lang-toggle" style="display:flex;width:100%;align-items:center;justify-content:space-between;background:none;border:none;color:#cdd6f4;padding:6px 10px;cursor:pointer;font-size:11px;box-sizing:border-box">',
            '<span>' + t("menuLanguage") + '</span><span style="color:#6c7086;font-size:9px">&#9654;</span></button>',
            '<div id="clai-lang-list" style="display:none;max-height:200px;overflow-y:auto;border-top:1px solid #313244">',
            SUPPORTED_LANGS.map(function(l) { return '<button class="clai-lang-btn" data-lang="' + l.code + '" data-label="' + l.label + '" style="display:block;width:100%;text-align:left;background:none;border:none;color:#cdd6f4;padding:5px 10px;cursor:pointer;font-size:11px;box-sizing:border-box">' + l.label + '</button>'; }).join(""),
            '</div>',
            '</div>',
            '</div>',
            '</div></div>',

            // ── Status / Project bar ─────────────────────────────────────────
            '<div id="clai-status" style="display:none;padding:4px 12px;font-size:11px;flex-shrink:0"></div>',
            '<div id="clai-project" style="padding:3px 12px;background:#11111b;font-size:10px;color:#6c7086;flex-shrink:0;border-bottom:1px solid #313244">' + t("noProject") + '</div>',

            // ── Messages ─────────────────────────────────────────────────────
            '<div id="clai-messages" style="flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:10px">',
            buildWelcomeHTML(),
            '</div>',

            // ── Context bar ──────────────────────────────────────────────────
            '<div id="clai-ctx" style="display:none;padding:4px 12px;background:#313244;font-size:11px;color:#89b4fa;border-top:1px solid #45475a;flex-shrink:0">',
            '<span id="clai-ctx-label"></span>',
            '<button id="clai-ctx-clear" style="float:right;background:none;border:none;color:#f38ba8;cursor:pointer;font-size:11px;padding:0">x</button></div>',

            // ── Edit bar ─────────────────────────────────────────────────────
            '<div id="clai-editbar" style="display:none;padding:5px 12px;background:#1e3a5f;font-size:11px;color:#89b4fa;flex-shrink:0">',
            '<span id="clai-editbar-label">' + t("editingLabel") + t("editingNone") + '</span></div>',

            // ── Git panel ────────────────────────────────────────────────────
            '<div id="clai-gitpanel" style="display:none;padding:10px 12px;background:#0d1117;border-top:1px solid #313244;flex-shrink:0">',
            '<div style="color:#cba6f7;font-size:11px;font-weight:700;margin-bottom:8px">&#10022; Git</div>',
            '<div style="display:flex;flex-wrap:wrap;gap:5px">',
            '<button class="clai-git-btn" data-action="status" style="background:#313244;border:1px solid #45475a;color:#cdd6f4;border-radius:4px;padding:4px 8px;cursor:pointer;font-size:11px">' + t("gitStatus") + '</button>',
            '<button class="clai-git-btn" data-action="log" style="background:#313244;border:1px solid #45475a;color:#cdd6f4;border-radius:4px;padding:4px 8px;cursor:pointer;font-size:11px">' + t("gitLog") + '</button>',
            '<button class="clai-git-btn" data-action="diff" style="background:#313244;border:1px solid #45475a;color:#cdd6f4;border-radius:4px;padding:4px 8px;cursor:pointer;font-size:11px">' + t("gitDiff") + '</button>',
            '<button class="clai-git-btn" data-action="smart-commit" style="background:#a6e3a1;border:none;color:#1e1e2e;border-radius:4px;padding:4px 8px;cursor:pointer;font-size:11px;font-weight:700">' + t("gitAutoCommit") + '</button>',
            '<button class="clai-git-btn" data-action="push" style="background:#89b4fa;border:none;color:#1e1e2e;border-radius:4px;padding:4px 8px;cursor:pointer;font-size:11px;font-weight:700">' + t("gitPush") + '</button>',
            '</div>',
            '<div style="display:flex;gap:5px;margin-top:6px">',
            '<input id="clai-commit-msg" placeholder="' + t("gitCommitPlaceholder") + '" style="flex:1;padding:5px 8px;background:#313244;border:1px solid #45475a;border-radius:4px;color:#cdd6f4;font-size:11px;outline:none">',
            '<button id="clai-commit-btn" style="background:#313244;border:1px solid #45475a;color:#cdd6f4;border-radius:4px;padding:4px 8px;cursor:pointer;font-size:11px">' + t("gitCommitBtn") + '</button>',
            '</div></div>',

            // ── Input area ───────────────────────────────────────────────────
            '<div style="padding:10px 12px;border-top:1px solid #313244;flex-shrink:0;background:#181825">',
            '<textarea id="clai-input" placeholder="' + t("placeholderChat") + '" style="width:100%;box-sizing:border-box;min-height:60px;max-height:130px;padding:8px;background:#313244;border:1px solid #45475a;border-radius:6px;color:#cdd6f4;font-size:12px;resize:vertical;outline:none;font-family:inherit;line-height:1.4"></textarea>',
            '<div style="display:flex;justify-content:space-between;margin-top:6px">',
            '<button id="clai-attach" style="background:transparent;border:1px solid #45475a;color:#a6adc8;border-radius:4px;padding:4px 8px;cursor:pointer;font-size:11px">' + t("attachBtn") + '</button>',
            '<button id="clai-send" style="background:#cba6f7;border:none;color:#1e1e2e;border-radius:6px;padding:6px 14px;cursor:pointer;font-size:12px;font-weight:700">' + t("sendBtn") + '</button>',
            '</div></div>'
        ].join("");
    }

    function buildPanelHTML() {
        return '<div id="clai-wrap" style="display:flex;flex-direction:column;height:100%;font-family:sans-serif;background:#1e1e2e;color:#cdd6f4;font-size:13px">'
            + buildInnerHTML()
            + '</div>';
    }

    // ── Language switching ─────────────────────────────────────────────────

    function changeLang(newLang) {
        if (newLang === LANG && LANGS[LANG]) return;
        LANG = newLang;
        try { localStorage.setItem("claude_lang", LANG); } catch (e) {}
        var savedMode = currentMode;
        var savedCtx  = attachedContext;
        attachedContext = null;
        loadLang(LANG, function() {
            $panel.html(buildInnerHTML());
            initUI();
            setMode(savedMode);
            if (savedCtx) setCtx(savedCtx);
        });
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    function getProjectPath() {
        try {
            var root = ProjectManager.getProjectRoot();
            if (!root) return null;
            var p = root.fullPath || "";
            p = p.replace(/^\/tauri\/([A-Za-z])\//, "$1:/");
            p = p.replace(/^file:\/\/\//, "").replace(/^\/([A-Za-z]:)/, "$1");
            p = p.replace(/\//g, "\\").replace(/\\$/, "");
            return p || null;
        } catch (e) { return null; }
    }

    function getCurrentFileRelative() {
        try {
            var editor = EditorManager.getActiveEditor();
            if (!editor) return null;
            var file = editor.document && editor.document.file;
            if (!file) return null;
            var fp = file.fullPath || "";
            fp = fp.replace(/^\/tauri\/([A-Za-z])\//, "$1:/");
            fp = fp.replace(/^file:\/\/\//, "").replace(/^\/([A-Za-z]:)/, "$1");
            fp = fp.replace(/\//g, "\\");
            var pp = getProjectPath();
            if (!pp) return null;
            return fp.replace(pp + "\\", "").replace(/\\/g, "/");
        } catch (e) { return null; }
    }

    function getSelectedCode() {
        try {
            var editor = EditorManager.getActiveEditor();
            if (!editor) return null;
            var sel = editor.getSelectedText();
            if (!sel || !sel.trim()) return null;
            var name = editor.document && editor.document.file ? editor.document.file.name : "archivo";
            return { code: sel, filename: name };
        } catch (e) { return null; }
    }

    function updateProjectBar() {
        if (!$panel) return;
        var pp = getProjectPath();
        var rf = getCurrentFileRelative();
        var label = t("noProject");
        if (pp) {
            var parts = pp.replace(/\\/g, "/").split("/");
            label = parts[parts.length - 1];
            if (rf) label += " > " + rf;
        }
        $panel.find("#clai-project").text(label);
    }

    // ── Node calls ─────────────────────────────────────────────────────────

    function callNode(fn, params) {
        if (!nodeConnector) return Promise.reject(new Error("Node no disponible"));
        return nodeConnector.execPeer(fn, params);
    }

    var BE_KEYS = [
        "systemAsk","systemEdit","projectLabel","projectFiles","prevConvo",
        "histUser","histAssistant","userLabel","editModify","editCurrent",
        "editCreate","editImportant","histContext","editHistUser","editHistAssist",
        "editDone","editHistMsg","editHistReply","smartCommit","smartCommitDiff",
        "commitPrefix","beErrNoProject","beErrNoCommitMsg","beErrUnknownAction",
        "beErrNotFound","beErrOutsideProject","beErrCancelled","beErrCantRun"
    ];
    function getStrings() {
        var s = {};
        BE_KEYS.forEach(function(k) { s[k] = t(k); });
        return s;
    }

    // ── Markdown ───────────────────────────────────────────────────────────

    function renderMarkdown(text) {
        text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, function(_, lang, code) {
            var esc = code.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
            var enc = encodeURIComponent(code);
            return '<div style="position:relative"><pre style="background:#11111b;border:1px solid #313244;border-radius:6px;padding:10px;overflow-x:auto;font-size:11px;margin:6px 0;line-height:1.5"><code style="color:#cdd6f4;font-family:monospace">' + esc + '</code></pre><button class="clai-copy" data-c="' + enc + '" style="position:absolute;top:6px;right:6px;background:#313244;border:1px solid #45475a;color:#a6adc8;border-radius:4px;padding:2px 6px;cursor:pointer;font-size:10px">' + t("copyBtn") + '</button></div>';
        });
        text = text.replace(/`([^`]+)`/g, '<code style="background:#313244;padding:1px 4px;border-radius:3px;color:#89dceb;font-size:11px">$1</code>');
        text = text.replace(/\*\*(.+?)\*\*/g, '<strong style="color:#f9e2af">$1</strong>');
        text = text.replace(/\*(.+?)\*/g, '<em style="color:#89b4fa">$1</em>');
        text = text.replace(/^### (.+)$/gm, '<h3 style="color:#cba6f7;margin:8px 0 4px;font-size:13px">$1</h3>');
        text = text.replace(/^## (.+)$/gm, '<h2 style="color:#cba6f7;margin:8px 0 4px;font-size:14px">$1</h2>');
        text = text.replace(/^# (.+)$/gm, '<h1 style="color:#cba6f7;margin:8px 0 4px;font-size:15px">$1</h1>');
        text = text.replace(/^[*-] (.+)$/gm, '<li style="margin:2px 0;color:#cdd6f4">$1</li>');
        text = text.replace(/\n\n/g, '</p><p style="margin:6px 0">');
        text = text.replace(/\n/g, '<br>');
        return '<p style="margin:0;line-height:1.6">' + text + '</p>';
    }

    // ── UI ─────────────────────────────────────────────────────────────────

    function showStatus(msg, color) {
        $panel.find("#clai-status").html('<span style="color:' + (color || "#a6adc8") + '">' + msg + '</span>').show();
    }

    function appendMessage(role, content, isError) {
        var $msgs = $panel.find("#clai-messages");
        $msgs.find("#clai-welcome").hide();
        var isUser = role === "user";
        var st;
        if (isUser)       st = "background:#313244;margin-left:20px;border-radius:12px 12px 4px 12px";
        else if (isError) st = "background:#45102a;border:1px solid #f38ba8;border-radius:12px 12px 12px 4px";
        else              st = "background:#1e1e2e;border:1px solid #313244;border-radius:12px 12px 12px 4px";
        var lbl = isUser
            ? '<span style="color:#89b4fa;font-size:10px;font-weight:700;display:block;margin-bottom:3px">' + t("youLabel") + '</span>'
            : '<span style="color:#cba6f7;font-size:10px;font-weight:700;display:block;margin-bottom:3px">' + t("claudeLabel") + '</span>';
        var body = isUser
            ? '<div style="color:#cdd6f4;white-space:pre-wrap;font-size:12px;line-height:1.5">' + content + '</div>'
            : renderMarkdown(content);
        var $msg = $('<div style="padding:10px 12px;' + st + '">' + lbl + body + '</div>');
        $msgs.append($msg);
        $msg.find(".clai-copy").on("click", function() {
            var code    = decodeURIComponent($(this).data("c"));
            var btn     = this;
            var copyTxt = t("copiedBtn");
            if (navigator.clipboard) navigator.clipboard.writeText(code).then(function() {
                $(btn).text(copyTxt);
                setTimeout(function() { $(btn).text(t("copyBtn")); }, 2000);
            });
        });
        $msgs.scrollTop($msgs[0].scrollHeight);
    }

    function showLoading(msg) {
        isLoading = true;
        var $msgs = $panel.find("#clai-messages");
        var $l = $([
            '<div id="clai-loader" style="padding:10px 12px;background:#1e1e2e;border:1px solid #313244;border-radius:12px 12px 12px 4px;font-size:12px">',
            '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">',
            '<span style="color:#6c7086"><span style="color:#cba6f7">&#10022;</span> ' + (msg || t("loadingDefault")) + '<span class="clai-dots">.</span></span>',
            '<button id="clai-cancel-btn" style="background:#45102a;border:1px solid #f38ba8;color:#f38ba8;border-radius:4px;padding:1px 7px;cursor:pointer;font-size:10px">' + t("cancelBtn") + '</button>',
            '</div>',
            '<div style="color:#6c7086;font-size:10px">' + t("timeLabel") + '<span id="clai-timer">0s</span></div>',
            '</div>'
        ].join(""));
        $msgs.append($l);
        $msgs.scrollTop($msgs[0].scrollHeight);
        var d = 0;
        $l.data("iv", setInterval(function() { d = (d + 1) % 4; $l.find(".clai-dots").text(".".repeat(d + 1)); }, 400));
        var secs = 0;
        loadingTimer = setInterval(function() {
            secs++;
            var $t = $panel.find("#clai-timer");
            if ($t.length) $t.text(secs + "s");
        }, 1000);
        $l.find("#clai-cancel-btn").on("click", function() {
            callNode("cancel", {}).catch(function(){});
            hideLoading();
            appendMessage("assistant", t("cancelled"), false);
            isLoading = false;
        });
    }

    function hideLoading() {
        isLoading = false;
        if (loadingTimer) { clearInterval(loadingTimer); loadingTimer = null; }
        var $l = $panel.find("#clai-loader");
        clearInterval($l.data("iv"));
        $l.remove();
    }

    function setCtx(ctx) {
        attachedContext = ctx;
        if (ctx) {
            $panel.find("#clai-ctx").show();
            $panel.find("#clai-ctx-label").text(ctx.filename + " (" + ctx.code.split("\n").length + " " + t("linesLabel") + ")");
        } else { $panel.find("#clai-ctx").hide(); }
    }

    function setMode(mode) {
        currentMode = mode;
        $panel.find("#clai-btn-chat, #clai-btn-edit, #clai-btn-git").css({ background: "transparent", "border-color": "#45475a", color: "#a6adc8" });
        $panel.find("#clai-btn-" + mode).css({ background: "#313244", "border-color": "#cba6f7", color: "#cba6f7" });
        $panel.find("#clai-editbar, #clai-gitpanel").hide();
        if (mode === "edit") {
            $panel.find("#clai-editbar").show();
            var rf = getCurrentFileRelative();
            $panel.find("#clai-editbar-label").text(t("editingLabel") + (rf || t("editingOpenFirst")));
            $panel.find("#clai-input").attr("placeholder", t("placeholderEdit"));
        } else if (mode === "git") {
            $panel.find("#clai-gitpanel").show();
            $panel.find("#clai-input").attr("placeholder", t("placeholderGit"));
        } else {
            $panel.find("#clai-input").attr("placeholder", t("placeholderChat"));
        }
    }

    function sendMessage(override, includeProject) {
        if (isLoading) return;
        var $inp = $panel.find("#clai-input");
        var raw  = override || $inp.val().trim();
        if (!raw) return;
        if (!override) $inp.val("");

        appendMessage("user", raw);

        var pp = getProjectPath();
        var rf = getCurrentFileRelative();

        if (currentMode === "edit") {
            if (!rf) { appendMessage("assistant", t("errOpenFile"), true); return; }
            showLoading(t("loadingEdit"));
            callNode("editFile", { instruction: raw, filePath: rf, projectPath: pp, sessionId: SESSION_ID, strings: getStrings() })
                .then(function(msg) { hideLoading(); appendMessage("assistant", t("donePrefix") + msg); })
                .catch(function(err) { hideLoading(); appendMessage("assistant", t("errPrefix") + err.message, true); });
        } else {
            showLoading();
            var prompt = "";
            if (pp) { var parts = pp.replace(/\\/g, "/").split("/"); prompt += "Proyecto: " + parts[parts.length - 1] + "\n"; }
            if (rf) prompt += "Archivo activo: " + rf + "\n";
            if (prompt) prompt += "\n";
            if (attachedContext) {
                prompt += raw + "\n\nCodigo de " + attachedContext.filename + ":\n```\n" + attachedContext.code + "\n```";
                setCtx(null);
            } else {
                prompt += raw;
            }
            callNode("ask", { prompt: prompt, projectPath: pp, sessionId: SESSION_ID, includeProject: !!includeProject, strings: getStrings() })
                .then(function(reply) { hideLoading(); appendMessage("assistant", reply); })
                .catch(function(err) { hideLoading(); appendMessage("assistant", t("errPrefix") + err.message, true); });
        }
    }

    function runGitAction(action) {
        var pp = getProjectPath();
        if (!pp) { appendMessage("assistant", t("errNoProject"), true); return; }
        if (action === "commit") {
            var msg = $panel.find("#clai-commit-msg").val().trim();
            if (!msg) { alert(t("errCommitMsg")); return; }
            showLoading(t("loadingCommit"));
            callNode("git", { action: "commit", projectPath: pp, message: msg, strings: getStrings() })
                .then(function(r) { hideLoading(); $panel.find("#clai-commit-msg").val(""); appendMessage("assistant", "**Commit:**\n\n```\n" + r + "\n```"); })
                .catch(function(e) { hideLoading(); appendMessage("assistant", t("gitErrPrefix") + e.message, true); });
            return;
        }
        var labels = {
            status:         t("loadingStatus"),
            log:            t("loadingLog"),
            diff:           t("loadingDiff"),
            "smart-commit": t("loadingSmartCommit"),
            push:           t("loadingPush")
        };
        showLoading(labels[action] || action);
        callNode("git", { action: action, projectPath: pp, strings: getStrings() })
            .then(function(r) { hideLoading(); appendMessage("assistant", "**git " + action + ":**\n\n```\n" + r + "\n```"); })
            .catch(function(e) { hideLoading(); appendMessage("assistant", t("gitErrPrefix") + e.message, true); });
    }

    function quickPrompt(action) {
        var ctx   = getSelectedCode();
        var block = ctx ? "\n\n```\n// " + ctx.filename + "\n" + ctx.code + "\n```" : "";
        var rf    = getCurrentFileRelative();
        var map = {
            explain:  t("quickExplain") + block,
            refactor: t("quickRefactor") + block,
            fix:      t("quickFix") + block,
            review:   t("quickReview") + (rf ? t("quickReviewFile") + rf + ")" : "") + t("quickReviewAnalysis"),
            docs:     t("quickDocs") + block
        };
        return map[action] || null;
    }

    function initUI() {
        updateProjectBar();
        setMode("chat");

        callNode("ping", {}).then(function(r) {
            showStatus(t("claudeReady") + r.version, "#a6e3a1");
            setTimeout(function() { $panel.find("#clai-status").hide(); }, 3000);
        }).catch(function() {
            showStatus(t("nodeUnavailable"), "#f38ba8");
        });

        $panel.find("#clai-btn-chat").off("click").on("click", function() { setMode("chat"); });
        $panel.find("#clai-btn-edit").off("click").on("click", function() { setMode("edit"); });
        $panel.find("#clai-btn-git").off("click").on("click", function() { setMode("git"); });

        $panel.find("#clai-btn-new").off("click").on("click", function() {
            SESSION_ID = "session_" + Date.now();
            callNode("clearHistory", { sessionId: SESSION_ID }).catch(function(){});
            $panel.find("#clai-messages").html(buildWelcomeHTML());
            setCtx(null);
        });

        // ⋮ menu
        $panel.find("#clai-btn-menu").off("click").on("click", function(e) {
            e.stopPropagation();
            var $dd = $panel.find("#clai-dropdown");
            if (!$dd.is(":visible")) $panel.find("#clai-lang-list").hide();
            $dd.toggle();
        });

        $panel.find("#clai-lang-toggle").off("click").on("click", function(e) {
            e.stopPropagation();
            var $list = $panel.find("#clai-lang-list");
            $list.find(".clai-lang-btn").each(function() {
                var isActive = $(this).data("lang") === LANG;
                $(this).css("color", isActive ? "#cba6f7" : "#cdd6f4");
                $(this).text((isActive ? "✓ " : "  ") + $(this).data("label"));
            });
            $list.toggle();
        });

        $panel.off("click", ".clai-lang-btn").on("click", ".clai-lang-btn", function(e) {
            e.stopPropagation();
            var lang = $(this).data("lang");
            $panel.find("#clai-dropdown").hide();
            changeLang(lang);
        });

        $(document).off("click.claude-menu").on("click.claude-menu", function() {
            if ($panel) $panel.find("#clai-dropdown").hide();
        });

        $panel.find("#clai-attach").off("click").on("click", function() {
            var ctx = getSelectedCode();
            if (!ctx) { alert(t("errSelectCode")); return; }
            setCtx(ctx);
        });
        $panel.find("#clai-ctx-clear").off("click").on("click", function() { setCtx(null); });
        $panel.find("#clai-send").off("click").on("click", function() { sendMessage(); });
        $panel.find("#clai-input").off("keydown").on("keydown", function(e) {
            if (e.keyCode === 13 && !e.shiftKey) { e.preventDefault(); sendMessage(); }
        });
        $panel.off("click", ".clai-qa").on("click", ".clai-qa", function() {
            var a = $(this).data("a");
            var p = quickPrompt(a);
            if (p) sendMessage(p, a === "review");
        });
        $panel.off("click", ".clai-git-btn").on("click", ".clai-git-btn", function() { runGitAction($(this).data("action")); });
        $panel.find("#clai-commit-btn").off("click").on("click", function() { runGitAction("commit"); });

        EditorManager.off("activeEditorChange.claude");
        EditorManager.on("activeEditorChange.claude", function() {
            updateProjectBar();
            if (currentMode === "edit") {
                var rf = getCurrentFileRelative();
                $panel.find("#clai-editbar-label").text(t("editingLabel") + (rf || t("editingOpenFirst")));
            }
        });
    }

    function togglePanel() {
        function updateBtn() {
            $("#claude-sidebar-btn").css("border-left", (pluginPanel && pluginPanel.isVisible()) ? "2px solid #cba6f7" : "2px solid transparent");
        }
        if (!pluginPanel) {
            loadLang(LANG, function() {
                $panel = $(buildPanelHTML());
                var $ico = $('<a href="#" title="Claude AI" style="font-size:15px;color:#cba6f7;text-decoration:none;padding:5px 8px;display:inline-block">&#10022;</a>');
                pluginPanel = WorkspaceManager.createPluginPanel(EXTENSION_ID + ".panel", $panel, 310, $ico, 500);
                initUI();
                pluginPanel.show();
                updateBtn();
            });
        } else if (pluginPanel.isVisible()) {
            pluginPanel.hide();
            updateBtn();
        } else {
            loadLang(LANG, function() {
                initUI();
                pluginPanel.show();
                updateBtn();
            });
        }
    }

    AppInit.appReady(function() {
        nodeConnector = NodeConnector.createNodeConnector(CONNECTOR_ID, exports);

        CommandManager.register("Claude: Abrir panel",      CMD_TOGGLE_PANEL, togglePanel);
        CommandManager.register("Claude: Explicar codigo",  CMD_EXPLAIN,      function() {
            var c = getSelectedCode();
            if (!c) { alert(t("errSelectCode2")); return; }
            if (!pluginPanel || !pluginPanel.isVisible()) togglePanel();
            sendMessage(t("quickExplain") + "\n\n```\n" + c.code + "\n```");
        });
        CommandManager.register("Claude: Refactorizar",     CMD_REFACTOR,     function() {
            var c = getSelectedCode();
            if (!c) { alert(t("errSelectCode2")); return; }
            if (!pluginPanel || !pluginPanel.isVisible()) togglePanel();
            sendMessage(t("quickRefactor") + "\n\n```\n" + c.code + "\n```");
        });
        CommandManager.register("Claude: Corregir errores", CMD_FIX_BUGS,     function() {
            var c = getSelectedCode();
            if (!c) { alert(t("errSelectCode2")); return; }
            if (!pluginPanel || !pluginPanel.isVisible()) togglePanel();
            sendMessage(t("quickFix") + "\n\n```\n" + c.code + "\n```");
        });
        CommandManager.register("Claude: Editar archivo",   CMD_EDIT_FILE,    function() {
            if (!pluginPanel || !pluginPanel.isVisible()) togglePanel();
            setMode("edit");
        });

        KeyBindingManager.addBinding(CMD_TOGGLE_PANEL, "Ctrl-Shift-C");
        KeyBindingManager.addBinding(CMD_EXPLAIN,      "Ctrl-Shift-E");
        KeyBindingManager.addBinding(CMD_REFACTOR,     "Ctrl-Alt-R");
        KeyBindingManager.addBinding(CMD_FIX_BUGS,     "Ctrl-Shift-B");
        KeyBindingManager.addBinding(CMD_EDIT_FILE,    "Ctrl-Shift-I");

        var menu = Menus.getMenu(Menus.AppMenuBar.EDIT_MENU);
        menu.addMenuDivider();
        menu.addMenuItem(CMD_TOGGLE_PANEL);
        menu.addMenuItem(CMD_EXPLAIN);
        menu.addMenuItem(CMD_REFACTOR);
        menu.addMenuItem(CMD_FIX_BUGS);
        menu.addMenuItem(CMD_EDIT_FILE);

        var $btn = $('<a id="claude-sidebar-btn" href="#" title="Claude AI (Ctrl+Shift+C)" style="display:flex;align-items:center;justify-content:center;width:100%;height:36px;color:#cba6f7;font-size:17px;text-decoration:none;border-left:2px solid transparent">&#10022;</a>');
        $btn.on("click", function(e) { e.preventDefault(); togglePanel(); });
        $("#plugin-icons-bar .buttons").append($btn);
    });
});
