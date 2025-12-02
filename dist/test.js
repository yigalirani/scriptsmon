// src/monitor.ts
import * as path from "node:path";
import { spawn } from "@homebridge/node-pty-prebuilt-multiarch";

// node_modules/@yigal/base_types/src/index.ts
var green = "\x1B[40m\x1B[32m";
var red = "\x1B[40m\x1B[31m";
var yellow = "\x1B[40m\x1B[33m";
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
function is_promise(value) {
  if (!is_object(value))
    return false;
  const ans = typeof value.then === "function";
  return ans;
}
async function resolve_maybe_promise(a) {
  if (is_promise(a))
    return await a;
  return a;
}
async function run_tests(...tests) {
  let passed = 0;
  let failed = 0;
  for (const { k, v, f } of tests) {
    const ek = (function() {
      if (k != null)
        return k;
      const fstr = String(f);
      {
        const match = fstr.match(/(\(\) => )(.*)/);
        if (match?.length === 3)
          return match[2];
      }
      {
        const match = fstr.match(/function\s(\w+)/);
        if (match?.length === 2)
          return match[1];
      }
      return;
    })();
    try {
      const ret = f();
      const effective_v = v ?? true;
      const resolved = await resolve_maybe_promise(ret);
      if (resolved === effective_v) {
        console.log(`\u2705 ${ek}: ${green}${effective_v}${reset}`);
        passed++;
      } else {
        console.error(`\u274C ${ek}:expected ${yellow}${effective_v}${reset}, got ${red}${resolved}${reset}`);
        failed++;
      }
    } catch (err) {
      console.error(`\u{1F4A5} ${ek} threw an error:`, err);
      failed++;
    }
  }
  if (failed === 0)
    console.log(`
Summary:  all ${passed} passed`);
  else
    console.log(`
Summary:  ${failed} failed, ${passed} passed`);
}
async function get_node() {
  if (typeof window !== "undefined") {
    throw new Error("getFileContents() requires Node.js");
  }
  const path2 = await import("node:path");
  const fs = await import("node:fs/promises");
  return { fs, path: path2 };
}
async function mkdir_write_file(filePath, data) {
  const { path: path2, fs } = await get_node();
  const directory = path2.dirname(filePath);
  try {
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(filePath, data);
    console.log(`File '${filePath}' has been written successfully.`);
  } catch (err) {
    console.error("Error writing file", err);
  }
}
async function read_json_object(filename, object_type) {
  const { fs } = await get_node();
  try {
    const data = await fs.readFile(filename, "utf-8");
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
  return state !== "running" && state !== "spawning";
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
function run_runner({
  //this is not async function on purpuse
  runner,
  reason
}) {
  void new Promise((resolve2, _reject) => {
    const { script, full_pathname } = runner;
    runner.state = "spawning";
    const shell = process.platform === "win32" ? "cmd.exe" : "/bin/sh";
    const shellArgs = process.platform === "win32" ? ["/c", script] : ["-c", script];
    const child = spawn(shell, shellArgs, {
      name: "xterm-color",
      useConpty: false,
      cols: 80,
      rows: 30,
      cwd: full_pathname,
      env: { ...process.env, FORCE_COLOR: "3" }
    });
    if (child === null)
      return;
    runner.start_time = Date.now();
    runner.state = "running";
    runner.reason = reason;
    const dataDisposable = child.onData((data) => {
      runner.output.push({ data, type: "stdout" });
    });
    const exitDisposable = child.onExit(({ exitCode }) => {
      dataDisposable.dispose();
      exitDisposable.dispose();
      runner.state = exitCode === 0 ? "done" : "crashed";
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
        runner.state = "stopped";
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
        output: [],
        id
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
    const folders2 = [];
    if (is_string_array(workspaces))
      for (const workspace of workspaces) {
        const ret = await f(path.join(full_pathname, workspace), workspace);
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

// src/test.ts
async function get_package_json_length() {
  const ans = await read_package_json([".", "..\\million_try3"]);
  return Object.keys(ans).length;
}
if (import.meta.main) {
  void run_tests({
    k: "run on self",
    v: 5,
    f: get_package_json_length
  });
}
//# sourceMappingURL=test.js.map
