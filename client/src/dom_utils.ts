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
function has_classes(el: HTMLElement | null,classes:string[]){
  if (el==null)
    return false
  return classes.some(c => el.classList.contains(c))
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
export function path_join(...segments: string[]): string {
  const parts: string[] = [];
  let absolute = true;

  for (const segment of segments) {
    if (!segment) continue;

    absolute = absolute || segment.startsWith("/");

    const tokens = segment.split("/");
    for (const token of tokens) {
      if (token === "" || token === ".") continue;

      if (token === ".." && parts.length && parts.at(-1) !== "..") {
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