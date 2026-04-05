import {create_element,get_parent_by_class,has_class,update_child_html} from './dom_utils.js'

interface StartEnd{
  start:number
  end:number
}
interface NodeOffset{
  node:Node
  start_pos:number
  end_pos:number
}
class NodeIndex{
  node_offsets:NodeOffset[]=[]
  plain_text=''
  walker
  constructor(public root: HTMLElement){
    this.walker=document.createTreeWalker(this.root, NodeFilter.SHOW_TEXT);
  }
  iter=()=>{
    const strings=[]
    let start_pos=this.plain_text.length
    while (this.walker.nextNode()) {
      const node = this.walker.currentNode;
      const string=node.textContent??''
      const end_pos=start_pos+string.length-1
      this.node_offsets.push({node,start_pos,end_pos})
      start_pos+=string.length      
      strings.push(string)
    }
    this.plain_text+=strings.join('')
  }
  /*find_node_index_binary(target_index: number): number {
    let low = 0;
    let high = this.node_offsets.length - 2;
    let result = 0;

    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        
        // Check if the target falls within this node's range
        if (this.node_offsets[mid]! <= target_index) {
            result = mid;
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    return result;
  }*/
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

class RegExpSearcher{
  head=0
  constructor(
    private index:NodeIndex,
    private regex:RegExp,
    private highlight:Highlight
  ){
  }
  advance_head(pos:number){
    //by thoeram, if index data is good and it should,and pos is from regex.match, then this function will always return
    while(true){
      const {node,start_pos,end_pos}=this.index.node_offsets[this.head]!
      if (end_pos>=pos){
        return {
          node,
          pos:pos-start_pos
        }
      }
      this.head++
    }
  }
  iter=()=>{
    // Ensure the regex has the global flag
    while(true){
      const match = this.regex.exec(this.index.plain_text)
      if (match==null)
        break
      const {length}=match[0]
      if (length===0){
        this.regex.lastIndex++
        continue
      }
      const start=this.advance_head(match.index)
      const end=this.advance_head(match.index + match[0].length)
      const range = new Range();
      range.setStart(start.node,start.pos)
      range.setEnd(end.node,end.pos)
      this.highlight.add(range)
    }
  }
}
export class TerminalSearch{
  find_widget
  index
  interval_id
  regex_searcher:RegExpSearcher|undefined
  regex:RegExp|undefined
  constructor(
    private term_el:HTMLElement,
    private term_text:HTMLElement,
    private highlight:Highlight
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
    
    
      </div>`,this.term_el)
      this.term_el.addEventListener('click',this.onclick)    
      this.input()!.addEventListener('change',this.update_search)   
      this.input()!.addEventListener('input',this.update_search)   
      this.index=new NodeIndex(this.term_text)
      this.interval_id=setInterval(this.iter,200)
  }
  show(){
    this.find_widget.classList.remove('hidden')
    this.input()?.focus();
  }
  iter=()=>{
    this.index.iter()
    this.regex_searcher?.iter()
  }
  input(){
    return this.find_widget.querySelector<HTMLInputElement>('#find_input')
  }
  search_term_clear(){
    this.index=new NodeIndex(this.term_text)
    if (this.regex)
      this.regex_searcher=new  RegExpSearcher(this.index,this.regex,this.highlight) 
  }
  update_search=()=>{
    const txt=this.input()!.value
    const match_case=has_class(this.find_widget,'#match_case',"checked")
    const whole_word=has_class(this.find_widget,'#whole_word',"checked")
    const reg_ex=has_class(this.find_widget,'#reg_ex',"checked")

    const regex=make_regex({txt,match_case,whole_word,reg_ex})
    update_child_html(this.find_widget,'#regex',get_regexp_string(regex))
    this.highlight.clear()
    this.regex_searcher=undefined
    if (regex!=null)
      this.regex_searcher=new  RegExpSearcher(this.index,regex,this.highlight)
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
  text_added(){
  }
}