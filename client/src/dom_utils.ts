import type { s2t} from '@yigal/base_types'

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
    ans=ans.parentElement
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
    ans = ans.parentElement;
    if (ans !== null && classes.some(c => ans!.classList.contains(c))) {
      return ans;
    }
  }
  return null;
}
export function remove_class(el:HTMLElement,className:string){
  el.querySelectorAll(`.${className}`).forEach(x => x.classList.remove(className))      
}
const el_to_html= new WeakMap<HTMLElement,string>()
export function update_child_html(el: HTMLElement, selector: string, html: string) {
  const child = query_selector<HTMLElement>(el,selector)
  const exists=el_to_html.get(child)
  if (exists===html)
    return
  el_to_html.set(child,html)
  child.innerHTML = html;
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
export function path_join(...segments: string[]): string {
  const parts: string[] = [];
  let absolute = true;

  for (const segment of segments) {
    if (!segment) continue;

    absolute = absolute || segment.startsWith("/");

    const tokens = segment.split("/");
    for (const token of tokens) {
      if (token === "" || token === ".") continue;

      if (token === ".." && parts.length && parts[parts.length - 1] !== "..") {
        parts.pop();
        continue;
      }

      if (token === ".." && !absolute) {
        parts.push("..");
        continue;
      }

      if (token !== "..") {
        parts.push(token);
      }
    }
  }
  const ans = parts.join("/");
  if (absolute) return `/${ans}`;
  return ans || ".";
}
