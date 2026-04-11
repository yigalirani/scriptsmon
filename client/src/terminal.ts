
import  {type Style,strip_ansi,generate_html,type AnsiInsertCommand, merge_inserts} from './terminals_ansi.js';
import {get_parent_with_dataset,create_element} from './dom_utils.js'
import {TerminalSearch,type SearchData} from './terminal_search.js'
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
    stdout:{parser_state:undefined,style:clear_style},
    stderr:{parser_state:undefined,style:clear_style}
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

export class Terminal implements SearchData{
  channel_states
  term_text
  term_el
  search
  highlight
  term_plain_text=''
  lines
  last_line=''
  last_write_channel:Channel="stdout"
  //text_index
  constructor(
    parent:HTMLElement,
    private listener:TerminalListener,
    id:string
  ){
    this.lines=new BigInt64Array()
    this.channel_states=make_channel_states()
    this.term_el=create_element(`
<div class=term>
  <div class="term_text"></div>
</div>
    `,parent)
    this.term_text=this.term_el.querySelector<HTMLElement>('.term_text')!
    this.term_text.innerHTML=''
    //this.text_index=new BigInt64Array()
    this.term_plain_text=''
    this.highlight=this.make_highlight(id)
    this.search=new TerminalSearch(this)
    this.term_el.addEventListener('click',this.onclick)
  }
  make_highlight(id:string){
    const highlight_name=`search_${id}`
    const highlight=new Highlight()
    const dynamic_sheet = new CSSStyleSheet();
    document.adoptedStyleSheets.push(dynamic_sheet);    
    dynamic_sheet.insertRule(`::highlight(${highlight_name}) { background-color: red; }`);
    CSS.highlights.set(highlight_name, highlight);     
    return highlight   
  }
  onclick=(event:MouseEvent)=>{
    const {target}=event
    if (!(target instanceof HTMLElement))
      return    
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
    
    if (this.last_write_channel!==channel){ //forcing line break when switching channels
      this.last_line=''
    }
    this.last_write_channel=channel

    const joined_lines=[this.last_line,...output].join('').replaceAll('\r\n','\n')
    const lines=joined_lines.split('\n')
  
    if (this.last_line!=='')
      this.term_text.querySelector(`& > :last-child`)?.remove()
    this.last_line=lines.at(-1)??''
    const lines_to_render = this.last_line === '' ? lines.slice(0,-1) : lines
    const new_html=lines_to_render.map(x=>this.line_to_html(x,channel_state,line_class)).join('')
    this.term_text.insertAdjacentHTML('beforeend',new_html)
  }
  show_find(){
    this.search.show()
  }
 
  term_clear(){
    this.term_text.innerHTML=''
    this.channel_states=make_channel_states()
    this.search.search_term_clear()
      /*stdout:{last_line:'',ancore:undefined,style:clear_style},
      stderr:{last_line:'',ancore:undefined,style:clear_style}
    }   */ 
  }

}