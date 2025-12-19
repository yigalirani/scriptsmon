interface VSCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}
import {WebviewMessage} from '../../src/extension.js'
import {s2t,pk} from '@yigal/base_types'
import { Terminal,ILink, ILinkProvider } from '@xterm/xterm';
import {query_selector,create_element,get_parent_by_class,update_child_html,CtrlTracker} from './dom_utils.js'
import {TreeControl,TreeDataProvider,TreeNode} from './tree_control.js';
import { Folder,Runner,FolderRunner,State,find_runner} from '../../src/data.js';
import ICONS_HTML from '../resources/icons.html'
declare function acquireVsCodeApi(): VSCodeApi;
const vscode = acquireVsCodeApi();
export interface FileLocation {
  file: string;
  row: number;
  col: number;
}
function post_message(msg:WebviewMessage){
  vscode.postMessage(msg)
}
const ctrl=new CtrlTracker()
function addFileLocationLinkDetection(
  terminal: Terminal,
  full_pathname:string
): void {
  const pattern = /([^\s:]+):(\d+):(\d+)/g;
  const provider: ILinkProvider = {
    provideLinks(y, callback) {
      const line = terminal.buffer.active.getLine(y - 1);
      if (!line) {
        callback([]);
        return;
      }
      const text = line.translateToString(true);
      const links: ILink[] = [];
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(text)) !== null) {
        const [full, file, row, col] = match;
        if (file==null)
          continue
        links.push({
          range: {
            start: { x: match.index + 1, y },
            end: { x: match.index + full.length, y }
          },
          activate: () => {
            if (ctrl.pressed)
              post_message({
                command: "command_link_clicked",
                file,
                full_pathname,
                row: Number(row),
                col: Number(col)
              });
          },
          text: full
        });
      }
      callback(links);
    }
  };
  terminal.registerLinkProvider(provider);
}
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
  return `${time}<span class=ms>.${pad3(milliseconds)}</span>`;
}
function create_terminal_element(parent: HTMLElement,runner:Runner): HTMLElement {
  const {id,full_pathname}=runner
  const ret=parent.querySelector<HTMLElement>(`#${id}`)
  if (ret!=null)
    return ret //todo check that it is HTMLElement
  const ans=create_element(  `
<div class="term_panel" id="${id}" style="display: none;">
  <div class="term_wrapper">
    <div class="term_title_bar">
      <div class ="row_title_bar">
      <div class="term_title_dir"><div class=title>cwd</div><div class=value></div></div>
        <div class="term_title_watch"><div class=title>watch</div><div class=value></div></div>
      </div>
      <div class ="row_title_bar">
        <div class="term_title_script"><div class=title>run</div><div class=value></div></div>
        <div class="term_title_status"><div class=title></div><div class=value></div></div>
        <div class="term_title_duration"><div class=title></div><div class=value></div></div>
        <div class="term_title_runid"><div class=title></div><div class=value></div></div>
      </div>
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
  `,parent)
  ans.addEventListener('click',event=>{
    const {target}=event
    if (!(target instanceof Element))
      return
    const parent=get_parent_by_class(target,'term_title_dir')
    if (parent==null||!event.ctrlKey)
      return
    post_message({
      command: "command_link_clicked",
      full_pathname,
      file:'package.json',
      row:0,
      col:0
    })
   
  })
  return ans;
}
function calc_stats_html(new_runner:Runner){
  return Object.entries(new_runner).filter(([k,v])=>k!=='output').map(([k,v])=>`<tr>
      <td><span class=value>${k} = </span>${v}</td>
    </tr>`).join('\n')
}
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
class TerminalPanel{
  last_run_id:number|undefined
  el:HTMLElement
  term:Terminal
  //last_runner:Runner|undefined=undefined
  last_stats:string|undefined
  last_time:string|undefined
  onLink =(location: FileLocation)=>{
    console.log(location)
  }
  constructor(
    public parent:HTMLElement,
    runner:Runner
  ){
    this.el=create_terminal_element(parent,runner)
    this.term=new Terminal({cols:200})
    addFileLocationLinkDetection(this.term,runner.full_pathname)
    const term_container=query_selector(this.el,'.term')
    if (term_container instanceof HTMLElement)
      this.term.open(term_container);
    // Initialize title bar with full filename plus script
    query_selector(this.el, '.term_title_dir .value').textContent=runner.full_pathname
    query_selector(this.el, '.term_title_script .value').textContent=runner.script.str
    const el=query_selector(this.el, '.term_title_watch .value')
    for (const {rel,full} of runner.effective_watch)
      create_element(`<div title='${full}'class=rel>${rel}</div>`,el as HTMLElement)
    query_selector(this.el, '.term_title_status .value').textContent='ready'
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
      const new_time=formatElapsedTime(effective_end_time-start_time)
      if (new_time!==this.last_time)
        query_selector(this.el, '.term_title_duration .value').innerHTML=new_time
      this.last_time=new_time
    }
      const statusEl = query_selector(this.el, '.term_title_status .value')
    statusEl.textContent = state
    statusEl.className = `value background_${state}`
    if (last_run==null)
      return
    const {run_id}=last_run
    if (run_id!==this.last_run_id)
      this.term.clear()
    this.last_run_id=last_run.run_id
    for (const line of last_run.output)
      this.term.write(line)
    const stats=calc_stats_html(new_runner)
    if (stats!==this.last_stats)
      update_child_html(this.el,'.stats>tbody',stats)
    this.last_stats=stats
      update_child_html(this.el,'.term_title_runid .value',`${run_id}`)
    
  }
}
class Terminals{
  terminals:s2t<TerminalPanel>={}
  constructor(
    public parent:HTMLElement
  ){
  }
  get_terminal(runner:Runner){
    const ans=this.terminals[runner.id] ??= new TerminalPanel(this.parent, runner)
    return ans
  }
}
function get_terminals(folder:Folder,terminals:Terminals){
  function f(folder:Folder){
    for (const runner of folder.runners)
      terminals.get_terminal(runner).update(runner)
    folder.folders.forEach(f) 
  }
  f(folder)
}

