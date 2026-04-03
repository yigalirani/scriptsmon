import {create_element,get_parent_by_class} from './dom_utils.js'
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