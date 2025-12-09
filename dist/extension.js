// src/monitor.ts
import * as path from "node:path";
import { spawn } from "@homebridge/node-pty-prebuilt-multiarch";

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
function pk(obj, ...keys) {
  const ret = {};
  keys.forEach((key) => {
    ret[key] = obj?.[key];
  });
  return ret;
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
async function sleep(ms) {
  return await new Promise((resolve2) => {
    setTimeout(() => resolve2(void 0), ms);
  });
}

// src/monitor.ts
function is_ready_to_start(state) {
  return state !== "running";
}
var runner_base_keys = [
  "watch",
  "filter",
  "pre",
  "type",
  "name",
  "full_pathname",
  "script",
  "autorun",
  "state",
  "last_start_time",
  "last_end_time",
  "start_time",
  "reason",
  "last_reason",
  "last_err",
  "output",
  "id",
  "version"
];
function extract_base(folder) {
  const { full_pathname } = folder;
  const runners = [];
  for (const runner of folder.runners) {
    const runner_base = pk(runner, ...runner_base_keys);
    if (runner.output.length !== 0) {
      console.log(`runner ${runner.name} ${JSON.stringify(runner.output)}`);
      runner.output = [];
    }
    runners.push(runner_base);
  }
  const folders2 = folder.folders.map(extract_base);
  return { id: full_pathname, ...folder, folders: folders2, runners };
}
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
function set_state(runner, state) {
  runner.state = state;
  runner.version++;
}
function run_runner({
  //this is not async function on purpuse
  runner,
  reason
}) {
  void new Promise((resolve2, _reject) => {
    const { script, full_pathname } = runner;
    set_state(runner, "running");
    const shell = process.platform === "win32" ? "cmd.exe" : "/bin/sh";
    const shellArgs = process.platform === "win32" ? ["/c", script] : ["-c", script];
    const child = spawn(shell, shellArgs, {
      // name: 'xterm-color',
      cols: 200,
      useConpty: false,
      cwd: full_pathname,
      env: { ...process.env, FORCE_COLOR: "3" }
    });
    if (child === null)
      return;
    runner.start_time = Date.now();
    runner.reason = reason;
    const dataDisposable = child.onData((data) => {
      runner.output.push(data);
      runner.output_time = Date.now();
    });
    const exitDisposable = child.onExit(({ exitCode, signal }) => {
      dataDisposable.dispose();
      exitDisposable.dispose();
      console.log({ exitCode, signal });
      const new_state = exitCode === 0 ? "done" : "error";
      set_state(runner, new_state);
      runner.last_end_time = Date.now();
      runner.last_start_time = runner.start_time;
      runner.start_time = void 0;
      runner.last_reason = runner.reason;
      resolve2(null);
    });
  });
}
async function stop(runner) {
  const { state } = runner;
  let was_stopped = false;
  while (true) {
    if (is_ready_to_start(runner.state)) {
      if (was_stopped)
        set_state(runner, "stopped");
      return Promise.resolve();
    }
    if (!was_stopped) {
      was_stopped = true;
      console.log(`stopping runner ${runner.name}...`);
      runner.child?.kill();
    }
    await sleep(10);
  }
}
function make_start(runner) {
  return async function(reason) {
    await stop(runner);
    run_runner({ runner, reason });
  };
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
      const full_pathname = path.dirname(pkgPath);
      const id = `${full_pathname} ${name}`.replaceAll(/\\|:/g, "-").replaceAll(" ", "--");
      const ans2 = {
        type: "runner",
        ...watcher,
        //i like this
        name,
        script,
        full_pathname,
        watch: [...normalize_watch($watch), ...normalize_watch(watcher.watch)],
        autorun: autorun.includes(name),
        state: "ready",
        child: void 0,
        start_time: 0,
        last_end_time: void 0,
        last_start_time: void 0,
        start: (reason) => Promise.resolve(),
        reason: "",
        last_reason: "",
        last_err: void 0,
        id,
        output: [],
        version: 0
      };
      ans2.start = make_start(ans2);
      return ans2;
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
    const folders3 = [];
    if (is_string_array(workspaces))
      for (const workspace of workspaces) {
        const ret = await f(path.join(full_pathname, workspace), workspace);
        if (ret != null)
          folders3.push(ret);
      }
    const ans = { runners, folders: folders3, name, full_pathname, scriptsmon, type: "folder" };
    return ans;
  }
  const folders2 = [];
  for (const pathname of full_pathnames) {
    const full_pathname = path.resolve(pathname);
    const ret = await f(full_pathname, path.basename(full_pathname));
    if (ret != null)
      folders2.push(ret);
  }
  const root = {
    name: "root",
    full_pathname: "",
    folders: folders2,
    runners: [],
    scriptsmon: {},
    type: "folder"
  };
  await mkdir_write_file("c:\\yigal\\generated\\packages.json", JSON.stringify(root, null, 2));
  return root;
}

