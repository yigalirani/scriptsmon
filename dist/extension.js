// src/extension.ts
import * as path2 from "node:path";
import * as fs from "node:fs";

// src/monitor.ts
import * as path from "node:path";

// node_modules/@yigal/base_types/src/index.ts
var green = "\x1B[40m\x1B[32m";
var reset = "\x1B[0m";
function get_error(x) {
  if (x instanceof Error)
    return x;
  const str = String(x);
  return new Error(str);
}
function is_object(value) {
  if (value == null) return false;
  if (typeof value !== "object" && typeof value !== "function") return false;
  if (Array.isArray(value)) return false;
  if (value instanceof Set) return false;
  if (value instanceof Map) return false;
  return true;
}
async function get_node() {
  if (typeof window !== "undefined") {
    throw new Error("getFileContents() requires Node.js");
  }
  const path3 = await import("node:path");
  const fs2 = await import("node:fs/promises");
  return { fs: fs2, path: path3 };
}
async function mkdir_write_file(filePath, data) {
  const { path: path3, fs: fs2 } = await get_node();
  const directory = path3.dirname(filePath);
  try {
    await fs2.mkdir(directory, { recursive: true });
    await fs2.writeFile(filePath, data);
    console.log(`File '${filePath}' has been written successfully.`);
  } catch (err) {
    console.error("Error writing file", err);
  }
}
async function read_json_object(filename, object_type) {
  const { fs: fs2 } = await get_node();
  try {
    const data = await fs2.readFile(filename, "utf-8");
    const ans = JSON.parse(data);
    if (!is_object(ans))
      throw `not a valid ${object_type}`;
    return ans;
  } catch (ex) {
    console.warn(`${filename}:${get_error(ex)}.message`);
    return void 0;
  }
}
function is_string_array(a) {
  if (!Array.isArray(a))
    return false;
  for (const x of a)
    if (typeof x !== "string")
      return false;
  return true;
}

