import {create_element,get_parent_by_class,has_class,update_child_html} from './dom_utils.js'

interface _StartEnd{
  start:number
  end:number
}
interface NodeOffset{
  node:Node
  node_pos:number
}
export interface SearchData{
  term_el:HTMLElement
  term_text:HTMLElement
  highlight:Highlight  
  term_plain_text:string
  lines:Array<number>
  //new_line_pos:BigInt64Array
}
class RegExpSearcher{
  text_head=0
  line=0
  children
  walker:TreeWalker|undefined
  walker_offset=0
  constructor(
    public search_data:SearchData,
    public regex:RegExp,
  ){
    this.children=search_data.term_el.children
  }
  advance_line(text_pos:number){
    const {children,search_data:{lines,term_plain_text}}=this
    while(true){
      const next_line_pos=lines[this.line+1]??term_plain_text.length
      if (next_line_pos>text_pos){
        if (this.walker==null){
          const cur_line_node=children[this.line]!
          this.walker=document.createTreeWalker(cur_line_node, NodeFilter.SHOW_TEXT);
          this.text_head=lines[this.line]!
        }
        return
      }
      this.walker=undefined
      if (this.line<lines.length)
        this.line++
    }
  }
  get_node_offset(text_pos:number):NodeOffset{
    this.advance_line(text_pos)
    if (this.walker==null)
      throw new Error('walker is null')
    while (this.walker.nextNode()) {
      const node = this.walker.currentNode;
      const string=node.textContent??''
      const {length}=string
      this.text_head+=length
      if (text_pos>=this.text_head-length&& text_pos <this.text_head)
        return {
          node,
          node_pos:text_pos-this.text_head-length
        } 
    }
    throw new Error("should not get here")
  }
  iter=()=>{
    /*if (this.text_head===this.search_data.term_plain_text.length)
      return*/
    while (true) {
      const {lastIndex}=this.regex
      const m = this.regex.exec(this.search_data.term_plain_text)
      if (m==null){
        this.regex.lastIndex=lastIndex // match causes redex.lastindex to reset - let put it back
        return
      }    
      const start=this.get_node_offset(m.index)
      const end=this.get_node_offset(m.index + m[0].length)
      const range = new Range();
      range.setStart(start.node,start.node_pos)
      range.setEnd(end.node,end.node_pos)
      this.search_data.highlight.add(range)
    }
  }
}

function make_regex({ txt, match_case, whole_word, reg_ex }:{ 
  txt:string, 
  match_case:boolean, 
  whole_word:boolean, 
  reg_ex:boolean 
}) {
    let pattern = txt;
    if (txt==='')
      return
    let flags = "g";

    if (!match_case) {
        flags += "i";
    }

    if (!reg_ex) {
        // Escape special characters for a literal string match
        pattern = txt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    if (whole_word) {
        pattern = `\\b${pattern}\\b`;
    }

    return new RegExp(pattern, flags);
}
function get_regexp_string(pattern: RegExp|undefined): string {
  if (pattern==null)
    return 'none'
  const source = pattern.source;
  const flags = pattern.flags;

  if (flags.length > 0) {
    return `/${source}/${flags}`;
  }

  return `/${source}/`;
}



export class TerminalSearch{
  find_widget
  interval_id
  regex_searcher:RegExpSearcher|undefined
  regex:RegExp|undefined
  constructor(
    private data:SearchData
  ){
      this.find_widget=create_element(`
      <div class="find_widget_container hidden">
        <div class="find_toolbar">
          <div class="find_input_wrapper">
            <input type="text" class="find_input_field" placeholder="Find" id="find_input" />
            <div class="action_buttons">
              <div class="icon_button" title="Match Case" id=match_case>Aa</div>
              <div class="icon_button" title="Match Whole Word" id=whole_word><u>ab</u></div>
              <div class="icon_button" title="Use Regular Expression" id=reg_ex>.*</div>
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
            <div id="regex" title="Close (Escape)">
              df
            </div>            
          </div>
        </div>
    
    
      </div>`,this.data.term_el)
      this.data.term_el.addEventListener('click',this.onclick)    
      this.input()!.addEventListener('change',this.update_search)   
      this.input()!.addEventListener('input',this.update_search)   
      this.interval_id=setInterval(this.iter,200)
  }
  show(){
    this.find_widget.classList.remove('hidden')
    this.input()?.focus();
  }
  iter=()=>{
    this.regex_searcher?.iter()
  }
  input(){
    return this.find_widget.querySelector<HTMLInputElement>('#find_input')
  }
  search_term_clear(){
    if (this.regex)
      this.regex_searcher=new  RegExpSearcher(this.data,this.regex) 
  }
  update_search=()=>{
    const txt=this.input()!.value
    const match_case=has_class(this.find_widget,'#match_case',"checked")
    const whole_word=has_class(this.find_widget,'#whole_word',"checked")
    const reg_ex=has_class(this.find_widget,'#reg_ex',"checked")

    const regex=make_regex({txt,match_case,whole_word,reg_ex})
    update_child_html(this.find_widget,'#regex',get_regexp_string(regex))
    this.data.highlight.clear()
    this.regex_searcher=undefined
    if (regex!=null)
      this.regex_searcher=new  RegExpSearcher(this.data,regex)
  }
  onclick=(event:MouseEvent)=>{
    const {target}=event
    if (!(target instanceof HTMLElement))
      return    
    if (target.id==='close_widget'){
      get_parent_by_class(target,'find_widget_container')?.classList.toggle("hidden");
      return
    }    
    const icon_button=get_parent_by_class(target,'icon_button')
    if (icon_button!=null){
      icon_button.classList.toggle('checked')
      this.update_search()
    }
  }
}