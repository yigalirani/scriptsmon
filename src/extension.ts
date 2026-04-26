import {Monitor} from './monitor.js'
import type {Folder,RunnerReport} from './data.js'
import * as vscode from 'vscode';
import type {SearchCommandType} from '../client/src/terminal_search.js'
import {
  type WebviewFunc,
  define_webview,
  register_command,
  type CommandOpenFileRowCol,
  type CommandOpenFilePos,
  open_file,
  open_link,
  global_webview
} from './vscode_utils.js'
import type {
  WebviewView,
  ExtensionContext,
}from 'vscode';
export interface WebviewMessageSimple {
  command: "buttonClick"|"updateContent"|"get_report";
  text?: string;
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
export interface CommandOpenLink{
  command: "command_open_link"
  url:string
}
export interface SearchCommand{
  command: "search_command"
  subcommand:SearchCommandType
}
export interface CommandFocus{
  command: "view_focus"
  val:boolean
}

export type WebviewMessage=
  WebviewMessageSimple|
  RunnerReport|
  SetSelected|
  CommandClicked|
  CommandOpenFileRowCol|
  CommandOpenFilePos|
  CommandOpenLink|
  SearchCommand|
  CommandFocus
function post_message(view:vscode.Webview,msg:WebviewMessage){
  view.postMessage(msg)
}
import {to_json} from './parser.js'
//const folders=["c:\\yigal\\scriptsmon"]
//const folders=["c:\\yigal\\scriptsmon","c:\\yigal\\million_try3"]
//let global_view_focus=false
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
        case "view_focus":{
          console.log(`focus changed ${message.val}`)
          void vscode.commands.executeCommand(
            'setContext', 
            'scriptsmon_focused', 
            message.val
          )
          console.log('scriptsmon_focused',message.val)
          //global_view_focus=message.val
          break
        }
        case "command_open_link":{
          void open_link(message.url)
          break;
        }
        case "command_open_file_pos":{
            void open_file(message)
            //const {file,row,col}=message
            break 
          }          
          case 'command_clicked':{
            const {command_name,id:runner_id}=message
            if (command_name==='watched'){
              monitor.toggle_watch_state(runner_id)
              return
            }
           if (command_name==='stop'){
              void monitor.stop_runner({runner_id})
              return
            }            
            void monitor.run_runner({runner_id,full_reason:{reason:'user'}})
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
function async_set_interval(task:()=>Promise<void>,timeout:number){
  let is_executing=false
  function stopped(){
    is_executing=false
  }
  function f(){
    if (is_executing)
      return //still executing, skip this tick
    is_executing=true
    task().then(stopped).catch(stopped)
  }
  setInterval(f,timeout)
}

export  async function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "Scriptsmon" is now active!');
  const outputChannel = vscode.window.createOutputChannel("Scriptsmon");    
  const workspace_folders=function(){ 
    //return [String.raw`c:\yigal\million_try3`]
    const ans= (vscode.workspace.workspaceFolders??[]).map(x=>x.uri.fsPath)
    if (ans.length===0)
//      return ['c:/yigal/myfastifyapp']
      return [String.raw`c:\yigal\scriptsmon`]
      
      return ans
  }() 
  if (workspace_folders==null) 
    return  
  outputChannel.append(to_json({workspace_folders}))
  const monitor=new Monitor(workspace_folders)
  await monitor.start_monitor()
  async_set_interval(monitor.iter,100)
  const the_loop=make_loop_func(monitor)
  define_webview({context,id:"Scriptsmon.webview",html_filename:'index.html',f:the_loop})

  register_command(context,'Scriptsmon.startWatching',()=>{
    monitor.start_watching()
    outputChannel.append('start watching')
  })
  register_command(context,'Scriptsmon.toggleDumpDebug',()=>{
    monitor.toggle_dump_debug()
    outputChannel.append(`dump_debug_enabled=${monitor.dump_debug_enabled}`)
  })
  register_command(context, 'scriptsmon.find', () => {
      post_message(global_webview!,{command: "search_command",subcommand:"find"})
    }
  )  
  register_command(context, 'scriptsmon.findprev', () => {
      post_message(global_webview!,{command: "search_command",subcommand:"findprev"})
    }
  )
  register_command(context, 'scriptsmon.findnext', () => {
      post_message(global_webview!,{command: "search_command",subcommand:"findnext"})
    }
  )
  register_command(context, 'scriptsmon.selectall', () => {
      post_message(global_webview!,{command: "search_command",subcommand:"selectall"})
    }
  )  
  vscode.tasks.onDidEndTaskProcess((event) => {
    outputChannel.append(JSON.stringify(event,null,2))
  })

}


export function deactivate() {
  console.log('deactivate')
}

