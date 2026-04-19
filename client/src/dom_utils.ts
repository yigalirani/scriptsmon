import  { type s2t,nl} from '@yigal/base_types'

export function query_selector<T extends Element=Element>(el:Element,selector:string){ // 3:32  warning  Type parameter T is used only once in the function signature  @typescript-eslint/no-unnecessary-type-parameters why?
    const ans=el.querySelector<T>(selector);
    if (ans==null)
      throw new Error('selector not found or not expected type')  
      return ans
}
export function create_element(html:string,parent?:HTMLElement){
  const template = document.createElement("template")
  template.innerHTML = html.trim()
  const ans = template.content.firstElementChild as HTMLElement;
  if (parent!=null)
    parent.appendChild(ans)
  return ans
}
export function divs(vals:s2t<string|undefined>){
  const ans=[]
  for (const [k,v] of Object.entries(vals))
    if (v!=null&&v!=='')
      ans.push(`<div class="${k}">${v}</div>`)
  return ans.join('')
}
export function get_parent_by_data_attibute(el:HTMLElement|null,key:string){
  if (el==null)
    return null
  let ans:HTMLElement|null=el
  while(ans!=null){
    const {dataset}=ans
    if (key in dataset)
      return ans
    ans=ans.parentElement
  }
  return null
}
export function get_parent_with_dataset(el:HTMLElement|null){
  if (el==null)
    return null
  let ans:HTMLElement|null=el
  while(ans!=null){
    if (Object.entries(ans.dataset).length!==0)
      return ans
    ans=ans.parentElement
  }
  return null
}
export function get_parent_by_class(el:Element|null,className:string){
  if (el==null)
    return null
  let ans:Element|null=el
  while(ans!=null){
    if (ans.classList.contains(className))
      return ans as HTMLElement
    ans=ans.parentElement
  }
  return null
}
function has_classes(el: HTMLElement | null,classes:string[]){
  if (el==null)
    return false
  return classes.some(c => el.classList.contains(c))
}
export function has_class(parent: HTMLElement,selector:string,c:string){
  const el=parent.querySelector(selector)
  if (el==null)
    return false
  return el.classList.contains(c)
}

export function get_parent_by_classes(
  el: HTMLElement,
  className: string | string[]
): HTMLElement | null {
  const classes = Array.isArray(className) ? className : [className];
  let ans: HTMLElement | null = el;

  while (ans !== null) {
    if (has_classes(ans,classes))
      return ans;
    ans = ans.parentElement;
  } 
  return null;
}
export function get_parent_id( //loops over parents until first with id
  el: HTMLElement
): string|undefined{
  let ans=el.parentElement

  while (ans !== null) {
    const id=ans.getAttribute('id')
    if (id!=null)
      return id
    ans = ans.parentElement;
  } 
}
function setter_cache(setter:(el:HTMLElement,value:string)=>void){
  const el_to_html= new WeakMap<HTMLElement,string>()
  return function(el:HTMLElement,selector:string,value:string){ 
    for (const child of el.querySelectorAll<HTMLElement>(selector)){
      const exists=el_to_html.get(child)
      if (exists===value)
        continue
      el_to_html.set(child,value)
      setter(child,value)  
    } 
  }
}

export const update_child_html=setter_cache((el:HTMLElement,value:string)=>{el.innerHTML=value})
export const update_class_name=setter_cache((el:HTMLElement,value:string)=>{ el.className=value})

