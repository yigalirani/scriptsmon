import { Terminal } from '@xterm/xterm';
interface VSCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}
import {WebviewMessage} from '../../src/extension.js'
declare function acquireVsCodeApi(): VSCodeApi;
const vscode = acquireVsCodeApi();
function start(){
  console.log('start')
  const sendButton = document.getElementById('sendMessage');
  const term_div=document.getElementById('terminal')
  if (term_div==null||sendButton==null){
    console.warn(' div not found')
    return
  }
  const term = new Terminal()
  term.open(term_div);
  term.write('Hello from \x1B[1;3;31mxterm.js\x1B[0m $ ');
  
  sendButton.addEventListener('click', () => {
    term.write('clicked!\n\r')
    vscode.postMessage({
          command: 'buttonClick',
          text: 'Hello from webview!'
      });
  });

  // Listen for messages from the extension
  window.addEventListener('message', (event:MessageEvent<WebviewMessage>) => {
      const message = event.data;
      switch (message.command) {
          case 'updateContent':
              term.write(`${message.text}\n\r`)
              break;
      }
  });
}
start()