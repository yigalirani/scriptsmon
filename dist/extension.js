// src/extension.ts
import * as vscode from "vscode";
function activate(context) {
  console.log('Congratulations, your extension "helloworld-sample" is now active!');
  const outputChannel = vscode.window.createOutputChannel("Scriptsmon");
  vscode.tasks.onDidEndTaskProcess((event) => {
    const task = event.execution.task;
    const exitCode = event.exitCode;
    outputChannel.append(JSON.stringify(event, null, 2));
  });
  const disposable = vscode.commands.registerCommand("Scriptsmon.start", async () => {
    outputChannel.append("start");
  });
  context.subscriptions.push(disposable);
}
function deactivate() {
}
export {
  activate,
  deactivate
};
//# sourceMappingURL=extension.js.map
