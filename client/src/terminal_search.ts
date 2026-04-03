import {create_element,get_parent_by_class} from './dom_utils.js'

class NodeIndex{
  text_nodes:Node[]=[]
  plain_text=''
  node_offsets:number[]=[]
  walker
  constructor(public root: HTMLElement){
    this.walker=document.createTreeWalker(this.root, NodeFilter.SHOW_TEXT);
  }
  iter(){
    const strings=[]
    while (this.walker.nextNode()) {
      const node = this.walker.currentNode;
      const string=node.textContent||''
      this.text_nodes.push(node)
      strings.push(string)
      this.node_offsets.push(string.length)
    }
  }
  find_node_index_binary(target_index: number): number {
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
  }

  get_ranges(offsets: [number, number][]): Range[] {
    const ans= [];
    for (const [start, end] of offsets) {
        // Find the starting node using binary search
        const start_node_idx = this.find_node_index_binary(start);
        const start_node = this.text_nodes[start_node_idx]!;
        const start_offset = start - this.node_offsets[start_node_idx]!;

        // Find the ending node (starting search from the start_node_idx for efficiency)
        let end_node_idx = start_node_idx;
        const total_nodes = this.text_nodes.length;
        
        while (end_node_idx < total_nodes - 1 && this.node_offsets[end_node_idx + 1]! <= end) {
            end_node_idx++;
        }

        const end_node = this.text_nodes[end_node_idx]!;
        const end_offset = end - this.node_offsets[end_node_idx]!;
        const range = new Range();
        range.setStart(start_node, start_offset);
        range.setEnd(end_node, end_offset)
        ans.push(range)
    }
    return ans;
  }
}

export class TerminalSearch{
  find_widget
  constructor(private term_el:HTMLElement){
      this.find_widget=create_element(`
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
    
    
      </div>`,this.term_el)
      this.term_el.addEventListener('click',this.onclick)      
  }
  show(){
    this.find_widget.classList.remove('hidden')
    this.find_widget.querySelector<HTMLElement>('.find_input_field')?.focus();
  }
  update_search(){
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