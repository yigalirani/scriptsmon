
import  {type s2t,default_get} from '@yigal/base_types'
//import { Terminal,type IMarker,IDisposable} from '@xterm/xterm';
//import { WebglAddon  } from '@xterm/addon-webgl';
//import { FitAddon } from '@xterm/addon-fit';
import {query_selector,create_element,get_parent_by_class,update_child_html,type Component,get_parent_by_data_attibute} from './dom_utils.js'
import type { Folder,Runner,RunnerReport,Reason,Filename} from '../../src/data.js';
import  {post_message,calc_last_run} from './common.js'
//import {MyLinkProvider} from './terminal_links.js'
import  {type Style,strip_ansi,generate_html} from './terminals_ansi.js';
import {parse} from './terminals_parse.js'


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
function link_click(event:MouseEvent,target:HTMLElement,workspace_folder:string){
  const parent=get_parent_by_data_attibute(target,'source_file')
  if (parent==null)
    return  
  const {source_file='',row='',col=''}=parent.dataset
  post_message({
    command: "command_open_file_rowcol",
    workspace_folder,
    source_file,
    row:parseInt(row,10)||0,
    col:parseInt(col,10)||0
  })  
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

function make_onclick(parent:HTMLElement,workspace_folder:string,effective_watch:Filename[]){
  return function(event:MouseEvent){
    const {target}=event
    if (!(target instanceof HTMLElement))
      return    
    if (rel_click(event,target,effective_watch))
      return
    link_click(event,target,workspace_folder)          
  }
}

function create_terminal_element(runner:Runner): HTMLElement {
  const terms_container=query_selector<HTMLElement>(document.body,'.terms_container')
  const {id}=runner
  const ret=terms_container.querySelector<HTMLElement>(`#${id}`)
  if (ret!=null)
    return ret //todo check that it is HTMLElement
  const ans=create_element(  `
<div class="term_panel" id="${id}" style="display: none;">
  <div class="term_title_bar">
    <div class="icon text"></div>
    <div class=commands_icons></div>
    <div class=term_title_duration></div>
    <div class=dbg></div>
    <table class=watching></table>
  </div>
  <div class=term></div>
</div>
  `,terms_container)
  ans.addEventListener('click',make_onclick(ans,runner.workspace_folder,runner.effective_watch))
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

function calc_watching_tr(report:RunnerReport,runner:Runner){
  if (runner.effective_watch.length===0)
    return ''
  const sep=`<span class=sep> • </span>`
  const ret=runner.effective_watch.map(({rel,full})=>`<div title='${full}'class=rel>${rel.str}</div>`).join(sep)
  return `<tr><td><div><div class=toggles_icons></div>Watching:</td></div><td><div>${ret}</div></td></tr>`
}


    /*extract class that allows to format ansi to html
    given start style and a line with ansi
    provide:
     text without the ansi
     end state of the ansi
     replace function that accepts multiple:
      start
      end
      tag start
      tag end
      replement 
      text
      and return replcement line */

const clear_style:Style={
  foreground: undefined,
  background: undefined,
  font_styles: new Set()
}
type Channel='stderr'|'stdout'
type ChannelState={
  last_line:string
  ancore:string|undefined
  style:Style
}
class TerminalPanel{
  last_run_id:number|undefined
  el
  term_el
  channel_states:Record<Channel,ChannelState>={
    stdout:{last_line:'',ancore:undefined,style:clear_style},
    stderr:{last_line:'',ancore:undefined,style:clear_style}
  }

  constructor(
    runner:Runner //this is not saved, it doent have the public/private,that in purpuse becasue runner hcnages
  ){
    this.el=create_terminal_element(runner)
    this.term_el=query_selector(this.el,'.term')
    this.term_clear()
  }
  set_visibility(val:boolean){
    this.el.style.display=(val)?'flex':'none'   
  }

  term_clear(){
    this.term_el.innerHTML=''
    this.channel_states={
      stdout:{last_line:'',ancore:undefined,style:clear_style},
      stderr:{last_line:'',ancore:undefined,style:clear_style}
    }
  }
  line_to_html=(x:string,state:ChannelState,line_class:string)=>{
    const {
      plain_text,
      style_positions
    }=strip_ansi(x, state.style)
    state.style=style_positions.at(-1)!.style //strip_ansi is gurantied to have at least one in style positons. i tried to encode it in ts but was too verbose to my liking
    const {replacments,ancore}=parse(plain_text,state.ancore)
    const html=generate_html({style_positions,replacments,plain_text})

    state.ancore=ancore
    const br=(plain_text===''?'<br>':'')
    return `<div class="${line_class}">${html}${br}</div>`
  }
  term_write(output:string[],channel:Channel){

    if (output.length===0)
      return
    const channel_state=this.channel_states[channel]
    const line_class=`line_${channel}`
    const joined_lines=[channel_state.last_line,...output].join('').replaceAll('\r\n','\n')
    const lines=joined_lines.split('\n')
  
    if (channel_state.last_line!=='')
      this.term_el.querySelector(`.${line_class}:last-child`)?.remove()
    channel_state.last_line=lines.at(-1)||''
    const lines_to_render = channel_state.last_line === '' ? lines.slice(0,-1) : lines




    const new_html=lines_to_render.map(x=>this.line_to_html(x,channel_state,line_class)).join('')
    this.term_el.insertAdjacentHTML('beforeend',new_html)
  }
  update_terminal(report:RunnerReport,runner:Runner){
    //const title_bar=calc_title_html(report,runner)
    const watching=  `${calc_watching_tr(report,runner)}  
  ${calc_reason_tr(report,runner)}`
    update_child_html(this.el,'.term_title_bar .term_title_duration',calc_elapsed_html(report,runner))
    update_child_html(this.el,'.term_title_bar .watching',watching)

    const last_run=calc_last_run(report,runner)
    if (last_run==null)
      return
    const {run_id}=last_run
    if (run_id!==this.last_run_id){
      this.term_clear()     
      //this.reset_link_provider() //no need to do it here because term.clear is not effective immideeatly. btter do it on marker dispose 
    }
    this.last_run_id=last_run.run_id
    if (last_run.stderr.length===0 && last_run.stdout.length===0)
      return
    this.el.querySelector('.eof')?.classList.remove('eof')
    this.term_write(last_run.stderr,"stderr")
    this.term_write(last_run.stdout,"stdout")
    this.term_el.lastElementChild?.classList.add('eof')
  }
}

export class Terminals implements Component{
  terminals:s2t<TerminalPanel>={} 
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
  set_selected(id:string){
    for (const [panel_id,panel] of Object.entries(this.terminals)){
      panel.set_visibility(panel_id===id)
    }
  }
}

