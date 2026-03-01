
import  {type s2t,default_get} from '@yigal/base_types'
import { Terminal,type ILink, type ILinkProvider } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import {query_selector,create_element,get_parent_by_class,update_child_html,ctrl,path_join,type Component} from './dom_utils.js'
import type { Folder,Run,Runner,RunnerReport} from '../../src/data.js';
import  {type FileLocation,post_message,calc_runner_status,calc_last_run} from './common.js'
function addFileLocationLinkDetection(
  terminal: Terminal,
  workspace_folder:string
): void {
  const pattern = /([a-zA-Z0-9_\-./\\]+)(:\d+)?(:\d+)?/g;
  const provider: ILinkProvider = {
    provideLinks(y, callback) {
      const line = terminal.buffer.active.getLine(y - 1);

      if (!line) {
        console.log('provideLinks',y,"!text")    
        callback([]);
        return;
      }
      const text = line.translateToString(true);
      console.log('provideLinks',y,text)      
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
   /*<div class="term_title_bar">
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
    </div>*/ 
function create_terminal_element(parent: HTMLElement,runner:Runner): HTMLElement {
  const {id}=runner
  const ret=parent.querySelector<HTMLElement>(`#${id}`)
  if (ret!=null)
    return ret //todo check that it is HTMLElement
  const ans=create_element(  `
<div class="term_panel" id="${id}" style="display: none;">
  <div class="term_title_bar"><div class=icon></div><div class="term_title_bar2"></div></div>
  <div class=term></div>
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
function calc_elapsed_html(report:RunnerReport,runner:Runner){
  const last_run=calc_last_run(report,runner)
  if (last_run==null)
    return ''
  const {start_time,end_time}=last_run
  const effective_end_time=function(){
    if (end_time==null){
      const ans=Date.now()
      return ans
    }
    return end_time
  }()
  const new_time=formatElapsedTime(effective_end_time-start_time)
  return new_time
}
function calc_reason_html(report:RunnerReport,runner:Runner){
  const last_run=calc_last_run(report,runner)
  if (last_run==null)
    return ''
  const {reason}=last_run
  const prefix='changed:'
  if (!reason.startsWith(prefix))
    return ''
  const display_reason=reason.slice(prefix.length)
  return display_reason
}
function calc_watching(report:RunnerReport,runner:Runner){
  const sep=`<span class=sep> • </span>`
  return runner.effective_watch.map(({rel,full})=>`<div title='${full}'class=rel>${rel.str}</div>`).join(sep)
}
function calc_title_html(report:RunnerReport,runner:Runner){
  const watching=calc_watching(report,runner)
  const elapsed=calc_elapsed_html(report,runner)
  const reason_html=calc_reason_html(report,runner)
  const reason_line=reason_html&&`<tr><td>Changed:</td><td><div>${reason_html}</div></td></tr>`

  return `<div class=term_title_duration>${elapsed}</div>
  <table>
  <tr><td>Watching:</td><td><div>${watching}</div></td></tr> 
  ${reason_line}
  
  </table>`
}
class TerminalPanel{
  last_run_id:number|undefined
  el:HTMLElement
  term
  fitAddon
  onLink =(location: FileLocation)=>{
    console.log(location)
  }
  show_watch_old(runner:Runner){
    update_child_html(this.el, '.term_title_script .value',runner.script)
    const html=runner.effective_watch.map(({rel,full})=>`<div title='${full}'class=rel>${rel.str}</div>`).join(', ')
    update_child_html(this.el,'.term_title_watch .value',html)
  }
  call_fit=()=>{
    this.fitAddon.fit()
      //console.log('fit')
    } 
  constructor(
    public parent:HTMLElement,
    runner:Runner
  ){
    this.el=create_terminal_element(parent,runner)
    this.term=new Terminal({cols:200,rows:200})

    this.fitAddon = new FitAddon();
    this.term.loadAddon(this.fitAddon);
    setInterval(this.call_fit,1000)


    addFileLocationLinkDetection(this.term,runner.workspace_folder)
    const term_container=query_selector(this.el,'.term')
    if (term_container instanceof HTMLElement){
      this.term.open(term_container)
    }
    //query_selector(this.el, '.term_title_dir .value').textContent=runner.workspace_folder
    //this.show_watch(runner)
    //query_selector(this.el, '.term_title_status .value').textContent='ready'
  }
  update_terminal(report:RunnerReport,new_runner:Runner){
    const title_bar=calc_title_html(report,new_runner)
    update_child_html(this.el,'.term_title_bar2',title_bar)
    
    //const statusEl = query_selector(this.el, '.term_title_status .value')
    //statusEl.textContent = state
    //statusEl.className = `value background_${state}`
    //this.show_watch(new_runner)
    const last_run=calc_last_run(report,new_runner)
    if (last_run==null)
      return
    const {run_id}=last_run
    if (run_id!==this.last_run_id)
      this.term.clear()
    this.last_run_id=last_run.run_id
    for (const line of last_run.output)
      this.term.write(line)
    //onst stats=calc_stats_html(new_runner)
    //update_child_html(this.el,'.stats>tbody',stats)

    //.update_child_html(this.el,'.term_title_runid .value',`${run_id}`)
  }
}

export class Terminals implements Component{
  terminals:s2t<TerminalPanel>={} 
  get_terminal(runner:Runner){
    const parent=query_selector<HTMLElement>(document.body,'.terms_container')
    const ans=default_get(this.terminals,runner.id,()=> new TerminalPanel(parent, runner))
    return ans
  }
  on_interval(){
    //console.log('on_interval')
  }
  on_data(data:unknown){
    const report=data as RunnerReport
    const f=(folder:Folder)=>{
      for (const runner of folder.runners)
        this.get_terminal(runner)?.update_terminal(report,runner)
      folder.folders.forEach(f) 
    }
    f(report.root)    
  }
  set_selected(id:string){
    for (const panel of document.querySelectorAll('.terms_container > *')){ //todo: make a genr
      if (!(panel instanceof HTMLElement))
        continue
      panel.style.display=(panel.id===id)?'flex':'none'
    }
  }
}

