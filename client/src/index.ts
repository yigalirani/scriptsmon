interface VSCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}
import type {WebviewMessage} from '../../src/extension.js'
import type {s2t} from '@yigal/base_types'
import { Terminal,type ILink, type ILinkProvider } from '@xterm/xterm';
import {query_selector,create_element,get_parent_by_class,update_child_html,CtrlTracker,path_join} from './dom_utils.js'
import {TreeControl,type TreeDataProvider,type TreeNode} from './tree_control.js';
import type { Folder,Runner,FolderError, Run} from '../../src/data.js';
import * as parser from '../../src/parser.js';
import type {RunnerReport} from '../../src/monitor.js';  
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
  workspace_folder:string
): void {
  const pattern = /([a-zA-Z0-9_\-./\\]+):(\d+):(\d+)/g;
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
      while (true) {
        match = pattern.exec(text)
        if (match==null)
          break
        const [full, file, row, col] = match;
        if (file==null)
          continue
        const source_file=path_join(workspace_folder,file)
        links.push({
          range: {
            start: { x: match.index + 1, y },
            end: { x: match.index + full.length, y }
          },
          activate: () => {
            if (ctrl.pressed)
              post_message({
                command: "command_open_file_rowcol",
                //workspace_folder,
                source_file,
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
  const {id}=runner
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
    (()=>{
      const parent=get_parent_by_class(target,'term_title_dir')
      if (parent==null||!event.ctrlKey)
        return
      post_message({
        command: "command_open_file_rowcol",
        //workspace_folder,
        source_file:'package.json',
        row:0,
        col:0
      })
    })();
    
    (()=>{
      const parent=get_parent_by_class(target,'rel')
      if (parent==null)
        return
      
      if (!event.ctrlKey){
        const {title}=parent
        post_message({
          command: "command_open_file_rowcol",
          //workspace_folder,
          source_file:title,
          row:0,
          col:0
        })
        return        
      }
     
      const rel=runner.effective_watch.find(x=>x.rel.str===parent.textContent)
      if (rel!=null){
        //rel
        post_message({
          command: "command_open_file_pos",
          pos:rel.rel
        })
      }
    })()

   
  })
  return ans;
}
function calc_stats_html(new_runner:Runner){
  return Object.entries(new_runner).filter(([k])=>k!=='output').map(([k,v])=>`<tr>
      <td><span class=value>${k} = </span>${v}</td>
    </tr>`).join('\n')
}
function calc_runner_status(report:RunnerReport ,runner:Runner){
  const runs=report.runs[runner.id]||[]
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
    addFileLocationLinkDetection(this.term,runner.workspace_folder)
    const term_container=query_selector(this.el,'.term')
    if (term_container instanceof HTMLElement)
      this.term.open(term_container);
    // Initialize title bar with full filename plus script
    query_selector(this.el, '.term_title_dir .value').textContent=runner.workspace_folder
    query_selector(this.el, '.term_title_script .value').textContent=runner.script
    const el=query_selector(this.el, '.term_title_watch .value')
    for (const {rel,full} of runner.effective_watch)
      create_element(`<div title='${full}'class=rel>${rel.str}</div>`,el as HTMLElement)
    query_selector(this.el, '.term_title_status .value').textContent='ready'
  }
  update_terminal(report:RunnerReport,new_runner:Runner){
    // Update title bar with runner status (always update, even if no runs)
    //const {runs}=new_runner
    const runs=report.runs[new_runner.id]||[]
    const {state} = calc_runner_status(report,new_runner)
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
function default_get<T>(obj:Record<PropertyKey,T>,k:PropertyKey,maker:()=>T){
  const exists=obj[k]
  if (exists==null){
    obj[k]=maker()
  }
  return obj[k]
}
class Terminals{
  terminals:s2t<TerminalPanel>={}
  constructor(
    public parent:HTMLElement
  ){}
  get_terminal(runner:Runner){
    const ans=default_get(this.terminals,runner.id,()=> new TerminalPanel(this.parent, runner))
    return ans
  }
}
function get_terminals(report:RunnerReport,terminals:Terminals){
  function f(folder:Folder){
    for (const runner of folder.runners)
      terminals.get_terminal(runner)?.update_terminal(report,runner)
    folder.folders.forEach(f) 
  }
  f(report.root)
}


function convert(report:RunnerReport):TreeNode{
  function convert_runner(runner:Runner):TreeNode{
      const {script,watched,id,name}=runner
      const {version,state}=calc_runner_status(report,runner)
      const className=(watched?'watched':undefined)
      return {type:'item',id,label:name,commands:['play','debug'],children:[],description:script,icon:state,icon_version:version,className}
  }
  function convert_error(root:FolderError):TreeNode{
      const {id,message}=root
      return {type:"item",id,label:message,children:[],icon:"syntaxerror",icon_version:1,commands:[],className:"warning"}

  }  
  function convert_folder(root:Folder):TreeNode{
      const {name,id}=root
      const folders=root.folders.map(convert_folder)
      const items=root.runners.map(convert_runner)
      const errors=root.errors.map(convert_error)  
      const children=[...folders,...items,...errors]
      const icon=errors.length===0?'folder':'foldersyntaxerror'
      return {children,type:'folder',id,label:name,commands:[],icon,icon_version:0,className:undefined}
  }
  return convert_folder(report.root)
}

const provider:TreeDataProvider<RunnerReport>={
  convert,
  command(root,id,command_name,){
     post_message({
      command: "command_clicked",
      id,
      command_name
     })
  },
  icons_html:ICONS_HTML,
  animated:'.running,.done .check,.error .check',
  selected(report,id){
    (()=>{
      const base=parser.find_base(report.root,id)
      if (base==null||base.pos==null)
        return
      if (base.need_ctl&&!ctrl.pressed)
        return
      const {pos}=base
      post_message({
        command: "command_open_file_pos",
        pos
      })
    })()
    
    const runner=parser.find_runner(report.root,id)
    if (runner==null)
      return
    for (const panel of document.querySelectorAll('.term_panel')){
      if (!(panel instanceof HTMLElement))
        continue
      panel.style.display=(panel.id===id)?'flex':'none'
    }    
  }
}
function start(){
  console.log('start')
  const terminals=new Terminals(query_selector<HTMLElement>(document.body,'.terms_container'))
  let base_uri=''
  const tree=new TreeControl(query_selector(document.body,'#the_tree'),provider) //no error, whay
  let report:RunnerReport|undefined
  window.addEventListener('message',  (event:MessageEvent<WebviewMessage>) => {
      const message = event.data;
      switch (message.command) {
          case 'RunnerReport':{
            report=message
            get_terminals(message,terminals)
            base_uri=message.base_uri
            tree.render(message,base_uri)
            break
          }
          case 'set_selected':
            //upda(document.body,'#selected', message.selected)
            void provider.selected(report!,message.selected)
            break
          case 'updateContent':
            //append(message.text||'<no message>')
            break;
      }
  });
}
start()
const el = document.querySelector('.terms_container');
console.log(el)