function convert(root:FolderRunner):TreeNode{
    const {type,name,id}=root
    if (root.type==='folder'){
    const folders=root.folders.map(convert)
    const items=root.runners.map(convert)
      const children=[...folders,...items]
      return {children,type:'folder',id,label:name,commands:[],icon:'folder',icon_version:0,className:undefined}
    }
    const {script,watched}=root
    const {version,state}=calc_runner_status(root)
    const className=(watched?'watched':undefined)
    return {type:'item',id,label:name,commands:['play','debug'],children:[],description:script.str,icon:state,icon_version:version,className}
  }
const provider:TreeDataProvider<Folder>={
  convert,
  command(root,id,command_name,){
     post_message({
      command: "command_clicked",
      id,
      command_name
     })
  },
  icons_html:ICONS_HTML,
  selected(root,id){
    const runner=find_runner(root,id)
    if (runner==null)
      return
    for (const panel of document.querySelectorAll('.term_panel')){
      if (!(panel instanceof HTMLElement))
        continue
      panel.style.display=(panel.id===id)?'flex':'none'
    }    
    if (ctrl.pressed)
      post_message({
        command: "command_link_clicked2",
        full_pathname:runner.full_pathname,
        file:'package.json',
        start:runner.script.start,
        end:runner.script.end    
      })
  }
}
function start(){
  console.log('start')
  const terminals=new Terminals(query_selector<HTMLElement>(document.body,'.terms_container'))
  let base_uri=''
  const tree=new TreeControl(query_selector(document.body,'#the_tree'),provider) //no error, whay
  let root:Folder|undefined
  window.addEventListener('message',  (event:MessageEvent<WebviewMessage>) => {
      const message = event.data;
      switch (message.command) {
          case 'RunnerReport':{
            root=message.root
            get_terminals(message.root,terminals)
            base_uri=message.base_uri
            tree.render(message.root,base_uri)
            break
          }
          case 'set_selected':
            //upda(document.body,'#selected', message.selected)
            void provider.selected(root!,message.selected)
            break
          case 'updateContent':
            //append(message.text||'<no message>')
            break;
      }
  });
}
start()