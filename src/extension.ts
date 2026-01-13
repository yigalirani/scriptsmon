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
function post_message(view:vscode.Webview|undefined,msg:WebviewMessage){
  if (view!==null)//todo: issue warnings that not initialized?
    view.postMessage(msg)
}
import {to_json} from './parser.js'
//const folders=["c:\\yigal\\scriptsmon"]
//const folders=["c:\\yigal\\scriptsmon","c:\\yigal\\million_try3"]
class Scriptsmon{
  terminals_view?: vscode.WebviewView
  tree_view?: vscode.WebviewView
  outputChannel = vscode.window.createOutputChannel("Scriptsmon");    
  workspace_folders=function(){
    const ans= (vscode.workspace.workspaceFolders||[]).map(x=>x.uri.fsPath)
    if (ans.length===0)
//      return ['c:/yigal/myfastifyapp']
      return [String.raw`c:\yigal\scriptsmon`]
      //return ['c:/yigal/million_try3']
    return ans
  }()    
  monitor=new Monitor(this.workspace_folders)     

  constructor(){
    console.log('Congratulations, your extension "Scriptsmon" is now active!');
    const {workspace_folders}=this
    this.outputChannel.append(to_json({workspace_folders}))
    if (workspace_folders==null) 
      return   
  }
  send_report(){
    const report=this.monitor.extract_report(view.webview.asWebviewUri(context.extensionUri).toString())
    post_message(this.terminals_view.webview,report)
  }
  send_report_loop(){
      setInterval(() => {
        send_report(monitor.get_root())
      }, 100);
      // Handle messages from the webview    
  }

  make_loop_func(isTerminalsView: boolean){
    const ans:WebviewFunc=(view:WebviewView,context:ExtensionContext)=>{
      // Store reference to terminals webview
      if (isTerminalsView)
        this.terminals_view = view;
      else
        this.tree_view = view;
      

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
            case 'set_selected_command':{
              // Forward SetSelectedCommand from tree view to terminals view
              void vscode.commands.executeCommand('Scriptsmon.terminals.focus', {
                preserveFocus: true
              });
              if (this.terminals_view)
                post_message(this.terminals_view.webview, message);
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

  await monitor.run() 
  const terminals_loop=make_loop_func(monitor, true)
  const tree_loop=make_loop_func(monitor, false)
  define_webview({context,id:"Scriptsmon.terminals",html_filename:'terminals_view.html',f:terminals_loop})
  define_webview({context,id:"Scriptsmon.treeview",html_filename:'tree_view.html',f:tree_loop})

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

