
import  {type s2t,default_get} from '@yigal/base_types'
import { Terminal,type ILink, type ILinkProvider } from '@xterm/xterm';
import { WebglAddon  } from '@xterm/addon-webgl';
import { FitAddon } from '@xterm/addon-fit';
import {query_selector,create_element,get_parent_by_class,update_child_html,ctrl,path_join,type Component} from './dom_utils.js'
import type { Folder,Runner,RunnerReport,Reason} from '../../src/data.js';
import  {type FileLocation,post_message,calc_last_run} from './common.js'

const links_regex = /(?<source_file>([a-zA-Z]:)?[a-zA-Z0-9_\-./\\@]+)(:(?<row>\d+))?(:(?<col>\d+))?/g;
const ancor_regex = /^(?<source_file>([a-zA-Z]:)?[a-zA-Z0-9_\-./\\@]+)(:(?<row>\d+))?(:(?<col>\d+))?\s*$/;
const ref_regex = /^\s*(?<row>\d+):(?<col>\d+)(.*)/
function addFileLocationLinkDetection(
  terminal: Terminal,
  workspace_folder:string
){
  const ancors:Array<undefined|string|false>=[] //string means anchor/unknown/no ancore
  let links:Array<ILink>=[]
  function clearAnchors() {
    ancors.length = 0
  }
  function get_text(y:number){
    const line = terminal.buffer.active.getLine(y - 1)
    const ans=line&&line.translateToString(true)||''
    return ans
  }
  function write_ancores(start:number,end:number,value:false|string){
    ///ancors.fill(value, start, end); ///didnt work
    //console.log('write_ancores',start,end,value)
    for (let i=start;i<=end;i++)
      if (ancors[i]==null)
          ancors[i]=value
  }
  function push_link({match,y,source_file,groups}:{
    y:number
    source_file:string,
    groups:Record<string,string>
    match:RegExpExecArray|RegExpMatchArray
  }){
    const { index } = match;
    const text = match[0];
    const start= index!+1
    const end= index! + text.length  
    const row= groups.row && parseInt(groups.row, 10)||0
    const col= groups.col && parseInt(groups.col, 10)||0  
    const link:ILink={
      range: {
        start: { x: start, y },
        end: { x: end, y }
      },
      activate(){
        post_message({
          command: "command_open_file_rowcol",
          workspace_folder,
          source_file, 
          row,
          col
        });
      },
      text
    }
    links.push(link)
  }
  function find_anchor(y:number){
    for (let i=y;i>=0;i--){
      const ancor=ancors[i]
      if (ancor===false){
        write_ancores(i,y,false)
        return false
      }
      if (typeof(ancor)==='string'){
        write_ancores(i,y,ancor)
        return ancor
      }
      const input=get_text(i)
      const ancor_match=input.match(ancor_regex)
      if (ancor_match!=null){
        const source_file=ancor_match.groups!.source_file!
        write_ancores(i,y,source_file)
        return source_file
      }
      const ref_match=input.match(ref_regex) 
      if (ref_match==null){
        write_ancores(i,y,false)
        return false
      }
    }
    write_ancores(0,y,false)
    return false
  }
  function make_ref_link(input: string,y:number){
    if (ancors[y]===false)
      return false
 
    const source_file=find_anchor(y)
    if (source_file===false)
      return false
    const match = input.match(ref_regex)
    if (match==null){
      write_ancores(y,y,false)
      return false
    }    
    const {groups}=match
    if (groups==null)
      return false
    push_link({match,y,source_file,groups})
    return true

  }
  function make_links(y:number) {
    const input=get_text(y)    
    if (make_ref_link(input,y))
      return 

    
    for (const match of input.matchAll(links_regex)){
      const { groups } = match;
      if (groups==null)
        continue 
      const source_file= groups.source_file!////by the defintioin of the regex, it is clear that it is not undefined, why tsc cannt know it


      push_link({match,y,source_file,groups})

    }
    return links
  }
  const provider: ILinkProvider = {
    provideLinks(y, callback) {
      links=[]
      make_links(y)
      //console.log(links)
      callback(links);
    }
  };
  terminal.registerLinkProvider(provider);
  terminal.onResize(() => clearAnchors())
  return clearAnchors
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
      const parent=get_parent_by_class(target,'rel')
      if (parent==null)
        return
      
      if (!event.ctrlKey){
        const {title}=parent
        post_message({
          command: "command_open_file_rowcol",
          workspace_folder:'',
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
const ignore_reasons:Reason[]=['initial','user']
function calc_reason_tr(report:RunnerReport,runner:Runner){
  const last_run=calc_last_run(report,runner)
  if (last_run==null)
    return ''
  const {full_reason}=last_run
  const {reason,full_filename}=full_reason
  if (ignore_reasons.includes(reason))
    return ''
  return `<tr><td>${reason}:</td><td><div><div class=rel title=${full_filename}>${full_filename}</div></div></td></tr>`
}
function calc_watching(report:RunnerReport,runner:Runner){
  const sep=`<span class=sep> • </span>`
  return runner.effective_watch.map(({rel,full})=>`<div title='${full}'class=rel>${rel.str}</div>`).join(sep)
}
function calc_title_html(report:RunnerReport,runner:Runner){
  const watching=calc_watching(report,runner)
  const elapsed=calc_elapsed_html(report,runner)

  return `<div class=term_title_duration>${elapsed}</div>
  <table>
  <tr><td>Watching:</td><td><div>${watching}</div></td></tr> 
  ${calc_reason_tr(report,runner)}
  
  </table>`
}
class TerminalPanel{
  last_run_id:number|undefined
  el:HTMLElement
  term
  fitAddon
  clearAnchors: () => void
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
    runner:Runner //this is not saved, it doent have the public/private,that in purpuse becasue runner hcnages
  ){
    console.log('create terminal',runner.id)
    this.el=create_terminal_element(parent,runner)
    this.term=new Terminal({cols:200,rows:200,scrollback: 5000,allowProposedApi: true,minimumContrastRatio:1})
    //this.term.loadAddon(new WebglAddon ()); todo: restore this

    this.fitAddon = new FitAddon();
    this.term.loadAddon(this.fitAddon);
    setInterval(this.call_fit,1000)


    this.clearAnchors = addFileLocationLinkDetection(this.term,runner.workspace_folder)
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
    if (run_id!==this.last_run_id){
      this.clearAnchors()
      this.term.clear()
    }
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

