type font_style = 'bold' | 'italic' |'faint'| 'underline' | 'blinking' | 'inverse' | 'strikethrough';

export interface Style {
  foreground: string | undefined;
  background: string | undefined;
  font_styles: Set<font_style>;
}
type Channel='stderr'|'stdout' 
interface ChannelState{
  last_line:string
  parser_state:unknown
  style:Style
}
class term{
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

  term_write(output:string[],channel:Channel){
    if (output.length===0)
      return
    const channel_state=this.channel_states[channel]
    const line_class=`line_${channel}`
    const joined_lines=[channel_state.last_line,...output].join('').replaceAll('\r\n','\n')
    const lines=joined_lines.split('\n')
  
    if (channel_state.last_line!=='')
      this.term_text.querySelector(`.${line_class}:last-child`)?.remove()
    channel_state.last_line=lines.at(-1)??''
    const lines_to_render = channel_state.last_line === '' ? lines.slice(0,-1) : lines
    const new_html=lines_to_render.map(x=>this.line_to_html(x,channel_state,line_class)).join('')
    this.term_text.insertAdjacentHTML('beforeend',new_html)
  }