// src/monitor.ts
function is_valid_watch(a) {
  if (a == null)
    return true;
  return is_string_array(a);
}
function is_valid_watcher(a) {
  if (typeof a === "string" || is_string_array(a))
    return true;
  if (!is_object(a))
    return "expecting object";
  if (!is_valid_watch(a.watch)) {
    return "watch: expecting  array of strings";
  }
  for (const k of Object.keys(a))
    if (!["watch", "env", "filter", "pre"].includes(k))
      return `${k}:invalid key`;
  return true;
}
function is_non_watcher(k) {
  return ["autorun", "$watch"].includes(k);
}
function is_config2(a) {
  if (!is_object(a))
    return false;
  const { $watch } = a;
  if (!is_valid_watch($watch)) {
    console.log("watch: must be string or array of string");
    return false;
  }
  for (const [k, v] of Object.entries(a)) {
    if (is_non_watcher(k))
      continue;
    const valid_watcher = is_valid_watcher(v);
    if (valid_watcher !== true) {
      console.log(`${k}: invalid watcher:${valid_watcher}`);
      return false;
    }
  }
  return true;
}
function parse_config(filename, pkgJson) {
  if (pkgJson == null)
    return {};
  const { scriptsmon } = pkgJson;
  if (scriptsmon == null)
    return {};
  const ans = is_config2(scriptsmon);
  if (ans)
    return scriptsmon;
  console.warn(ans);
  return {};
}
function parse_scripts(pkgJson) {
  if (pkgJson == null)
    return {};
  const { scripts } = pkgJson;
  if (scripts == null)
    return {};
  return scripts;
}
function normalize_watch(a) {
  if (a == null)
    return [];
  return a;
}
function scriptsmon_to_runners(pkgPath, watchers, scripts) {
  const $watch = normalize_watch(watchers.$watch);
  const autorun = normalize_watch(watchers.autorun);
  const ans = [];
  for (const [name, script] of Object.entries(scripts)) {
    if (is_non_watcher(name))
      continue;
    const watcher = (function() {
      const v = watchers[name];
      if (v == null || is_string_array(v)) {
        return { watch: normalize_watch(v) };
      }
      return v;
    })();
    if (script == null) {
      console.warn(`missing script ${name}`);
      continue;
    }
    const runner = (function() {
      return {
        type: "runner",
        ...watcher,
        //i like this
        name,
        script,
        full_pathname: path.dirname(pkgPath),
        watch: [...normalize_watch($watch), ...normalize_watch(watcher.watch)],
        autorun: autorun.includes(name)
      };
    })();
    ans.push(runner);
  }
  return ans;
}
async function read_package_json(full_pathnames) {
  const folder_index = {};
  async function f(full_pathname, name) {
    const pkgPath = path.resolve(path.normalize(full_pathname), "package.json");
    const d = path.resolve(full_pathname);
    const exists = folder_index[d];
    if (exists != null) {
      console.warn(`${pkgPath}: skippin, already done`);
      return exists;
    }
    const pkgJson = await read_json_object(pkgPath, "package.json");
    if (pkgJson == null)
      return null;
    console.warn(`${green}${pkgPath}${reset}`);
    const scriptsmon = parse_config(pkgPath, pkgJson);
    const scripts = parse_scripts(pkgJson);
    const runners = scriptsmon_to_runners(pkgPath, scriptsmon, scripts);
    const { workspaces } = pkgJson;
    const folders2 = [];
    if (is_string_array(workspaces))
      for (const workspace2 of workspaces) {
        const ret = await f(path.join(full_pathname, workspace2), workspace2);
        if (ret != null)
          folders2.push(ret);
      }
    const ans = { runners, folders: folders2, name, full_pathname, scriptsmon, type: "folder" };
    return ans;
  }
  const folders = [];
  for (const pathname of full_pathnames) {
    const full_pathname = path.resolve(pathname);
    const ret = await f(full_pathname, path.basename(full_pathname));
    if (ret != null)
      folders.push(ret);
  }
  const root = {
    name: "root",
    full_pathname: "",
    folders,
    runners: [],
    scriptsmon: {},
    type: "folder"
  };
  await mkdir_write_file("c:\\yigal\\generated\\packages.json", JSON.stringify(root, null, 2));
  return root;
}

