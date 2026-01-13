import {Monitor,type RunnerReport} from './monitor.js'
import type {Folder} from './data.js'
import * as vscode from 'vscode';
import {
  type WebviewFunc,
  define_webview,
  register_command,
  type CommandOpenFileRowCol,
  type CommandOpenFilePos,
  open_file
} from './vscode_utils.js'
import type {
  WebviewView,
  ExtensionContext,
}from 'vscode';
export interface WebviewMessageSimple {
  command: "buttonClick"|"updateContent"|"get_report";
  text?: string;
}

export interface SetSelectedCommand{
   command: "set_selected_command"
   selected:string
}
export interface CommandClicked{
   command: "command_clicked"
   id:string
   command_name:string
}

export type WebviewMessage=WebviewMessageSimple|RunnerReport|SetSelectedCommand|CommandClicked|CommandOpenFileRowCol|CommandOpenFilePos
function post_message(view:vscode.Webview,msg:WebviewMessage){
  view.postMessage(msg)
}
import {to_json} from './parser.js'
//const folders=["c:\\yigal\\scriptsmon"]
//const folders=["c:\\yigal\\scriptsmon","c:\\yigal\\million_try3"]

function make_loop_func(monitor:Monitor){
  const ans:WebviewFunc=(view:WebviewView,context:ExtensionContext)=>{
    function send_report(_root_folder:Folder){
      const report=monitor.extract_report(view.webview.asWebviewUri(context.extensionUri).toString())
      post_message(view.webview,report)
    }
    setInterval(() => {
      send_report(monitor.get_root())
    }, 100);
    // Handle messages from the webview
    view.webview.onDidReceiveMessage(
      (message: WebviewMessage) => {
        switch (message.command) {
        case "command_open_file_rowcol":{
            void open_file(message)
            //const {file,row,col}=message
            break 
          }
        case "command_open_file_pos":{
            void open_file(message)
            //const {file,row,col}=message
            break 
          }          
          case 'command_clicked':{
            void monitor.run_runner({runner_id:message.id,reason:'user'})
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
  const outputChannel = vscode.window.createOutputChannel("Scriptsmon");    
  const workspace_folders=function(){
    const ans= (vscode.workspace.workspaceFolders||[]).map(x=>x.uri.fsPath)
    if (ans.length===0)
//      return ['c:/yigal/myfastifyapp']
      return [String.raw`c:\yigal\scriptsmon`]
      //return ['c:/yigal/million_try3']
      return ans
  }()
  if (workspace_folders==null) 
    return  
  outputChannel.append(to_json({workspace_folders}))
  const monitor=new Monitor(workspace_folders)
  await monitor.run() 
  const the_loop=make_loop_func(monitor)
  define_webview({context,id:"Scriptsmon.terminals",html_filename:'terminals_view.html',f:the_loop})
  define_webview({context,id:"Scriptsmon.treeview",html_filename:'tree_view.html',f:the_loop})

  register_command(context,'Scriptsmon.startWatching',()=>{
    monitor.start_watching()
    outputChannel.append('start watching')
  })
  vscode.tasks.onDidEndTaskProcess((event) => {
    outputChannel.append(JSON.stringify(event,null,2))
  })

}


export function deactivate() {
  console.log('deactivate')
}

