
import  {type Style,strip_ansi,generate_html,type AnsiInsertCommand, merge_inserts} from './terminals_ansi.js';
import {get_parent_with_dataset,create_element,get_parent_by_class} from './dom_utils.js'
export interface ParseRange{
  start:number
  end:number
  dataset:Record<string,string>
}
export interface TerminalListener{
  parse:(line_text:string,state:unknown)=>{
    parser_state:unknown,
    ranges:Array<ParseRange> 
  }
  dataset_click:(dataset:Record<string,string>)=>void
  open_link:(url:string)=>void
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
  const {start,end,dataset}=range
  const datamap=Object.entries(dataset).map(([k,v])=>`data-${k}='${v}'`).join('')
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
  term_text
  term_el
  constructor(
    private parent:HTMLElement,
    private listener:TerminalListener
  ){
    this.channel_states=make_channel_states()
    this.term_el=create_element(`
<div class=term>
  <div class="find_widget_container hidden">
    <div class="find_toolbar">
      <div class="find_input_wrapper">
        <input type="text" class="find_input_field" placeholder="Find" id="find_input" />
        <div class="action_buttons">
          <div class="icon_button" title="Match Case">Aa</div>
          <div class="icon_button" title="Match Whole Word"><u>ab</u></div>
          <div class="icon_button" title="Use Regular Expression">.*</div>
        </div>
      </div>

      <div class="navigation_buttons">
  
        <div class="status_container" id="match_status">
          0 of 0
        </div>   
        <div class="nav_button" id="prev_match" title="Previous Match (Shift+F3)">
          <div class="arrow_up"></div>
        </div>             
        <div class="nav_button" id="next_match" title="Next Match (F3)">
          <div class="arrow_down"></div>
        </div>
        <div class="nav_button" id="close_widget" title="Close (Escape)">
          ×
        </div>
      </div>
    </div>


  </div>
  <div class="term_text"></div>
</div>
    `,parent)
    this.term_text=this.term_el.querySelector('.term_text')!
    this.term_text.innerHTML=''
    this.term_el.addEventListener('click',this.onclick)
  }
  onclick=(event:MouseEvent)=>{
    const {target}=event
    if (!(target instanceof HTMLElement))
      return    
    if (target.id==='close_widget'){
      get_parent_by_class(target,'find_widget_container')?.classList.toggle("hidden");
      return
    }
    const parent=get_parent_with_dataset(target)
    if (parent==null)
      return  
    const dataset=get_element_dataset(parent)
    const {url}=dataset
    if (url!=null)
      this.listener.open_link(url)
    else
      this.listener.dataset_click(dataset)
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
    this.term_text.querySelector('.eof')?.classList.remove('eof')
    this.term_text.lastElementChild?.classList.add('eof')
  }
  term_write(output:string[],channel:Channel){
    if (output.length===0)
      return
    const channel_state=this.channel_states[channel]
    const line_class=`line_${channel}`
    const joined_lines=[channel_state.last_line,...output].join('').replaceAll('\r\n','\n')
    const lines=joined_lines.split('\n')
  
    if (channel_state.last_line!=='')
      this.term_text.querySelector(`.${line_class}:last-child`)?.remove()
    channel_state.last_line=lines.at(-1)||''
    const lines_to_render = channel_state.last_line === '' ? lines.slice(0,-1) : lines
    const new_html=lines_to_render.map(x=>this.line_to_html(x,channel_state,line_class)).join('')
    this.term_text.insertAdjacentHTML('beforeend',new_html)
  }
  show_find(){
    const find_widget=this.term_el.querySelector('.find_widget_container') //bypassing the Terminal class todo: fix maybe
    find_widget?.classList.remove('hidden')
    find_widget?.querySelector<HTMLElement>('.find_input_field')?.focus();
  }
 
  term_clear(){
    this.term_text.innerHTML=''
    this.channel_states=make_channel_states()
      /*stdout:{last_line:'',ancore:undefined,style:clear_style},
      stderr:{last_line:'',ancore:undefined,style:clear_style}
    }   */ 
  }

}