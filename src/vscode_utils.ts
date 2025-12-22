import * as path from 'node:path';
import * as fs from 'node:fs';
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