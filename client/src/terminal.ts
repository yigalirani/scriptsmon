
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
  last_line:string
  last_line_plain:string
  start_parser_state:unknown
  end_parser_state:unknown
  start_style:Style
  end_style:Style
  class_name:string
}
const clear_style:Style={
  foreground: undefined,
  background: undefined,
  font_styles: new Set()
}
function make_channel_states():Record<Channel,ChannelState>{
  const stdout:ChannelState={
    start_parser_state:undefined,
    end_parser_state:undefined,
    start_style:clear_style,
    class_name:'line_stdout',
    end_style:clear_style,
    last_line:'',
    last_line_plain:''
  }
  const stderr={...stdout,class_name:'line_stderr'}
  return {
    stdout,
    stderr
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
  lines:Array<number>
  last_write_channel:Channel="stdout"
  strings:string[]
  //text_index
  constructor(
    parent:HTMLElement,
    private listener:TerminalListener,
    id:string
  ){
    this.strings=[]
    this.lines=[]
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
  after_write(){
    this.term_text.querySelector('.eof')?.classList.remove('eof')
    this.term_text.lastElementChild?.classList.add('eof')
    const joined_strings=this.strings.join('')
    let acum=this.term_plain_text.length
    for (const str of joined_strings.split('\n')){
      acum+=str.length
      this.lines.push(acum)
    }
    this.term_plain_text=[this.term_plain_text,joined_strings].join('')
    console.log(this.term_plain_text)
    console.log(this.lines)

  }
  flush_channel(channel_state:ChannelState,append_nl:boolean){
    if (channel_state.last_line==='') //all flushed already
      return
    if (append_nl)
      this.strings.push('\n')
    channel_state.start_parser_state=channel_state.end_parser_state
    channel_state.start_style=channel_state.end_style
    channel_state.end_parser_state=undefined
    channel_state.end_parser_state=clear_style
    channel_state.last_line=''
    channel_state.last_line_plain=''

  }
  del_last_html_line(channel_state:ChannelState){
    const {last_line,last_line_plain}=channel_state
    if (last_line==='')
      return
    const line_to_delete=this.term_text.querySelector(`& > :last-child`)
    if (line_to_delete==null){
      console.error('missmatch:line_to_delete_null')
      return
    }
    const {textContent}=line_to_delete
    if (textContent!==last_line_plain){
      console.error('missmatch:text_content')
      return
    }
    line_to_delete.remove()
  }
  term_write(output:string[],channel:Channel){
    if (output.length===0)
      return
    const channel_state=this.channel_states[channel]
    
    if (this.last_write_channel!==channel){ //forcing line break when switching channels
      this.flush_channel(this.channel_states[this.last_write_channel],true)
    }
    this.last_write_channel=channel

    const joined_lines=[channel_state.last_line,...output].join('').replaceAll('\r\n','\n')
    const lines=joined_lines.split('\n')
    this.del_last_html_line(channel_state)
//    const lines_to_render = this.last_line === '' ? lines.slice(0,-1) : lines 
    const acum_html=[]
    for (let i=0;i<lines.length;i++){
      const line=lines[i]!
      const {
        plain_text,
        style_positions,
        link_inserts
      }=strip_ansi(line, channel_state.start_style)
      this.strings.push(plain_text)
      const is_last=(i===lines.length-1)
      if (is_last){
        if (line===''){
          this.flush_channel(channel_state,false)
          break
        }
      }
      const {ranges,parser_state}=this.listener.parse(plain_text,channel_state.start_parser_state)
      channel_state.end_style=style_positions.at(-1)!.style //strip_ansi is gurantied to have at least one in style positons. i tried to encode it in ts but was too verbose to my liking
      channel_state.end_parser_state=parser_state
      channel_state.last_line=line
      channel_state.last_line_plain=plain_text
      const range_inserts=ranges_to_inserts(ranges)
      const inserts=merge_inserts(range_inserts,link_inserts)
      const html=generate_html({style_positions,inserts,plain_text})
      const br=(plain_text===''?'<br>':'')
      acum_html.push( `<div class="${channel_state.class_name}">${html}${br}</div>`)
      if (!is_last)
        this.flush_channel(channel_state,true)
    }

    const new_html=acum_html.join('')
    this.term_text.insertAdjacentHTML('beforeend',new_html)
  }
  show_find(){
    this.search.show()
  }
 
  term_clear(){
    this.term_text.innerHTML=''
    this.channel_states=make_channel_states()
    this.search.search_term_clear()
    this.strings=[]
    this.term_plain_text=''
    this.lines=[]
      /*stdout:{last_line:'',ancore:undefined,style:clear_style},
      stderr:{last_line:'',ancore:undefined,style:clear_style}
    }   */ 
  }

}