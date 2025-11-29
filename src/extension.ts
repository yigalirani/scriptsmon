import * as path from 'node:path';
import * as fs from 'node:fs';
import {read_package_json,type Runner,type Folder} from './monitor.js'
import * as vscode from 'vscode';
type MonitorNode=Runner|Folder

interface WebviewMessage {
  command: string;
  text?: string;
}

export class MonitorProvider implements vscode.TreeDataProvider<MonitorNode> {
  root: Folder
  private folderIconPath!: vscode.Uri
  private fileIconPath!: vscode.Uri
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
    
    this.folderIconPath = vscode.Uri.joinPath(this.context.extensionUri, 'client','resources', 'icons', `folder-${themeSuffix}.svg`)
    this.fileIconPath = vscode.Uri.joinPath(this.context.extensionUri, 'client','resources', 'icons', `file-${themeSuffix}.svg`)
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
      description:element.script,
      contextValue:'runner'
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

function getWebviewContent(context: vscode.ExtensionContext, webview: vscode.Webview): string {
  const htmlPath = path.join(context.extensionPath, 'client','resources', 'index.html');
  let html = fs.readFileSync(htmlPath, 'utf-8');
  
  // Get URIs for CSS and JS files
  const base = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri,'client','resources')
  ).toString()+'/'

  
  // Replace placeholders with actual URIs
  html = html.replace('./', base);

  
  return html;
}

function createWebviewPanel(context: vscode.ExtensionContext): vscode.WebviewPanel {
  let counter=0
  const panel = vscode.window.createWebviewPanel(
    'scriptsmonWebview',
    'Scriptsmon Webview',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true
    }
  );

  // Load content from static file
  panel.webview.html = getWebviewContent(context, panel.webview);

  // Handle messages from the webview
  panel.webview.onDidReceiveMessage(
    (message: WebviewMessage) => {
      switch (message.command) {
        case 'buttonClick':
          counter++
          vscode.window.showInformationMessage(`Received: ${message.text ?? ''}`);
          // Send message back to webview
          panel.webview.postMessage({
            command: 'updateContent',
            text: `Extension received: ${message.text ?? ''},extension counter=${counter}`
          });
          break;
      }
    },
    undefined,
    context.subscriptions
  );

  return panel;
}

export async function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "Scriptsmon" is now active!');
  const outputChannel = vscode.window.createOutputChannel("Scriptsmon");  
  vscode.tasks.onDidEndTaskProcess((event) => {
    outputChannel.append(JSON.stringify(event,null,2))
  })
  const {workspaceFolders: _workspaceFolders}= vscode.workspace
  //const folders=(workspaceFolders||[]).map(x=>x.uri.fsPath)
  const folders=["c:\\yigal\\million_try3"]
  const root=await  read_package_json(folders)
  const treeView=vscode.window.createTreeView('Scriptsmon.tree', {
    treeDataProvider: new MonitorProvider(root, context)
  })
  context.subscriptions.push(treeView)

  const focusDisposable=treeView.onDidChangeSelection((event)=>{
    const selected=event.selection?.[0]
    if (!selected || selected.type!=='runner')
      return
    const terminalName=`${selected.full_pathname} ${selected.name}`
    const terminal=vscode.window.terminals.find(t=>t.name===terminalName)
    if (terminal)
      terminal.show()
  })
  context.subscriptions.push(focusDisposable)

  const disposable = vscode.commands.registerCommand('Scriptsmon.start',  () => {
    outputChannel.append('start')
  });
  context.subscriptions.push(disposable);

  const playDisposable = vscode.commands.registerCommand('Scriptsmon.runner.play', (runner: Runner) => {
    if (!runner || runner.type !== 'runner') {
      vscode.window.showErrorMessage('Invalid runner');
      return;
    }

    const terminalName = `${runner.full_pathname} ${runner.name}`;

    // Reuse existing terminal for this runner if it exists, otherwise create a new one
    let terminal = vscode.window.terminals.find(t => t.name === terminalName);
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

  const debugDisposable = vscode.commands.registerCommand('Scriptsmon.runner.debug', (runner: Runner) => {
    if (!runner || runner.type !== 'runner') {
      vscode.window.showErrorMessage('Invalid runner');
      return;
    }

    const terminalName = `${runner.full_pathname} ${runner.name} (debug)`;

    let terminal = vscode.window.terminals.find(t => t.name === terminalName);
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

  const webviewDisposable = vscode.commands.registerCommand('Scriptsmon.webview.open', () => {
    const panel = createWebviewPanel(context);
    context.subscriptions.push(panel);
  });
  context.subscriptions.push(webviewDisposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}

