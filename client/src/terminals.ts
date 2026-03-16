
import  {type s2t,default_get} from '@yigal/base_types'
//import { Terminal,type IMarker,IDisposable} from '@xterm/xterm';
//import { WebglAddon  } from '@xterm/addon-webgl';
//import { FitAddon } from '@xterm/addon-fit';
import {query_selector,create_element,get_parent_by_class,update_child_html,type Component} from './dom_utils.js'
import type { Folder,Runner,RunnerReport,Reason} from '../../src/data.js';
import  {post_message,calc_last_run} from './common.js'
//import {MyLinkProvider} from './terminal_links.js'
import { groupEnd } from 'node:console';
import {Replacement,Style,strip_ansi} from './terminals_ansi.js'
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


class TerminalPanel{
  last_run_id:number|undefined
  el
  term_el
  last_line=''
  ancore:string|undefined
  style:Style={
    foreground: undefined,
    background: undefined,
    font_styles: new Set()
  }

  constructor(
    runner:Runner //this is not saved, it doent have the public/private,that in purpuse becasue runner hcnages
  ){
    this.el=create_terminal_element(runner)
    this.term_el=query_selector(this.el,'.term')
  }
  set_visibility(val:boolean){
    this.el.style.display=(val)?'flex':'none'   
  }

  term_clear(){
    this.term_el.innerHTML=''
  }
  line_to_html=(x:string)=>{
    const {
      stripped_text,
      style_positions
    }=strip_ansi(x, this.style)
    this.style=style_positions.at(-1)||this.style
    const {replacements,ancore}=parse(stripped_text,this.ancore)
    this.ancore=ancore
    const br=(stripped_text===''?'<br>':'')
    return `<div class=line>${stripped_text}${br}</div>`
  }
  term_write(output:string[]){
    /*
    concat. convert \r\n to \n strip away cursor movement
    if this.last_line exists is not empty pre prend it and delete the last html line put
    split over \n
    put it int new_lines
    this.last_line=new_lines.at(-1)
    for each line do
      replace non-color ansi codes with empty spans 
      using regex 
        find ancore and replace with <p data-file data-row data-col>text</p>
        encore ref
        links
      we now have p tags with text that may have ansi codes p atgs do not span lines
      using regex replace ansi colors with divs.
      question: how to tread ovrelapping links and ansi colors answer: regex stage before will not let that happen and alaso tools themself will not

      using regex replace, replace all ansi colors with divs
      using regex replace, replace all unproccessed ansi code with span class=code
    on the panel add on click that proccess these
    on the last line add <span class=oef></span>



    */
    if (output.length===0)
      return
    const lines=[this.last_line,...output].join('').replaceAll('\r\n','\n').split('\n')
    if (this.last_line!=='')
      this.term_el.lastElementChild?.remove();
    this.last_line=lines.at(-1)||''




    const new_html=lines.map(this.line_to_html).join('')
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
    this.term_write(last_run.output)
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
        this.get_terminal(runner)?.update_terminal(report,runner)
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

