import type {WebviewMessage} from '../../src/extension.js'
import type {s2t} from '@yigal/base_types'
import { Terminal,type ILink, type ILinkProvider } from '@xterm/xterm';
import {query_selector,create_element,get_parent_by_class,update_child_html,path_join} from './dom_utils.js'
import type { Folder,Runner} from '../../src/data.js';
import * as parser from '../../src/parser.js';
import type {RunnerReport} from '../../src/monitor.js';  
import {calc_runner_status,post_message,ctrl,type FileLocation,default_get,formatElapsedTime} from './common.js'
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
class TerminalPanel{
  last_run_id:number|undefined
  el:HTMLElement
  term:Terminal
  //last_runner:Runner|undefined=undefined
  //:string|undefined
  onLink =(location: FileLocation)=>{
    console.log(location)
  }
  show_watch(runner:Runner){
//    update_child_html(this.el,'.term_title_watch .value',html)
    update_child_html(this.el, '.term_title_script .value',runner.script)
    //const el=query_selector(this.el, '.term_title_watch .value')
    const html=runner.effective_watch.map(({rel,full})=>`<div title='${full}'class=rel>${rel.str}</div>`).join('')
    update_child_html(this.el,'.term_title_watch .value',html)
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
    this.show_watch(runner)
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
      update_child_html(this.el,'.term_title_duration .value',new_time)
      //this.last_time=new_time
    }
      const statusEl = query_selector(this.el, '.term_title_status .value')
    statusEl.textContent = state
    statusEl.className = `value background_${state}`
    this.show_watch(new_runner)
    if (last_run==null)
      return
    const {run_id}=last_run
    if (run_id!==this.last_run_id)
      this.term.clear()
    this.last_run_id=last_run.run_id
    for (const line of last_run.output)
      this.term.write(line)
    const stats=calc_stats_html(new_runner)
    //if (stats!==this.last_stats)
      update_child_html(this.el,'.stats>tbody',stats)
    //this.last_stats=stats
      update_child_html(this.el,'.term_title_runid .value',`${run_id}`)
    
  }
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
function start(){
  console.log('start')
  const terminals=new Terminals(query_selector<HTMLElement>(document.body,'.terms_container'))
  let base_uri=''
  let report:RunnerReport|undefined
  window.addEventListener('message',  (event:MessageEvent<WebviewMessage>) => {
      const message = event.data;
      switch (message.command) {
          case 'RunnerReport':{
            const count=Object.keys(report?.runs||{}).length
            update_child_html(document.body,'.terms_counter',`${count}`)
            report=message
            get_terminals(message,terminals)
            base_uri=message.base_uri
            break
          }
          case 'set_selected':{
            const {selected}=message
            //upda(document.body,'#selected', message.selected)
            if (report==null)
              return
            const runner=parser.find_runner(report.root,selected)
            if (runner==null)
              return
            for (const panel of document.querySelectorAll('.term_panel')){
              if (!(panel instanceof HTMLElement))
                continue
              panel.style.display=(panel.id===selected)?'flex':'none'
            }               
            break
          }
          case 'updateContent':
            //append(message.text||'<no message>')
            break;
      }
  });
}
start()
const el = document.querySelector('.terms_container');
console.log(el)
