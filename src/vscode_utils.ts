import * as path from 'node:path';
import * as fs from 'node:fs';
import * as vscode from 'vscode';
import {
  type WebviewView,
  type Webview,
  type ExtensionContext,
  Uri,
  type WebviewViewProvider,
  type WebviewViewResolveContext,
  window,
  commands
}from 'vscode';
export interface Pos{
  source_file:string
  start?:number
  end?:number
}
export interface CommandOpenFileRowCol{
   command: "command_open_file_rowcol"
   source_file:string,
   row:number
   col:number
}
export interface CommandOpenFilePos{
   command: "command_open_file_pos"
   pos:Pos
}
import {get_error} from '@yigal/base_types'
export function get_webview_content(context:ExtensionContext, webview:Webview,html_filename:string): string {
  const htmlPath = path.join(context.extensionPath, 'client','resources', html_filename);
  let html = fs.readFileSync(htmlPath, 'utf-8');
  
  // Get URIs for CSS and JS files
  const uri=webview.asWebviewUri(
    Uri.joinPath(context.extensionUri,'client','resources')
  ).toString()
  const base = `${uri}/`

  
  // Replace placeholders with actual URIs
  html = html.replaceAll('./', base);

  
  return html;
}
export type WebviewFunc=(webview:WebviewView,context:ExtensionContext)=>Promise<void>|void

export function define_webview({context,id,html_filename,f}:{
  context: ExtensionContext,
  id:string,
  html_filename:string,
  f?:WebviewFunc}
){
  console.log('define_webview')
  const provider:WebviewViewProvider={
    resolveWebviewView(webviewView: WebviewView,_webview_context:WebviewViewResolveContext) {
      console.log('resolveWebviewView')
      webviewView.webview.options = {
      enableScripts: true,
        localResourceRoots: [
          Uri.file(path.join(context.extensionPath, "client/resources"))
        ]
      }
      webviewView.webview.html = get_webview_content(context, webviewView.webview,html_filename)
      if (f)
        void f(webviewView,context) //fire and forget
    }
  }
  const reg=window.registerWebviewViewProvider(
      id,
      provider,
      {
        webviewOptions: {
            retainContextWhenHidden: true
        }
      }     
    )
  const ans=context.subscriptions.push(reg)
  console.log(ans) 
}

export function register_command(context: ExtensionContext,command:string,commandHandler:()=>void){
  context.subscriptions.push(commands.registerCommand(command, commandHandler));
}

/*function calc_filename({workspace_folder,source_file}:{
  workspace_folder?:string
  source_file:string
}
){
  if (workspace_folder==null)
    return source_file
  return path.join(workspace_folder,source_file)
}*/
export async function open_file_row_col(pos: CommandOpenFileRowCol): Promise<void> {
    try {
        //const uri = vscode.Uri.file(pos.file);
        const {source_file}=pos
        const document = await vscode.workspace.openTextDocument(source_file);
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
    } catch (ex) {
        vscode.window.showErrorMessage(
            `Failed to open file: ${pos.source_file} ${get_error(ex).message}`
        );
    }
}
async function open_file_start_end(pos: Pos): Promise<void> {
    try {
        //const uri = vscode.Uri.file(pos.file);
        const {source_file}=pos
        const document = await vscode.workspace.openTextDocument(source_file);
        const editor = await vscode.window.showTextDocument(document, {
            preview: false,
            preserveFocus:true
        });
        if (pos.start==null)
          return
        const selection = new vscode.Selection(document.positionAt(pos.start),document.positionAt(pos.end??pos.start))
        editor.selection = selection
        editor.revealRange(selection,
            vscode.TextEditorRevealType.InCenter
        );
    } catch (ex) {
        vscode.window.showErrorMessage(
            `Failed to open file: ${pos.source_file} ${get_error(ex)}.message`
        );
    }
}

export async function open_file(pos:CommandOpenFileRowCol|CommandOpenFilePos){
  if (pos.command==='command_open_file_rowcol'){
    await open_file_row_col(pos)
  }else
    await open_file_start_end(pos.pos)
}