export class CtrlTracker{
  pressed = false;
  constructor(){
    window.addEventListener("keydown", (e) => {
      if (e.key === "Control") {
        this.pressed = true;
      }
    });

    window.addEventListener("keyup", (e) => {
      if (e.key === "Control") {
        this.pressed = false;
      }
    });    
  }
}
interface VSCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}
declare function acquireVsCodeApi(): VSCodeApi;
export const vscode = acquireVsCodeApi();
export interface Component{
  on_interval:()=>void
  on_data:(data:unknown)=>void
}
export const ctrl=new CtrlTracker()
export const re = (flags?: string) =>  //todo: move it to some generic lib like the base_types. already obsolete
  (strings: TemplateStringsArray, ...values: unknown[]): RegExp => {
    const raw = String.raw({ raw: strings }, ...values);
    const sanitized = raw.replace(/#.*$/gm, '').replace(/\s+/g, '');
    return new RegExp(sanitized, flags);
  };
function get_range_array(x: Highlight){
  const ans=[...x.values()]
  return ans
}
function get_element_selection(container:HTMLElement) {
  const s = window.getSelection();
  if (s==null)
    return

  if (s.rangeCount > 0) {
    const r = s.getRangeAt(0);
    const n = r.commonAncestorContainer;
    const of_container=container.contains(n.nodeType === 1 ? n : n.parentNode)
    return `of_container ${of_container}, ${s}`
  }

  return
}
function print_selection(el:unknown){
  if (!(el instanceof HTMLElement))
    return
  console.log('scriptsmon: selection',get_element_selection(el))
}
export class HighlightEx{
  highlight
  selected_highlight
  focused=false
  selected_range:AbstractRange|undefined
  ranges:Array<AbstractRange>|undefined
  constructor(highlight_name:string,el:Element){
    this.highlight=this.make_highlight(highlight_name,'findMatch',0)
    this.selected_highlight=this.make_highlight(`selected_${highlight_name}`,'findMatchHighlight',1)
    el.addEventListener('blur',this.onblur,true)
    el.addEventListener('focus',this.onfocus,true)
  }  
  onblur=(e:Event)=>{
    this.focused=false
    console.log('scriptsmon:blur',e.target,this.focused)
    const s = window.getSelection();
    if (!s || s.rangeCount === 0) {
      return;
    }
    const r = s.getRangeAt(0);
    this.selected_highlight.clear()
    this.selected_highlight.add(r)
    s.removeAllRanges()
    //todo: get selectioin range and put it on the selected_highlight
  }
  onfocus=(e:Event)=>{
    //todo:take the selected_highlight and put it on the highlight
    this.focused=true
    const s = window.getSelection();    
    if (s==null)
      return
    for (const r of this.selected_highlight.keys()){
      s.removeAllRanges()
      s.addRange(r as Range)
      break//by thoeram that is all selected_highlight have but break 
    }
    this.selected_highlight.clear()
    console.log('scriptsmon:focus',e.target,this.focused)
  }
  
  make_highlight(name:string,base:string,priority:number){
    const ans=new Highlight()
    const dynamic_sheet = new CSSStyleSheet();
    document.adoptedStyleSheets.push(dynamic_sheet);    
    dynamic_sheet.insertRule(`
  ::highlight(${name}) { 
    background-color: var(--vscode-terminal-${base}Background);
    outline: 1px solid var(--vscode-terminal-${base}Border);
  }
`)//this works for vscode plugin webview, but if i every want to use the module for other cases, this would have to change


    CSS.highlights.set(name,ans);
    ans.priority=priority
    return ans
  }
  get_range_by_index(highlight: Highlight, index: number){
    const ranges = Array.from(highlight);
    return ranges[index] 
  }
  clear(){
    this.highlight.clear()
    this.selected_highlight.clear()
    //this.selected_range
    this.ranges=undefined
    //this.clear_selected_range()
  }
  delete(range:Range){
    this.highlight.delete(range)
    this.ranges=undefined
  }
  add(range:Range){
    this.highlight.add(range)
    this.ranges=undefined
  }
  /*clear_selected_range(){
    if (this.selected_range==null)
      return
    document.getSelection()?.removeAllRanges();
    this.selected_range=undefined
  }*/
  get_ranges(){
    if (this.ranges==null)
      this.ranges= get_range_array(this.highlight)
    return this.ranges
  }
  
  select(range_num:number){
    const range=this.get_ranges()[range_num-1]
    if (range==null){
      console.warn(`scriptsmon: cant find range by num ${range_num}`)
      return
    }
    if (range===this.selected_range)
      return 
    this.selected_range=range
    if (this.focused){
      const selection=nl(document.getSelection())
      selection.removeAllRanges()
      selection.addRange(range as Range)
    }else{
      this.selected_highlight.clear()
      this.selected_highlight.add(range)
    }
  }
  get size(){
    return this.highlight.size
  }
}