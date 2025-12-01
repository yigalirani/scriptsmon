
interface VSCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}
import {WebviewMessage,RunnerBase} from '../../src/extension.js'
import {s2t} from '@yigal/base_types'
function create_terminal_element(parent: HTMLElement,id:string): HTMLElement {
  const template = document.createElement("template")

  template.innerHTML = `
    <div id="${id}" style="display:none" class="Terminal">
      <div>
      </div>
        <pre></pre> 
        </div>
      </div>
    </div>
  `.trim();

  const element = template.content.firstElementChild as HTMLElement;

  parent.appendChild(element);
  return element;
}
class Terminal{
  el:HTMLElement
  constructor(
    public parent:HTMLElement,
    public runner:RunnerBase,
  ){
    this.el=create_terminal_element(parent,runner.id)
  }
  update(new_runner:RunnerBase){
  }
}
class Terminals{
  terminals:s2t<Terminal>={}
  constructor(
    public parent:HTMLElement
  ){
  }
  get_terminal(runner:RunnerBase){
    const ans=this.terminals[runner.id] ??= new Terminal(this.parent, runner)
    return ans
  }
}


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
  window.addEventListener('message',  (event:MessageEvent<WebviewMessage>) => {
      const message = event.data;
      switch (message.command) {
          case 'RunnerReport':{
            const json=JSON.stringify(message.runners,null,2)
            void navigator.clipboard.writeText(json);
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