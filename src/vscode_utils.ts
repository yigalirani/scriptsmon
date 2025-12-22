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
export interface CommandOpenFileRowCol{
   command: "command_open_file_rowcol"
   full_pathname:string,
   file?:string
   row:number
   col:number
}
export interface CommandOpenFileStartEnd{
   command: "command_open_file_start_end"
   full_pathname:string,
   file?:string
   start:number
   end:number
}
export function getWebviewContent(context:ExtensionContext, webview:Webview): string {
  const htmlPath = path.join(context.extensionPath, 'client','resources', 'index.html');
  let html = fs.readFileSync(htmlPath, 'utf-8');
  
  // Get URIs for CSS and JS files
  const base = `${webview.asWebviewUri(
    Uri.joinPath(context.extensionUri,'client','resources')
  )}/`

  
  // Replace placeholders with actual URIs
  html = html.replaceAll('./', base);

  
  return html;
}
export type WebviewFunc=(webview:WebviewView,context:ExtensionContext)=>Promise<void>|void

export function define_webview({context,id,html,f}:{
  context: ExtensionContext,
  id:string,
  html:string,
  f?:WebviewFunc}
){
  console.log('define_webview')
  const provider:WebviewViewProvider={
    resolveWebviewView(webviewView: WebviewView,webview_context:WebviewViewResolveContext) {
      console.log('resolveWebviewView')
      webviewView.webview.options = {
      enableScripts: true,
        localResourceRoots: [
          Uri.file(path.join(context.extensionPath, "client/resources"))
        ]
      }
      webviewView.webview.html = getWebviewContent(context, webviewView.webview)
      if (f)
        void f(webviewView,context) //fire and forget
    }
  }
  const reg=window.registerWebviewViewProvider(
      id,
      provider
    )
  const ans=context.subscriptions.push(reg)
  console.log(ans)
}

export function register_command(context: ExtensionContext,command:string,commandHandler:()=>void){
  context.subscriptions.push(commands.registerCommand(command, commandHandler));
}

function calc_filename(full_pathname:string,file?:string){
  if (file==null)
    return full_pathname
  return path.join(full_pathname,file)
}
export async function open_file_row_col(pos: CommandOpenFileRowCol): Promise<void> {
    try {
        //const uri = vscode.Uri.file(pos.file);
        const file=calc_filename(pos.full_pathname,pos.file)
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
    } catch (_err) {
        vscode.window.showErrorMessage(
            `Failed to open file: ${pos.file}`
        );
    }
}
async function open_file_start_end(pos: CommandOpenFileStartEnd): Promise<void> {
    try {
        //const uri = vscode.Uri.file(pos.file);
        const file=calc_filename(pos.full_pathname,pos.file)
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
    } catch (_err) {
        vscode.window.showErrorMessage(
            `Failed to open file: ${pos.file}`
        );
    }
}

export async function open_file(pos:CommandOpenFileRowCol|CommandOpenFileStartEnd){
  if (pos.command==='command_open_file_rowcol')
    await open_file_row_col(pos)
  else
    await open_file_start_end(pos)
}