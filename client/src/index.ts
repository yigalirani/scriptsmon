interface VSCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}
import {WebviewMessage,RunnerBase,FolderBase,FolderRunner} from '../../src/extension.js'
import {s2t} from '@yigal/base_types'
import { Terminal } from '@xterm/xterm';
import { query_selector,TreeControl,TreeDataProvider,TreeNode } from './tree_control.js';
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

function update_child_html(el: HTMLElement, selector: string, html: string) {
  const child = query_selector(el,selector)
  if (child.innerHTML === html) return; // skip if same
  child.innerHTML = html;
}
/*function append(txt:string,el:HTMLElement|null=null){
  if (el==null||txt==='')
    el=document.getElementById('terminal')
  if (el==null)
    return
  el.insertAdjacentHTML('beforeend', `${txt}\n`);
  el.scrollTop = el.scrollHeight;
}*/
function calc_stats_html(new_runner:RunnerBase){
  return Object.entries(new_runner).filter(([k,v])=>k!=='output').map(([k,v])=>`<tr>
      <td><span class=value>${k} = </span>${v}</td>
    </tr>`).join('\n')
}

/*function calc_new_lines(new_runner:RunnerBase){
  const output=new_runner.output.join('')
  if (output==='')
    return ''
  return convert_line(output)
}*/
class TerminalPanel{
  el:HTMLElement
  term:Terminal
  last_runner:RunnerBase|undefined=undefined
  constructor(
    public parent:HTMLElement,
    id:string//used just for the id
  ){
    this.el=create_terminal_element(parent,id)
    this.term=new Terminal()
    const term_container=query_selector(this.el,'.term')
    this.term.open(term_container);
  }
  update(new_runner:RunnerBase){
    //const term=query_selector(this.el,'.term')
    for (const line of new_runner.output)
      this.term.write(line)
    if (this.last_runner!=null&&JSON.stringify(this.last_runner)===JSON.stringify(new_runner))
      return
    const stats=calc_stats_html(new_runner)
    update_child_html(this.el,'.stats>tbody',stats)
    this.last_runner=new_runner//should we at all hold on to it
  }
}
class Terminals{
  terminals:s2t<TerminalPanel>={}
  constructor(
    public parent:HTMLElement
  ){
  }
  get_terminal(runner:RunnerBase){
    const ans=this.terminals[runner.id] ??= new TerminalPanel(this.parent, runner.id)
    return ans
  }
}


declare function acquireVsCodeApi(): VSCodeApi;

const vscode = acquireVsCodeApi();

function get_terminals(folder:FolderBase,terminals:Terminals){
  for (const runner of folder.runners)
    terminals.get_terminal(runner).update(runner)
  folder.folders.forEach(x=>get_terminals(x,terminals)) //i dont like carring the terminals like this
}
function convert(root:FolderRunner):TreeNode{
  const {type,name,id}=root

  if (root.type==='folder'){
    const folders=root.folders.map(convert)
    const items=root.runners.map(convert)
    const children=[...folders,...items]
    return {children,type:'folder',id,label:name,commands:[],icon:'folder-dark'}
  }
  const {script}=root
  return {type:'item',id,label:name,commands:[],children:[],description:script,icon:'file-dark'}
}
const provider:TreeDataProvider<FolderRunner>={
  convert,
  command(item:FolderRunner,command:string){
     alert(command)
  }
}
function start(){
  console.log('start')
  const terminals=new Terminals(document.body)
  let base_uri=''


  const tree=new TreeControl(query_selector(document.body,'#the_tree'),provider)
  function on_selected_changed(id:string){
    for (const panel of document.querySelectorAll('.term_panel')){
      if (!(panel instanceof HTMLElement))
        continue
      panel.style.display=(panel.id===id)?'flex':'none'
    }
  }
  tree.on_selected_changed=on_selected_changed

  /*sendButton.addEventListener('click', () => {
    //append('buttonClick clicked');
    vscode.postMessage({
          command: 'buttonClick',
          text: 'Hello from webview!'
      });
  });*/
  /*document.getElementById('getReport')!.addEventListener('click', () => {
    //append('getReport clicked')
    const message:WebviewMessage={
          command: 'get_report',
          text: 'Hello from webview!'
      }
    vscode.postMessage(message);
  });  */

  // Listen for messages from the extension
  window.addEventListener('message',  (event:MessageEvent<WebviewMessage>) => {
      const message = event.data;
      switch (message.command) {
          case 'RunnerReport':{
            get_terminals(message.root,terminals)
            base_uri=message.base_uri
            tree.render(message.root,base_uri)
            //const json=JSON.stringify(message.runners,null,2)
            //void navigator.clipboard.writeText(json);
            //append(json)
            break
          }
          case 'set_selected':
            update_child_html(document.body,'#selected', message.selected)
            on_selected_changed(message.selected)
            break
          case 'updateContent':
            //append(message.text||'<no message>')
            break;
      }
  });
}
start()