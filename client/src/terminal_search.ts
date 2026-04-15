import {create_element,get_parent_by_class,has_class,update_child_html} from './dom_utils.js'
import {nl} from "@yigal/base_types"
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
}
class RangeFinder{
  walker
  cur_node:Node|null=null
  cur_length=0
  text_head=0
  all_done=false
  constructor(
    public el:Element
  ){
    this.walker=document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    this.get_next_node()
  }
  get_next_node(){
    this.text_head+=this.cur_length
    this.cur_node=this.walker.nextNode()
    if (this.cur_node==null)
      throw new Error("scriptsmon:cur node is null")    
    this.cur_length=this.cur_node.textContent?.length||0
  }
  get_node_offset(pos:number):NodeOffset{
    while(true){
      if (pos>=this.text_head&& pos<this.text_head+this.cur_length+1)
        return {
            node:this.cur_node!,
            node_pos:pos-this.text_head
        }
      this.get_next_node()
    }
  }
}
interface LineRanges{
  line_number:number
  ranges:Array<Range>
  line_length:number
}

class RegExpSearcher{
  children
  last_line_ranges:LineRanges|undefined
  line_head=0
  constructor(
    public search_data:SearchData,
    public regex:RegExp,
  ){
    this.children=search_data.term_text.children
    this.search_data.highlight.clear()
  }

  get_line_ranges(line_number:number){
    const line=nl(this.children[line_number])
    const {textContent}=line
    const line_length=textContent.length
    if (this.last_line_ranges &&
      this.last_line_ranges.line_length===line_length&&
      this.last_line_ranges.line_number===line_number
    )
      return 
    const ranges=[]
    let range_finder:RangeFinder|undefined
    for (const match of textContent.matchAll(this.regex)){
      if (range_finder==null) // error TS2448: Block-scoped variable 'range_finder' used before its declaration. why?
          range_finder=new RangeFinder(line)
      const range=new Range()
      const start=range_finder.get_node_offset(match.index)
      const end=range_finder.get_node_offset(match.index+match[0].length)
      range.setStart(start.node,start.node_pos)
      range.setEnd(end.node,end.node_pos)
      ranges.push(range)
    }
    return {
      line_length,
      ranges,
      line_number
    }
  }

  get_start_line(){
    if (this.last_line_ranges==null)
      return 0
    return this.last_line_ranges.line_number
  }
  apply_cur_ranges(cur_ranges:LineRanges){
    if (this.last_line_ranges&&this.last_line_ranges.line_number===cur_ranges.line_number){
      for (const range of this.last_line_ranges.ranges){
        this.search_data.highlight.delete(range)
      }
    }
    for (const range of cur_ranges.ranges){
      this.search_data.highlight.add(range)
    }

  }
  iter=()=>{
    for (let line=this.get_start_line();line<this.children.length;line++){
      const cur_ranges=this.get_line_ranges(line)
      if (cur_ranges==null) //cached result didnt change - already applied
        continue
      this.apply_cur_ranges(cur_ranges)
      this.last_line_ranges=cur_ranges
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
function trunk(x:number,min:number,max:number){
  if (x>max)
    return max
  if (x<min)
    return min
  return x
}
export class TerminalSearch{
  find_widget
  interval_id
  regex_searcher:RegExpSearcher|undefined
  regex:RegExp|undefined
  selection=0

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
               &#x2191;
            </div>             
            <div class="nav_button" id="next_match" title="Next Match (F3)">
               &#x2193;
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
      this.interval_id=setInterval(this.iter,20)
  }
  show(){
    this.find_widget.classList.remove('hidden')
    this.input()?.focus();
  }
  calc_match_status_and_apply_selection(){
    if (this.data.highlight.size===0){
      this.selection=1
      if (this.regex_searcher!=null)
        return `<div class='search_error'>No Results</div>`
      return `<div>No Results</div>`
    }
    this.selection=trunk(this.selection,1,this.data.highlight.size)
    return `${this.selection} of ${this.data.highlight.size}`
  }
  iter=()=>{
    if (this.regex_searcher)
      this.regex_searcher.iter()
    else{
      this.data.highlight.clear()
    }
    update_child_html(this.find_widget,'#match_status',this.calc_match_status_and_apply_selection())
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
    if (target.id==='prev_match'){
      this.selection--
      return
    }
    if (target.id==='next_match'){
      this.selection++
      return
    }

    const icon_button=get_parent_by_class(target,'icon_button')
    if (icon_button!=null){
      icon_button.classList.toggle('checked')
      this.update_search()
    }
  }
}