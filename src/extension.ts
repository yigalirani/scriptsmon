import path from 'node:path';
import {readFile,glob} from 'node:fs/promises';
import {read_package_json,type Runner,type Folder} from './monitor.js'
import * as vscode from 'vscode';
type MonitorNode=Runner|Folder

export class MonitorProvider implements vscode.TreeDataProvider<MonitorNode> {
  root: Folder
  private folderIconPath: vscode.Uri
  private fileIconPath: vscode.Uri
  private context: vscode.ExtensionContext
  private _onDidChangeTreeData: vscode.EventEmitter<MonitorNode | undefined | null | void> = new vscode.EventEmitter<MonitorNode | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<MonitorNode | undefined | null | void> = this._onDidChangeTreeData.event;
  
  constructor( root: Folder, context: vscode.ExtensionContext) {
    this.root=root
    this.context=context
    this.updateIcons()
    
    // Listen for theme changes
    vscode.window.onDidChangeActiveColorTheme(() => {
      this.updateIcons()
      this._onDidChangeTreeData.fire()
    })
  }
  
  private updateIcons() {
    const isDark = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark || 
                   vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.HighContrast
    const themeSuffix = isDark ? 'dark' : 'light'
    
    this.folderIconPath = vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'icons', `folder-${themeSuffix}.svg`)
    this.fileIconPath = vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'icons', `file-${themeSuffix}.svg`)
  }

  getTreeItem(element: MonitorNode): vscode.TreeItem {
    const ans={label:element.name}
    if (element.type==='folder')
      return {...ans,
        collapsibleState:2,
        iconPath:this.folderIconPath,
        description:element.full_pathname
      }
    return {...ans,
      collapsibleState:0,
      iconPath:this.fileIconPath,
      description:element.script      
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
    treeDataProvider: new MonitorProvider(root, context)
  });

  const disposable = vscode.commands.registerCommand('Scriptsmon.start',  () => {
    outputChannel.append('start')
  });
  context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}

