
import  {type s2t,default_get, get_error} from '@yigal/base_types'
import { Terminal,type TerminalListener } from './terminal.js';
import {query_selector,create_element,get_parent_by_class,update_child_html,type Component} from './dom_utils.js'
import type { Folder,Runner,RunnerReport,Reason,Filename} from '../../src/data.js';
import  {post_message,calc_last_run} from './common.js'
import {parse_line} from './terminals_parse.js'


function formatElapsedTime(ms: number,title:string,show_ms:boolean): string {
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
  const ms_display=show_ms?`<span class=ms>.${pad3(milliseconds)}</span>`:''
  return `<div title="${title}">${time}${ms_display}</div>`;
}
function rel_click(event:MouseEvent,target:HTMLElement,effective_watch:Filename[]){
  const parent=get_parent_by_class(target,'rel')
  if (parent==null)
    return false
  
  if (!event.ctrlKey){
    const {title}=parent
    post_message({
      command: "command_open_file_rowcol",
      workspace_folder:'',
      source_file:title,
      row:0,
      col:0
    })
    return true     
  }
  
  const rel=effective_watch.find(x=>x.rel.str===parent.textContent)
  if (rel!=null){
    //rel
    post_message({
      command: "command_open_file_pos",
      pos:rel.rel
    })
    return true
  }
  return false
}  

function make_onclick(effective_watch:Filename[]){
  return function(event:MouseEvent){
    const {target}=event
    if (!(target instanceof HTMLElement))
      return    
    rel_click(event,target,effective_watch)
  }
}

function create_terminal_element(runner:Runner): HTMLElement {
  const terms_container=query_selector<HTMLElement>(document.body,'.terms_container')
  const {id,name}=runner
  const ret=terms_container.querySelector<HTMLElement>(`#${id}`)
  if (ret!=null)
    return ret //todo check that it is HTMLElement
  const ans=create_element(  `
<div class="term_panel" id="${id}" style="display: none;">
  <div class="term_title_bar">
    <div class="term_name">${name}</div>
    <div class="icon text"></div>
    <div class=commands_icons></div>
    <div class=term_title_duration></div>
    <div class=dbg></div>
    <table class=watching></table>
  
  </div>
</div>
  `,terms_container)
  ans.addEventListener('click',make_onclick(runner.effective_watch))
  return ans;
}
function calc_elapsed_html(report:RunnerReport,runner:Runner){
  const last_run=calc_last_run(report,runner)
  if (last_run==null)
    return ''
  const {start_time,end_time}=last_run
  const now=Date.now()
  const effective_end_time=function(){
    if (end_time==null)
      return now
    return end_time
  }()
  const time_since_end=function(){
    if (end_time==null)
      return ''
    return formatElapsedTime(now-end_time,"time since done",false) //not sure if people woule like this
  }()
  const new_time=formatElapsedTime(effective_end_time-start_time,'run time',true)+time_since_end
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
  return `<tr><td>(${reason})</td><td><div><div class=rel title=${full_filename}>${full_filename}</div></div></td></tr>`
}

function calc_watching_tr(runner:Runner){
  if (runner.effective_watch.length===0)
    return ''
  const sep=`<span class=sep> • </span>`
  const ret=runner.effective_watch.map(({rel,full})=>`<div title='${full}'class=rel>${rel.str}</div>`).join(sep)
  return `<tr><td><div><div class=toggles_icons></div>Watching:</td></div><td><div>${ret}</div></td></tr>`
}

class TerminalPanel implements TerminalListener{
  last_run_id:number|undefined
  el
  term
  workspace_folder

  constructor(
    runner:Runner //this is not saved, it doent have the public/private,that in purpuse becasue runner hcnages
  ){
    this.workspace_folder=runner.workspace_folder
    this.el=create_terminal_element(runner)
    this.term=new Terminal(this.el,this,runner.id)
    //this.term_clear()
  }
  set_visibility(val:boolean){
    this.el.style.display=(val)?'flex':'none'   
  }
  parse(line_text:string,parse_state:unknown){
    return parse_line(line_text,parse_state)
  }
  open_link(url: string){
    post_message({
      command:"command_open_link",
      url
    })
  }
  dataset_click(dataset:Record<string,string>){
    const source_file=dataset.source_file
    if (source_file==null) //todo: check that not empty string?
      return
    const row=parseInt(dataset.row??'',10)||0
    const col=parseInt(dataset.col??'',10)||0
    const {workspace_folder}=this
    post_message({
      command: "command_open_file_rowcol",
      workspace_folder,
      source_file,
      row,
      col
    })      
  }
  update_terminal2(report:RunnerReport,runner:Runner){
    //const title_bar=calc_title_html(report,runner)
    const watching=  `${calc_watching_tr(runner)}  
  ${calc_reason_tr(report,runner)}`
    update_child_html(this.el,'.term_title_bar .term_title_duration',calc_elapsed_html(report,runner))
    update_child_html(this.el,'.term_title_bar .watching',watching)

    const last_run=calc_last_run(report,runner)
    if (last_run==null)
      return
    const {run_id}=last_run
    if (run_id!==this.last_run_id){
      this.term.term_clear()     
      //this.reset_link_provider() //no need to do it here because term.clear is not effective immideeatly. btter do it on marker dispose 
    }
    this.last_run_id=last_run.run_id
    if (last_run.stderr.length===0 && last_run.stdout.length===0)
      return

    this.term.term_write(last_run.stderr,"stderr")
    this.term.term_write(last_run.stdout,"stdout")
    this.term.after_write()
  }
  update_terminal(report:RunnerReport,runner:Runner){
    try{
      this.update_terminal2(report,runner)
    }catch(ex){
      const {message}=get_error(ex)
      update_child_html(this.el,'.dbg',message)
    }
  }
}

export class Terminals implements Component{
  terminals:s2t<TerminalPanel>={} 
  visible_panel:TerminalPanel|undefined
  get_terminal(runner:Runner){
    const ans=default_get(this.terminals,runner.id,()=> new TerminalPanel(runner))
    return ans
  }
  on_interval(){
    //console.log('on_interval')
  }
  on_data(data:unknown){
    const report=data as RunnerReport
    const f=(folder:Folder)=>{
      for (const runner of folder.runners)
        this.get_terminal(runner).update_terminal(report,runner)
      folder.folders.forEach(f) 
    }
    f(report.root)    
  }
  get_search(){
    return this.visible_panel?.term.search
  }

  set_selected(id:string){
    for (const [panel_id,panel] of Object.entries(this.terminals)){
      const visible=panel_id===id
      panel.set_visibility(visible)
      if (visible)
        this.visible_panel=panel
    }
  }
}

