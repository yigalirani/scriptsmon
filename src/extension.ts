import * as path from 'node:path';
import * as fs from 'node:fs';
import {read_package_json,extract_base,run_runner,make_runner_ctrl} from './monitor.js'
import {FolderRunner,type Runner,type Folder, type State} from './data.js'
import * as vscode from 'vscode';
import {pk} from '@yigal/base_types'
import {type WebviewFunc,getWebviewContent,define_webview} from './vscode_utils.js'
import {
  WebviewView,
  Webview,
  ExtensionContext,
  Uri,
  WebviewViewProvider,
  WebviewViewResolveContext,
  window
}from 'vscode';
export interface WebviewMessageSimple {
  command: "buttonClick"|"updateContent"|"get_report";
  text?: string;
}
export interface RunnerReport{
   command: "RunnerReport";
   root:Folder,
   base_uri:string
}
export interface SetSelected{
   command: "set_selected"
   selected:string
}
export interface CommandClicked{
   command: "command_clicked"
   id:string
   command_name:string
}
export interface CommandLineClicked{
   command: "command_link_clicked"
   full_pathname:string,
   file:string
   row:number
   col:number
}
export async function open_file(pos: CommandLineClicked): Promise<void> {
    try {
        //const uri = vscode.Uri.file(pos.file);
        const file=path.join(pos.full_pathname,pos.file)
        const document = await vscode.workspace.openTextDocument(file);
        const editor = await vscode.window.showTextDocument(document, {
            preview: false
        });

        // VS Code positions arpae 0-based
        const position = new vscode.Position(
            Math.max(0, pos.row - 1),
            Math.max(0, pos.col - 1)
        );

        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(
            new vscode.Range(position, position),
            vscode.TextEditorRevealType.InCenter
        );
    } catch (err) {
        vscode.window.showErrorMessage(
            `Failed to open file: ${pos.file}`
        );
    }
}
export type WebviewMessage=WebviewMessageSimple|RunnerReport|SetSelected|CommandClicked|CommandLineClicked
function post_message(view:vscode.Webview,msg:WebviewMessage){
  view.postMessage(msg)
}
function find_runner(root:Folder,id:string){
  function f(folder:Folder):Runner|undefined{
    const ans=folder.runners.find(x=>x.id===id)
    if (ans!=null)
      return ans
    for (const subfolder of folder.folders){
      const ans=f(subfolder)
      if (ans!=null)
        return ans
    }
  }
  return f(root)
}
const folders=["c:\\yigal\\scriptsmon","c:\\yigal\\million_try3"]

function make_loop_func(root:Folder){
  const ans:WebviewFunc=(view:WebviewView,context:ExtensionContext)=>{
    const runner_ctrl=make_runner_ctrl()
    function send_report(root_folder:Folder){
      const root=extract_base(root_folder)
      post_message(view.webview,{
        command:'RunnerReport',
        root,
        base_uri: view.webview.asWebviewUri(context.extensionUri).toString()
      })
    }
    setInterval(() => {
      send_report(root)
    }, 100);
    // Handle messages from the webview
    view.webview.onDidReceiveMessage(
      (message: WebviewMessage) => {
        switch (message.command) {
        case "command_link_clicked":{
            void open_file(message)
            //const {file,row,col}=message
            break 
          }
          case 'command_clicked':{
            ///send_report(root)
            const runner=find_runner(root,message.id)
            if (runner==null)
              throw new Error(`runner not found:${message.id}`) //or maybe just ignore it?
            void run_runner({runner,runner_ctrl,reason:'user'})
            break          
          }
        }
      },
      undefined,
      context.subscriptions
    );
  }
  return ans
}


export  async function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "Scriptsmon" is now active!');
  const root=await  read_package_json(folders)
  const the_loop=make_loop_func(root)
  define_webview({context,id:"Scriptsmon.webview",html:'client/resources/index.html',f:the_loop})
  const outputChannel = vscode.window.createOutputChannel("Scriptsmon");  
  vscode.tasks.onDidEndTaskProcess((event) => {
    outputChannel.append(JSON.stringify(event,null,2))
  })
  //const {workspaceFolders: _workspaceFolders}= vscode.workspace
  //const folders=(workspaceFolders||[]).map(x=>x.uri.fsPath)
}

// this method is called when your extension is deactivated
export function deactivate() {}