// src/extension.ts
import * as vscode from "vscode";

// src/vscode_utils.ts
import * as path2 from "node:path";
import * as fs from "node:fs";
import {
  Uri,
  window as window2
} from "vscode";
function getWebviewContent(context, webview) {
  const htmlPath = path2.join(context.extensionPath, "client", "resources", "index.html");
  let html = fs.readFileSync(htmlPath, "utf-8");
  const base = webview.asWebviewUri(
    Uri.joinPath(context.extensionUri, "client", "resources")
  ).toString() + "/";
  html = html.replaceAll("./", base);
  return html;
}
function define_webview({ context, id, html, f }) {
  console.log("define_webview");
  const provider = {
    resolveWebviewView(webviewView, webview_context) {
      console.log("resolveWebviewView");
      webviewView.webview.options = {
        enableScripts: true,
        localResourceRoots: [
          Uri.file(path2.join(context.extensionPath, "client/resources"))
        ]
      };
      webviewView.webview.html = getWebviewContent(context, webviewView.webview);
      if (f)
        void f(webviewView, context);
    }
  };
  const reg = window2.registerWebviewViewProvider(
    id,
    provider
  );
  const ans = context.subscriptions.push(reg);
  console.log(ans);
}

// src/extension.ts
function post_message(view, msg) {
  view.postMessage(msg);
}
function find_runner(root, id) {
  function f(folder) {
    const ans = folder.runners.find((x) => x.id === id);
    if (ans != null)
      return ans;
    for (const subfolder of folder.folders) {
      const ans2 = f(subfolder);
      if (ans2 != null)
        return ans2;
    }
  }
  return f(root);
}
var folders = ["c:\\yigal\\scriptsmon", "c:\\yigal\\million_try3"];
var the_loop = async function(view, context) {
  const root = await read_package_json(folders);
  function send_report(root2) {
    post_message(view.webview, {
      command: "RunnerReport",
      root: extract_base(root2),
      base_uri: view.webview.asWebviewUri(context.extensionUri).toString()
    });
  }
  setInterval(() => {
    send_report(root);
  }, 100);
  view.webview.onDidReceiveMessage(
    (message) => {
      switch (message.command) {
        case "command_clicked": {
          const runner = find_runner(root, message.id);
          if (runner)
            void runner.start("user");
          break;
        }
      }
    },
    void 0,
    context.subscriptions
  );
};
function activate(context) {
  console.log('Congratulations, your extension "Scriptsmon" is now active!');
  define_webview({ context, id: "Scriptsmon.webview", html: "client/resources/index.html", f: the_loop });
  const outputChannel = vscode.window.createOutputChannel("Scriptsmon");
  vscode.tasks.onDidEndTaskProcess((event) => {
    outputChannel.append(JSON.stringify(event, null, 2));
  });
}
function deactivate() {
}
export {
  activate,
  deactivate,
  runner_base_keys
};
//# sourceMappingURL=extension.js.map
