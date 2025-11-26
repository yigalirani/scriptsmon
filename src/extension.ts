import path from 'node:path';
import {readFile,glob} from 'node:fs/promises';
import {read_package_json,type Runner,type Folder} from './monitor.js'
import * as vscode from 'vscode';
type MonitorNode=Runner|Folder

export class MonitorProvider implements vscode.TreeDataProvider<MonitorNode> {
  root: Folder
  constructor( root: Folder) {
    this.root=root
  }

  getTreeItem(element: MonitorNode): vscode.TreeItem {
    return {
      label:element.name,
      collapsibleState:element.type==='folder'?2:0
    }
  }

  getChildren(element?: MonitorNode): Thenable<MonitorNode[]> {
    if (!this.root) {
      vscode.window.showInformationMessage('No Monitor in empty workspace');
      return Promise.resolve([]);
    }
    if (element==null)
      return Promise.resolve(this.root.folders)
    if (element.type==='runner')
      return Promise.resolve([])
    return Promise.resolve([...element.folders,...element.runners])
  }
}


export async function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "Scriptsmon" is now active!');
  const outputChannel = vscode.window.createOutputChannel("Scriptsmon");  
  vscode.tasks.onDidEndTaskProcess((event) => {
    outputChannel.append(JSON.stringify(event,null,2))
  })
  const {workspaceFolders}= vscode.workspace
  //const folders=(workspaceFolders||[]).map(x=>x.uri.fsPath)
  const folders=["c:\\yigal\\million_try3"]
  const root=await  read_package_json(folders)
  vscode.window.createTreeView('Scriptsmon.tree', {
    treeDataProvider: new MonitorProvider(root)
  });

  const disposable = vscode.commands.registerCommand('Scriptsmon.start',  () => {
    outputChannel.append('start')
  });
  context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}

