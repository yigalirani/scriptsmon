import {Monitor} from './monitor.js'
import type {Folder} from './data.js'
import * as vscode from 'vscode';
import {
  type WebviewFunc,
  define_webview,
  register_command,
  type CommandOpenFileRowCol,
  type CommandOpenFileStartEnd,
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

export type WebviewMessage=WebviewMessageSimple|RunnerReport|SetSelected|CommandClicked|CommandOpenFileRowCol|CommandOpenFileStartEnd
function post_message(view:vscode.Webview,msg:WebviewMessage){
  view.postMessage(msg)
}

//const folders=["c:\\yigal\\scriptsmon"]
//const folders=["c:\\yigal\\scriptsmon","c:\\yigal\\million_try3"]

function make_loop_func(monitor:Monitor){
  const ans:WebviewFunc=(view:WebviewView,context:ExtensionContext)=>{
    function send_report(_root_folder:Folder){
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
        case "command_open_file_rowcol":{
            void open_file(message)
            //const {file,row,col}=message
            break 
          }
        case "command_open_file_start_end":{
            void open_file(message)
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
  const workspace_folders=function(){
    const ans= (vscode.workspace.workspaceFolders||[]).map(x=>x.uri.fsPath)
    if (ans.length===0)
      return [String.raw`c:/yigal/scriptsmon`]
    return ans
  }()
  if (workspace_folders==null) 
    return  
  const monitor=new Monitor(workspace_folders)
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


export function deactivate() {
  console.log('deactivate')
}