// src/extension.ts
import * as vscode from "vscode";
var MonitorProvider = class {
  root;
  folderIconPath;
  fileIconPath;
  context;
  _onDidChangeTreeData = new vscode.EventEmitter();
  onDidChangeTreeData = this._onDidChangeTreeData.event;
  constructor(root, context) {
    this.root = root;
    this.context = context;
    this.updateIcons();
    vscode.window.onDidChangeActiveColorTheme(() => {
      this.updateIcons();
      this._onDidChangeTreeData.fire();
    });
  }
  updateIcons() {
    const isDark = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark || vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.HighContrast;
    const themeSuffix = isDark ? "dark" : "light";
    this.folderIconPath = vscode.Uri.joinPath(this.context.extensionUri, "client", "resources", "icons", `folder-${themeSuffix}.svg`);
    this.fileIconPath = vscode.Uri.joinPath(this.context.extensionUri, "client", "resources", "icons", `file-${themeSuffix}.svg`);
  }
  getTreeItem(element) {
    const ans = { label: element.name };
    if (element.type === "folder")
      return {
        ...ans,
        collapsibleState: 2,
        iconPath: this.folderIconPath,
        description: element.full_pathname
      };
    return {
      ...ans,
      collapsibleState: 0,
      iconPath: this.fileIconPath,
      description: element.script,
      contextValue: "runner"
    };
  }
  getChildren(element) {
    if (!this.root) {
      vscode.window.showInformationMessage("No Monitor in empty workspace");
      return Promise.resolve([]);
    }
    if (element == null)
      return Promise.resolve(this.root.folders);
    if (element.type === "runner")
      return Promise.resolve([]);
    return Promise.resolve([...element.folders, ...element.runners]);
  }
};
function getWebviewContent(context, webview) {
  const htmlPath = path2.join(context.extensionPath, "client", "resources", "index.html");
  let html = fs.readFileSync(htmlPath, "utf-8");
  const base = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, "client", "resources")
  ).toString() + "/";
  html = html.replaceAll("./", base);
  return html;
}
function createWebviewPanel(context) {
  let counter = 0;
  const panel = vscode.window.createWebviewPanel(
    "scriptsmonWebview",
    "Scriptsmon Webview",
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true
    }
  );
  panel.webview.html = getWebviewContent(context, panel.webview);
  panel.webview.onDidReceiveMessage(
    (message) => {
      switch (message.command) {
        case "buttonClick":
          counter++;
          vscode.window.showInformationMessage(`Received: ${message.text ?? ""}`);
          panel.webview.postMessage({
            command: "updateContent",
            text: `Extension received: ${message.text ?? ""},extension counter=${counter}`
          });
          break;
      }
    },
    void 0,
    context.subscriptions
  );
  return panel;
}
async function activate(context) {
  console.log('Congratulations, your extension "Scriptsmon" is now active!');
  const outputChannel = vscode.window.createOutputChannel("Scriptsmon");
  vscode.tasks.onDidEndTaskProcess((event) => {
    outputChannel.append(JSON.stringify(event, null, 2));
  });
  const { workspaceFolders: _workspaceFolders } = vscode.workspace;
  const folders = ["c:\\yigal\\million_try3"];
  const root = await read_package_json(folders);
  const treeView = vscode.window.createTreeView("Scriptsmon.tree", {
    treeDataProvider: new MonitorProvider(root, context)
  });
  context.subscriptions.push(treeView);
  const focusDisposable = treeView.onDidChangeSelection((event) => {
    const selected = event.selection?.[0];
    if (!selected || selected.type !== "runner")
      return;
    const terminalName = `${selected.full_pathname} ${selected.name}`;
    const terminal = vscode.window.terminals.find((t) => t.name === terminalName);
    if (terminal)
      terminal.show();
  });
  context.subscriptions.push(focusDisposable);
  const disposable = vscode.commands.registerCommand("Scriptsmon.start", () => {
    outputChannel.append("start");
  });
  context.subscriptions.push(disposable);
  const playDisposable = vscode.commands.registerCommand("Scriptsmon.runner.play", (runner) => {
    if (!runner || runner.type !== "runner") {
      vscode.window.showErrorMessage("Invalid runner");
      return;
    }
    const terminalName = `${runner.full_pathname} ${runner.name}`;
    let terminal = vscode.window.terminals.find((t) => t.name === terminalName);
    if (!terminal) {
      terminal = vscode.window.createTerminal({
        name: terminalName,
        cwd: runner.full_pathname
      });
    }
    terminal.show();
    terminal.sendText(`npm run ${runner.name}`);
    outputChannel.appendLine(`Running script: ${runner.name} in ${runner.full_pathname} (terminal: ${terminalName})`);
  });
  context.subscriptions.push(playDisposable);
  const debugDisposable = vscode.commands.registerCommand("Scriptsmon.runner.debug", (runner) => {
    if (!runner || runner.type !== "runner") {
      vscode.window.showErrorMessage("Invalid runner");
      return;
    }
    const terminalName = `${runner.full_pathname} ${runner.name} (debug)`;
    let terminal = vscode.window.terminals.find((t) => t.name === terminalName);
    if (!terminal) {
      terminal = vscode.window.createTerminal({
        name: terminalName,
        cwd: runner.full_pathname
      });
    }
    terminal.show();
    terminal.sendText(`npm run ${runner.name}`);
    outputChannel.appendLine(`Debugging script: ${runner.name} in ${runner.full_pathname} (terminal: ${terminalName})`);
  });
  context.subscriptions.push(debugDisposable);
  const webviewDisposable = vscode.commands.registerCommand("Scriptsmon.webview.open", () => {
    const panel = createWebviewPanel(context);
    context.subscriptions.push(panel);
  });
  context.subscriptions.push(webviewDisposable);
}
function deactivate() {
}
export {
  MonitorProvider,
  activate,
  deactivate
};
//# sourceMappingURL=extension.js.map
