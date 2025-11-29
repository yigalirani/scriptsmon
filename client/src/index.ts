
interface VSCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}
import {WebviewMessage} from '../../src/extension.js'
declare function acquireVsCodeApi(): VSCodeApi;
const vscode = acquireVsCodeApi();
function append(txt:string){
  const term_div=document.getElementById('terminal')
  if (term_div==null)
    return
  term_div.insertAdjacentHTML('beforeend', `${txt}\n`);
  term_div.scrollTop = term_div.scrollHeight;
}
function start(){
  console.log('start')
  const sendButton = document.getElementById('sendMessage');

  if (sendButton==null){
    console.warn(' div not found')
    return
  }

  sendButton.addEventListener('click', () => {
    append('buttonClick clicked');
    vscode.postMessage({
          command: 'buttonClick',
          text: 'Hello from webview!'
      });
  });
  document.getElementById('getReport')!.addEventListener('click', () => {
    append('getReport clicked')
    const message:WebviewMessage={
          command: 'get_report',
          text: 'Hello from webview!'
      }
    vscode.postMessage(message);
  });  

  // Listen for messages from the extension
  window.addEventListener('message', (event:MessageEvent<WebviewMessage>) => {
      const message = event.data;
      switch (message.command) {
          case 'RunnerReport':{
            const json=JSON.stringify(message.runners,null,2)
            append(json)
            break
          }
          case 'updateContent':
            append(message.text||'<no message>')
            break;
      }
  });
}
start()