interface VSCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}
import {WebviewMessage,RunnerBase,FolderBase,FolderRunner,State} from '../../src/extension.js'
import {s2t} from '@yigal/base_types'
import { Terminal } from '@xterm/xterm';
import { query_selector,TreeControl,TreeDataProvider,TreeNode } from './tree_control.js';
import { Folder } from '../../src/monitor.js';
import ICONS_HTML from '../resources/icons.html'

function create_terminal_element(parent: Element,id:string): HTMLElement {
  const ans=parent.querySelector(`#${id}`)
  if (ans!=null)
    return ans as HTMLElement //todo check that it is HTMLElement
  const template = document.createElement("template")
  template.innerHTML = `
<div class="term_panel" id="${id}" style="display: none;">
  <div class=term>
  </div>
  <div class=stats_container>
    <table class=stats>
      <tr><td></td></tr>
    </table>
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
    public parent:Element,
    id:string//used just for the id
  ){
    this.el=create_terminal_element(parent,id)
    this.term=new Terminal()
    const term_container=query_selector(this.el,'.term')
    if (term_container instanceof HTMLElement)
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
    public parent:Element
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
  function f(folder:FolderBase){
    for (const runner of folder.runners)
      terminals.get_terminal(runner).update(runner)
    folder.folders.forEach(f) //i dont like carring the terminals like this
  }
  f(folder)
}
function index_folder(root:FolderBase){
  const ans:s2t<RunnerBase>={}
  function f(folder:FolderBase){
    for (const runner of folder.runners){
      ans[runner.id]=runner
    }
    folder.folders.map(f)
  }
  f(root)
  return ans
}
function calc_changed_ids(root:FolderBase,old_root:FolderBase|undefined){
  const ans=new Set<string>()
  if (old_root==null)
    return ans
  const old_index=index_folder(old_root)
  function f(folder:FolderBase){
    folder.folders.map(f)
    for (const runner of folder.runners){
      const old_version=old_index[runner.id]?.version
      if (runner.version!==old_version)
        ans.add(runner.id)
    }
  }  
  f(root)
  return ans
}
function convert(root:FolderRunner,old_root:FolderRunner|undefined):TreeNode{
  
  if (root.type==="runner"||old_root?.type==="runner")
    throw new Error("convret got wront type")
  const changed_ids=calc_changed_ids(root,old_root)
  function f(node:FolderBase):TreeNode{
    const {name,id}=node
    const folders=node.folders.map(f)
    const items:TreeNode[]=node.runners.map(runner=>{
      const {script,state,id,name}=runner
      const start_animation=changed_ids.has(id)
      const ans:TreeNode= {type:'item',id,label:name,commands:['play','debug'],children:[],description:script,icon:state,start_animation}        
      return ans
    })
    const children=[...folders,...items]
    const ans:TreeNode={children,type:'folder',id,label:name,commands:[],icon:'folder-dark',start_animation:false}
    return ans
  }
  return f(root)
}
function post_message(msg:WebviewMessage){
  vscode.postMessage(msg)
}

const provider:TreeDataProvider<FolderRunner>={
  convert,
  command(id:string,command_name:string){
     post_message({
      command: "command_clicked",
      id,
      command_name
     })
  },
  icons_html:ICONS_HTML
}
function reset_animation(ids:Set<string>){
  function collect_elements(parent: HTMLElement, ids: Set<string>): HTMLElement[] {
    // Select all elements under parent that have an id
    const allWithId = parent.querySelectorAll<HTMLElement>('[id]');
    for (const el of allWithId)
      if (ids.has(el.id)){
        //query_selector(el,'.icon') instanceof ImageEl
      }
    // Filter only the ones whose id is in the set
    return Array.from(allWithId).filter(el => ids.has(el.id));
}
  //firs
}

function start(){
  console.log('start')
  const terminals=new Terminals(query_selector(document.body,'.terms_container'))
  let base_uri=''
  const tree=new TreeControl(query_selector(document.body,'#the_tree') as HTMLElement,provider)
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
  //let old_root:FolderBase|undefined
  window.addEventListener('message',  (event:MessageEvent<WebviewMessage>) => {
      const message = event.data;
      switch (message.command) {
          case 'RunnerReport':{
            get_terminals(message.root,terminals)
            base_uri=message.base_uri
            tree.render(message.root,base_uri)
            break
          }
          case 'set_selected':
            //update_child_html(document.body,'#selected', message.selected)
            on_selected_changed(message.selected)
            break
          case 'updateContent':
            //append(message.text||'<no message>')
            break;
      }
  });
}
start()