import ansiHTML from 'ansi-html';
import { AnsiUp } from 'ansi_up'
const ansi_up = new AnsiUp();
interface VSCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}
import {WebviewMessage,RunnerBase,type Mystring} from '../../src/extension.js'
import {s2t} from '@yigal/base_types'
function create_terminal_element(parent: HTMLElement,id:string): HTMLElement {
  const ans=parent.querySelector(`#${id}`)
  if (ans!=null)
    return ans as HTMLElement //todo check that it is HTMLElement
  const template = document.createElement("template")
  template.innerHTML = `
<div class="term_panel" id="${id}" style="display: none;">
  <table class=stats>
    <tr><td></td></tr>
  </table>
  <div class=term>
  </div>
</div>
  `.trim();
  const element = template.content.firstElementChild as HTMLElement;
  parent.appendChild(element);
  return element;
}
function query_selector(el:HTMLElement,selector:string){
    const ans=el.querySelector(selector);
    if (ans==null ||  !(ans instanceof HTMLElement))
      throw new Error('selector not found or not html element')  
    return ans
}
function update_child_html(el: HTMLElement, selector: string, html: string) {
  const child = query_selector(el,selector)
  if (child.innerHTML === html) return; // skip if same
  child.innerHTML = html;
}
function append(txt:string,el:HTMLElement|null=null){
  if (el==null||txt==='')
    el=document.getElementById('terminal')
  if (el==null)
    return
  el.insertAdjacentHTML('beforeend', `${txt}\n`);
  el.scrollTop = el.scrollHeight;
}
function calc_stats_html(new_runner:RunnerBase){
  return Object.entries(new_runner).filter(([k,v])=>k!=='output').map(([k,v])=>`<tr>
      <td><span class=value>${k} = </span>${v}</td>
    </tr>`).join('\n')
}
function convert_line(line:string){
  //const ansi=ansiHTML(line.data)
  const ans= ansi_up.ansi_to_html(line)
  return ans
  //return `<div class=${line}>${ansi}</div>`
}
function calc_new_lines(new_runner:RunnerBase){
  const output=new_runner.output.join('')
  if (output==='')
    return ''
  return convert_line(output)
}
class Terminal{
  el:HTMLElement
  constructor(
    public parent:HTMLElement,
    public runner:RunnerBase,
  ){
    this.el=create_terminal_element(parent,runner.id)
    this.update(runner,true) //fixed bug by commenting this out or maybe not!!
  }
  update(new_runner:RunnerBase,force=false){
    const term=query_selector(this.el,'.term')
    const new_lines=calc_new_lines(new_runner)
    if (new_lines!=='')
      append(new_lines,term)
    if (!force&&JSON.stringify(this.runner)===JSON.stringify(new_runner))
      return
    const stats=calc_stats_html(new_runner)
    update_child_html(this.el,'.stats>tbody',stats)
    this.runner=new_runner//should we at all hold on to it
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


function start(){
  console.log('start')
  const sendButton = document.getElementById('sendMessage');
  const terminals=new Terminals(document.body)
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
            for (const runner of message.runners)
              terminals.get_terminal(runner).update(runner)
            //const json=JSON.stringify(message.runners,null,2)
            //void navigator.clipboard.writeText(json);
            //append(json)
            break
          }
          case 'set_selected':
            update_child_html(document.body,'#selected', message.selected)
            for (const panel of document.querySelectorAll('.term_panel')){
              if (!(panel instanceof HTMLElement))
                continue
              panel.style.display=(panel.id===message.selected)?'flex':'none'
            }
            break
          case 'updateContent':
            append(message.text||'<no message>')
            break;
      }
  });
}
start()