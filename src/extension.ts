import * as path from 'node:path';
import * as fs from 'node:fs';
import {read_package_json,FolderRunner,type Runner,type Folder,type RunnerBase,runner_base_keys,extract_base,FolderBase} from './monitor.js'
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
export {type RunnerBase,runner_base_keys,FolderBase,FolderRunner}
type MonitorNode=Runner|Folder


export interface WebviewMessageSimple {
  command: "buttonClick"|"updateContent"|"get_report";
  text?: string;
}
export interface RunnerReport{
   command: "RunnerReport";
   root:FolderBase
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
export type WebviewMessage=WebviewMessageSimple|RunnerReport|SetSelected|CommandClicked
function post_message(view:vscode.Webview,msg:WebviewMessage){
  view.postMessage(msg)
}
function find_runner(root:Folder,id:string){
  function f(folder:Folder):Runner|undefined{
    const ans=folder.runners.find(x=>x.id=id)
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

const the_loop:WebviewFunc=async function(view:WebviewView,context:ExtensionContext){
  const root=await  read_package_json(folders)
  function send_report(root:Folder){
    post_message(view.webview,{
      command:'RunnerReport',
      root:extract_base(root),
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
        case 'command_clicked':{
          send_report(root)
          const runner=find_runner(root,message.id)
          if (runner)
            void runner.start('user')
          break          
        }
      }
    },
    undefined,
    context.subscriptions
  );
}


export  function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "Scriptsmon" is now active!');
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

