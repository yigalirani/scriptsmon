import * as path from 'node:path';
import * as fs from 'node:fs';
import {read_package_json,FolderRunner,type Runner,type Folder,type RunnerBase,runner_base_keys,extract_base,FolderBase} from './monitor.js'
import * as vscode from 'vscode';
import {pk} from '@yigal/base_types'
export {type RunnerBase,runner_base_keys,FolderBase,FolderRunner}
type MonitorNode=Runner|Folder


export interface WebviewMessageSimple {
  command: "buttonClick"|"updateContent"|"get_report";
  text?: string;
}
export interface RunnerReport{
   command: "RunnerReport";
   root:FolderBase
}
export interface SetSelected{
   command: "set_selected";
   selected:string
}
export type WebviewMessage=WebviewMessageSimple|RunnerReport|SetSelected
function post_message(view:vscode.Webview,msg:WebviewMessage){
  view.postMessage(msg)
}



class IconPaths{
  folderIconPath:vscode.Uri|undefined
  fileIconPath:vscode.Uri|undefined
  constructor(
    public context: vscode.ExtensionContext,
    public changed:vscode.EventEmitter<undefined>
  ){
    this.calc_paths()
    vscode.window.onDidChangeActiveColorTheme(() => {
      this.calc_paths()
      this.changed.fire(undefined)
    })
  }
  calc_paths(){
    const isDark = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark || 
                  vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.HighContrast
    const themeSuffix = isDark ? 'dark' : 'light'
    this.folderIconPath=vscode.Uri.joinPath(this.context.extensionUri, 'client','resources', 'icons', `folder-${themeSuffix}.svg`)
    this.fileIconPath = vscode.Uri.joinPath(this.context.extensionUri, 'client','resources', 'icons', `file-${themeSuffix}.svg`)    
  }
}

export class MonitorProvider implements vscode.TreeDataProvider<MonitorNode> {
  root
  paths
  changed = new vscode.EventEmitter<undefined>();
  onDidChangeTreeData = this.changed.event;  

  constructor( root: Folder, context: vscode.ExtensionContext) {
    this.root=root
    this.paths=new IconPaths(context,this.changed)
  }

  getTreeItem(element: MonitorNode): vscode.TreeItem {
    const ans={label:element.name}
    if (element.type==='folder')
      return {...ans,
        collapsibleState:2,
        iconPath:this.paths.folderIconPath,
        description:element.full_pathname
      }
    return {...ans,
      collapsibleState:0,
      iconPath:this.paths.fileIconPath,
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
  html = html.replaceAll('./', base);

  
  return html;
}
function createWebviewPanel(context: vscode.ExtensionContext,root:Folder): vscode.WebviewPanel {
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
  function send_report(root:Folder){
    post_message(panel.webview,{
      command:'RunnerReport',
      root:extract_base(root)
    })
  }  
  // Load content from static file
  panel.webview.html = getWebviewContent(context, panel.webview);
  setInterval(() => {
    send_report(root)
  }, 100);
  // Handle messages from the webview
  panel.webview.onDidReceiveMessage(
    (message: WebviewMessage) => {
      switch (message.command) {
        case 'get_report':
          send_report(root)
          break
        case 'buttonClick':
          counter++
          vscode.window.showInformationMessage(`Received: ${message.text ?? ''}`);
          // Send message back to webview
          post_message(panel.webview,{
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
  //const folders=["c:\\yigal\\million_try3"]
  const folders=["c:\\yigal\\scriptsmon"]
  const root=await  read_package_json(folders)
  const treeView=vscode.window.createTreeView('Scriptsmon.tree', {
    treeDataProvider: new MonitorProvider(root, context)
  })
  context.subscriptions.push(treeView)
  const webview_panel = createWebviewPanel(context,root);
  context.subscriptions.push(webview_panel);
  const focusDisposable=treeView.onDidChangeSelection((event)=>{
    const selected=event.selection?.[0]
    if (!selected || selected.type!=='runner')
      return
    post_message(webview_panel.webview,{command:'set_selected',selected:selected.id})
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

  const playDisposable = vscode.commands.registerCommand('Scriptsmon.runner.play', async (runner: Runner) => {
    if (!runner || runner.type !== 'runner') {
      vscode.window.showErrorMessage('Invalid runner');
      return;
    }
    await runner.start('user')

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


}

// this method is called when your extension is deactivated
export function deactivate() {}

