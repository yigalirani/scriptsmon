interface VSCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}
import {WebviewMessage} from '../../src/extension.js'
import {s2t} from '@yigal/base_types'
import { Terminal } from '@xterm/xterm';
import { query_selector,TreeControl,TreeDataProvider,TreeNode } from './tree_control.js';
import { Folder,Runner,FolderRunner,State } from '../../src/data.js';
import ICONS_HTML from '../resources/icons.html'


function formatElapsedTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const milliseconds = ms % 1000;

  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);

  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);

  const pad2 = (n: number) => n.toString().padStart(2, '0');
  const pad3 = (n: number) => n.toString().padStart(3, '0');

  const time =
    hours > 0
      ? `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`
      : `${pad2(minutes)}:${pad2(seconds)}`;

  return `${time}.${pad3(milliseconds)}`;
}

function create_terminal_element(parent: Element,id:string): HTMLElement {
  const ans=parent.querySelector(`#${id}`)
  if (ans!=null)
    return ans as HTMLElement //todo check that it is HTMLElement
  const template = document.createElement("template")
  template.innerHTML = `
<div class="term_panel" id="${id}" style="display: none;">
  <div class="term_wrapper">
    <div class="term_title_bar">
      <span class="term_title_dir"></span>
      <span class="term_title_script"></span>
      <span class="term_title_status"></span>
      <span class="term_title_duration"></span>
    </div>
  <div class=term>
    </div>
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
function calc_stats_html(new_runner:Runner){
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
function calc_runner_status(runner:Runner){
  const {runs}=runner
  if (runs.length===0)
    return{version:0,state:'ready'}
  const {end_time,run_id:version,exit_code}=runs.at(-1)!
  if (end_time==null)
    return {version,state:'running'}
  if (exit_code===0)
    return {version,state:'done'}
  return {version,state:'error'}
}

  // 2. Register a decoration using that marker

  // 3. (Optional) use onRender to get an element
    // el is an HTMLElement when rendered
    // but you *don’t need* to style here if you set colors above
class TerminalPanel{
  last_run_id:number|undefined
  el:HTMLElement
  term:Terminal
  //last_runner:Runner|undefined=undefined
  last_stats:string|undefined
  constructor(
    public parent:Element,
    runner:Runner
  ){
    this.el=create_terminal_element(parent,runner.id)
    this.term=new Terminal()



    const term_container=query_selector(this.el,'.term')
    if (term_container instanceof HTMLElement)
      this.term.open(term_container);
    // Initialize title bar with full filename plus script
    query_selector(this.el, '.term_title_dir').textContent=runner.full_pathname
    query_selector(this.el, '.term_title_script').textContent=runner.script
    query_selector(this.el, '.term_title_status').textContent='ready'
  }
  
  update(new_runner:Runner){
    // Update title bar with runner status (always update, even if no runs)
    const {runs}=new_runner
    const {state} = calc_runner_status(new_runner)
    const last_run=runs.at(-1)
    if (last_run!=null){
      const {start_time,end_time}=last_run
      const effective_end_time=function(){
        if (end_time==null){
          const ans=Date.now()
          return ans
        }
        return end_time
      }()
      query_selector(this.el, '.term_title_duration').textContent=formatElapsedTime(effective_end_time-start_time)
    }
      const statusEl = query_selector(this.el, '.term_title_status')
    statusEl.textContent = state
    statusEl.className = `term_title_status background_${state}`
    

    if (last_run==null)
      return
    const {run_id}=last_run
    if (run_id!==this.last_run_id)
      this.term.clear()
    this.last_run_id=last_run.run_id
    //const term=query_selector(this.el,'.term')
    for (const line of last_run.output)
      this.term.write(line)
    //if (this.last_runner!=null&&JSON.stringify(this.last_runner)===JSON.stringify(new_runner))
    //  return
    const stats=calc_stats_html(new_runner)
    if (stats!==this.last_stats)
      update_child_html(this.el,'.stats>tbody',stats)
    this.last_stats=stats
//    this.last_runner=new_runner//should we at all hold on to it
  }
}
class Terminals{
  terminals:s2t<TerminalPanel>={}
  constructor(
    public parent:Element
  ){
  }
  get_terminal(runner:Runner){
    const ans=this.terminals[runner.id] ??= new TerminalPanel(this.parent, runner)
    return ans
  }
}


declare function acquireVsCodeApi(): VSCodeApi;

const vscode = acquireVsCodeApi();

function get_terminals(folder:Folder,terminals:Terminals){
  function f(folder:Folder){
    for (const runner of folder.runners)
      terminals.get_terminal(runner).update(runner)
    folder.folders.forEach(f) //i dont like carring the terminals like this
  }
  f(folder)
}

function convert(root:FolderRunner):TreeNode{
  const {type,name,id}=root

  if (root.type==='folder'){
    const folders=root.folders.map(convert)
    const items=root.runners.map(convert)
    const children=[...folders,...items]
    return {children,type:'folder',id,label:name,commands:[],icon:'folder',icon_version:0}
  }
  const {script}=root
  const {version,state}=calc_runner_status(root)
  return {type:'item',id,label:name,commands:['play','debug'],children:[],description:script,icon:state,icon_version:version}
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
  //let old_root:Folder|undefined
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
            //upda(document.body,'#selected', message.selected)
            on_selected_changed(message.selected)
            break
          case 'updateContent':
            //append(message.text||'<no message>')
            break;
      }
  });
  
}
start()