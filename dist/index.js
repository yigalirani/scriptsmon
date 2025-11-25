// src/index.ts
import path from "path";
import { readFile, glob } from "fs/promises";
import * as vscode from "vscode";
async function get_sub_workspaces(folder) {
  try {
    const file_name = path.join(folder, "package.json");
    const content = await readFile(file_name, "utf8");
    const { workspaces } = JSON.parse(content);
    if (!Array.isArray(workspaces))
      return [];
    return workspaces.filter((x) => typeof x === "string").map((x) => path.join(folder, x));
  } catch (_ex) {
    return [];
  }
}
function getCommonPrefix(paths) {
  if (paths.length === 0) return "";
  if (paths.length === 1) return paths[0];
  const splitPaths = paths.map((p) => p.split(/[\\/]+/));
  const commonParts = [];
  const first = splitPaths[0];
  for (let i = 0; i < first.length; i++) {
    const part = first[i];
    if (splitPaths.every((p) => p[i] === part)) {
      commonParts.push(part);
    } else {
      break;
    }
  }
  return commonParts.join("/");
}
async function get_dirs(top_workspaces) {
  const dirs = /* @__PURE__ */ new Set();
  for (const top_workspace of top_workspaces) {
    const normalized = path.normalize(top_workspace);
    dirs.add(normalized);
    for (const sub of await get_sub_workspaces(normalized)) {
      dirs.add(path.normalize(sub));
    }
  }
  return [...dirs];
}
async function get_runners(top_workspaces) {
  const ans = [];
  const common = getCommonPrefix(top_workspaces);
  const dirs = await get_dirs(top_workspaces);
  for (const run_dir of dirs) {
    for (const base of ["", "bin"]) {
      const glob_pat = path.join(run_dir, base, "watch_*.{ts,js,mjs}");
      console.log(glob_pat);
      for await (const full_filename of glob(glob_pat)) {
        console.log(full_filename);
        const relative_filename = path.relative(common, full_filename);
        ans.push({ relative_filename, full_filename, run_dir });
      }
    }
  }
  return ans;
}
function run_runner(runner) {
  const name = runner.relative_filename;
  const term = vscode.window.createTerminal({ name });
  term.sendText(`cd ${runner.run_dir}`);
  term.sendText(`node ${runner.full_filename}`);
}
function run_runners(runners) {
  const exists = /* @__PURE__ */ new Set();
  for (const term of vscode.window.terminals) {
    exists.add(term.name);
  }
  for (const runner of runners) {
    if (!exists.has(runner.relative_filename)) {
      run_runner(runner);
    }
  }
}
function activate(context) {
  console.log('Congratulations, your extension "helloworld-sample" is now active!');
  const outputChannel = vscode.window.createOutputChannel("aaaWatchRunner");
  vscode.tasks.onDidEndTaskProcess((event) => {
    const task = event.execution.task;
    const exitCode = event.exitCode;
    outputChannel.append(JSON.stringify(event, null, 2));
  });
  const disposable = vscode.commands.registerCommand("WatchRunner.run", async () => {
    const { workspaceFolders } = vscode.workspace;
    const folders = (
      /*['c:\\yigal\\watch_runner_extension']//*/
      (workspaceFolders || []).map((x) => x.uri.fsPath)
    );
    const runners = await get_runners(folders);
    run_runners(runners);
    outputChannel.append(JSON.stringify({ runners, folders }, null, 2));
  });
  context.subscriptions.push(disposable);
}
function deactivate() {
}
export {
  activate,
  deactivate
};
//# sourceMappingURL=index.js.map
