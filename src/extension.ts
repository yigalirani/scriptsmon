import * as path from 'node:path';
import * as fs from 'node:fs';
import {Monitor} from './monitor.js'
import {FolderRunner,type Runner,type Folder, type State} from './data.js'
import * as vscode from 'vscode';
import {pk} from '@yigal/base_types'
import {type WebviewFunc,getWebviewContent,define_webview,register_command} from './vscode_utils.js'
import {
  WebviewView,
  ExtensionContext,
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
export interface CommandLineClicked2{
   command: "command_link_clicked2"
   full_pathname:string,
   file:string
   start:number
   end:number
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
export async function open_file2(pos: CommandLineClicked2): Promise<void> {
    try {
        //const uri = vscode.Uri.file(pos.file);
        const file=path.join(pos.full_pathname,pos.file)
        const document = await vscode.workspace.openTextDocument(file);
        const editor = await vscode.window.showTextDocument(document, {
            preview: false,
            preserveFocus:true
        });
        const selection = new vscode.Selection(document.positionAt(pos.start),document.positionAt(pos.end))
        editor.selection = selection
        editor.revealRange(selection,
            vscode.TextEditorRevealType.InCenter
        );
    } catch (err) {
        vscode.window.showErrorMessage(
            `Failed to open file: ${pos.file}`
        );
    }
}
export type WebviewMessage=WebviewMessageSimple|RunnerReport|SetSelected|CommandClicked|CommandLineClicked|CommandLineClicked2
function post_message(view:vscode.Webview,msg:WebviewMessage){
  view.postMessage(msg)
}

//const folders=["c:\\yigal\\scriptsmon"]
//const folders=["c:\\yigal\\scriptsmon","c:\\yigal\\million_try3"]

function make_loop_func(monitor:Monitor){
  const ans:WebviewFunc=(view:WebviewView,context:ExtensionContext)=>{
    function send_report(root_folder:Folder){
      const root=monitor.extract_base()
      post_message(view.webview,{
        command:'RunnerReport',
        root,
        base_uri: view.webview.asWebviewUri(context.extensionUri).toString()
      })
    }
    setInterval(() => {
      send_report(monitor.get_root())
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
        case "command_link_clicked2":{
            void open_file2(message)
            //const {file,row,col}=message
            break 
          }          
          case 'command_clicked':{
            void monitor.run_runner(message.id,'user')
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
  //const folders:string[] = (vscode.workspace.workspaceFolders||[]).map(x=>x.uri.fsPath)
  const folders:string[] =["c:\\yigal\\million_try3"]
  if (folders==null)
    return  
  const monitor=new Monitor(folders)
  await monitor.read_package_json()
  const the_loop=make_loop_func(monitor)
  define_webview({context,id:"Scriptsmon.webview",html:'client/resources/index.html',f:the_loop})
  const outputChannel = vscode.window.createOutputChannel("Scriptsmon");  
  register_command(context,'Scriptsmon.startWatching',()=>{
    monitor.start_watching()
    outputChannel.append('start watching')
  })
  vscode.tasks.onDidEndTaskProcess((event) => {
    outputChannel.append(JSON.stringify(event,null,2))
  })

}

// this method is called when your extension is deactivated
export function deactivate() {}

