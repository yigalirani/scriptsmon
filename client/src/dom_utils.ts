import { s2t} from '@yigal/base_types'

export function query_selector<T extends Element=Element>(el:Element,selector:string){
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

export function get_parent_by_class(el:Element|null,className:string){
  if (el==null)
    return null
  let ans:Element|null=el
  while(ans!=null){
    if (ans!=null&&ans.classList.contains(className))
      return ans as HTMLElement
    ans=ans.parentElement as HTMLElement
  }
  return null
}
export function get_parent_by_classes(
  el: HTMLElement,
  className: string | string[]
): HTMLElement | null {
  const classes = Array.isArray(className) ? className : [className];
  let ans: HTMLElement | null = el;

  while (ans !== null) {
    ans = ans.parentElement as HTMLElement;
    if (ans !== null && classes.some(c => ans!.classList.contains(c))) {
      return ans;
    }
  }
  return null;
}
export function remove_class(el:HTMLElement,className:string){
  el.querySelectorAll(`.${className}`).forEach(x => x.classList.remove(className))      
}
export function update_child_html(el: HTMLElement, selector: string, html: string) {
  const child = query_selector(el,selector)
  if (child.innerHTML === html) return; // skip if same
  child.innerHTML = html;
}
export function reset_animation(ids:Set<string>){ //not in use
  function collect_elements(parent: HTMLElement, ids: Set<string>): HTMLElement[] {
    // Select all elements under parent that have an id
    const allWithId = parent.querySelectorAll<HTMLElement>('[id]');
    for (const el of allWithId)
      if (ids.has(el.id)){
        //query_selector(el,'.icon') instanceof ImageEl
      }
    // Filter only the ones whose id is in the set
    return Array.from(allWithId).filter(el => ids.has(el.id));
}
  //firs
}
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