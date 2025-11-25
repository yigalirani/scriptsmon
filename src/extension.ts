import path from 'node:path';
import {readFile,glob} from 'node:fs/promises';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "helloworld-sample" is now active!');
  const outputChannel = vscode.window.createOutputChannel("Scriptsmon");  
  vscode.tasks.onDidEndTaskProcess((event) => {
    const task = event.execution.task;
    const exitCode = event.exitCode;
    outputChannel.append(JSON.stringify(event,null,2))
  })
  const disposable = vscode.commands.registerCommand('Scriptsmon.start',async  () => {
    outputChannel.append('start')
  });
  context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}

