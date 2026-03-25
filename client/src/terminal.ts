
import  {type Style,strip_ansi,generate_html,type AnsiInsertCommand, merge_inserts} from './terminals_ansi.js';
import {get_parent_with_dataset} from './dom_utils.js'
export interface ParseRange{
  start:number
  end:number
  values:Record<string,string>
}
export interface TerminalListener{
  parse:(line_text:string,state:unknown)=>{
    parser_state:unknown,
    ranges:Array<ParseRange> 
  }
  link_click:(values:Record<string,string>)=>void
}
type Channel='stderr'|'stdout' 
interface ChannelState{
  last_line:string
  parser_state:unknown
  style:Style
}
const clear_style:Style={
  foreground: undefined,
  background: undefined,
  font_styles: new Set()
}
function make_channel_states():Record<Channel,ChannelState>{
  return {
    stdout:{last_line:'',parser_state:undefined,style:clear_style},
    stderr:{last_line:'',parser_state:undefined,style:clear_style}
  }
}
function range_to_inserts(range:ParseRange):AnsiInsertCommand[]{
  const {start,end,values}=range
  const datamap=Object.entries(values).map(([k,v])=>`data-${k}='${v}'`).join('')
  const open=`<span ${datamap}>`
  const close=`</span>`
  return [{position:start,str:open,command:'insert'},{position:end,str:close,command:'insert'}]
}
function ranges_to_inserts(ranges:Array<ParseRange>){
  return ranges.flatMap(range_to_inserts)
}
function get_element_dataset (element: HTMLElement): Record<string, string> {
  return Object.fromEntries(Object.entries(element.dataset)) as Record<string, string>;
};
export class Terminal{
  channel_states
  constructor(
    private term_el:HTMLElement,
    private listener:TerminalListener
  ){
    this.channel_states=make_channel_states()
    this.term_el.innerHTML=''
    this.term_el.addEventListener('click',this.onclick)
  }
  onclick=(event:MouseEvent)=>{
    const {target}=event
    if (!(target instanceof HTMLElement))
      return    
    const parent=get_parent_with_dataset(target)
    if (parent==null)
      return  
    const dataset=get_element_dataset(parent)
    this.listener.link_click(dataset)
  }
  line_to_html=(x:string,state:ChannelState,line_class:string)=>{
    const {
      plain_text,
      style_positions,
      link_inserts
    }=strip_ansi(x, state.style)
    state.style=style_positions.at(-1)!.style //strip_ansi is gurantied to have at least one in style positons. i tried to encode it in ts but was too verbose to my liking
    const {ranges,parser_state}=this.listener.parse(plain_text,state.parser_state)
    state.parser_state=parser_state
    const range_inserts=ranges_to_inserts(ranges)
    const inserts=merge_inserts(range_inserts,link_inserts)
    const html=generate_html({style_positions,inserts,plain_text})
    const br=(plain_text===''?'<br>':'')
    return `<div class="${line_class}">${html}${br}</div>`
  }
  after_write(){
    this.term_el.querySelector('.eof')?.classList.remove('eof')
    this.term_el.lastElementChild?.classList.add('eof')
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
  
  term_clear(){
    this.term_el.innerHTML=''
    this.channel_states=make_channel_states()
      /*stdout:{last_line:'',ancore:undefined,style:clear_style},
      stderr:{last_line:'',ancore:undefined,style:clear_style}
    }   */ 
  }

}