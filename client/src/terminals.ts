
import  {type s2t,default_get} from '@yigal/base_types'
import { Terminal } from '@xterm/xterm';
import { WebglAddon  } from '@xterm/addon-webgl';
import { FitAddon } from '@xterm/addon-fit';
import {query_selector,create_element,get_parent_by_class,update_child_html,type Component} from './dom_utils.js'
import type { Folder,Runner,RunnerReport,Reason} from '../../src/data.js';
import  {post_message,calc_last_run} from './common.js'
import {addFileLocationLinkDetection} from './terminal_links.js'


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
    <table class=watching></table>
  </div>
  <div class=line0></div>
  <div class=line1></div>
  <div class=line2></div>
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
let webgl_count=0
setInterval(()=>console.log('webgl_count',webgl_count),1000)
class TerminalPanel{
  last_run_id:number|undefined
  el
  term:Terminal|undefined
  webgl_addon:WebglAddon|undefined 
  clearAnchors= () => console.log('')
  //runner_id=''
  constructor(
    runner:Runner //this is not saved, it doent have the public/private,that in purpuse becasue runner hcnages
  ){
    this.el=create_terminal_element(runner)
  }
  webgl_on(){
    webgl_count++
    this.webgl_addon= new WebglAddon();
    this.term!.loadAddon(this.webgl_addon);    
  }
  set_visibility(val:boolean){
    this.el.style.display=(val)?'flex':'none'   
    if (!this.term)
      return
    if (val){
      if (this.webgl_addon)
        return
      this.webgl_on()
      return
    }
    if (!this.webgl_addon)
      return    
    webgl_count--
    this.webgl_addon.dispose()
    this.webgl_addon=undefined
  }
  read_line(i:number){
    const line=this.term!.buffer.normal.getLine(i)
    if (line==null)
      return `<span>${i}</span><span>null</span>`
    const text=line.translateToString();
    const {isWrapped}=line
    const start=`<span>${i}</span><span>${isWrapped}</span>`
    if (text==='')
      return `${start}<span>empty string</span>`
    return `${start}<span>${text}</span>`
  }  
  create_if_needed(runner:Runner){
    if (this.term)
      return this.term
    console.log('create terminal',runner.id)
    this.term=new Terminal({cols:200,rows:200,scrollback: 5000,allowProposedApi: true,minimumContrastRatio:1})
    if (this.el.style.display!=='none')
      this.webgl_on() //was selected and term was just created
    //this.term.loadAddon(new WebglAddon()); // todo: restore this

    const fitAddon = new FitAddon();
    this.term.loadAddon(fitAddon);

    const call_fit = () =>{ 
      fitAddon.fit()
      for (let i=0;i<3;i++){
        update_child_html(this.el,`.line${i}`,this.read_line(i))
      }
    }
    setInterval(call_fit,100)

    this.clearAnchors = addFileLocationLinkDetection(this.term,runner.workspace_folder)
    const term_container=query_selector(this.el,'.term')
    if (term_container instanceof HTMLElement){
      this.term.open(term_container)
    }
    call_fit()
    return this.term
    //query_selector(this.el, '.term_title_dir .value').textContent=runner.workspace_folder
    //this.show_watch(runner)
    //query_selector(this.el, '.term_title_status .value').textContent='ready'
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
    const term=this.create_if_needed(runner)
    const {run_id}=last_run
    if (run_id!==this.last_run_id){
      this.clearAnchors()
      term.clear()
    }
    this.last_run_id=last_run.run_id
    for (const line of last_run.output)
      term.write(line)

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

