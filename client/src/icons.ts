import type {TreeNode} from './tree_internals.js'
import {update_child_html,update_class_name} from './dom_utils.js'
export function parse_icons(html: string): Record<string, string> {
  const result: Record<string, string> = {};
  // Parse the HTML string into a Document
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  // Select all divs with class "icon"
  const icons = doc.querySelectorAll<HTMLDivElement>('.icon');
  icons.forEach(icon => {
    const nameEl = icon.childNodes[0]
    const contentEl = icon.querySelector<SVGElement>('svg');
    if (nameEl && contentEl) {
      const name = nameEl.textContent?.trim();
      const content = contentEl.outerHTML
      if (name!=null) {
        result[name] = content
      }
    }
  });
  const iconnames=Object.keys(result)
  console.log({iconnames})
  return result;
}

interface IconVersion{
  icon:string,
  version:number
}
function calc_box_shadow(icon:string,timeOffset:number){
  if (icon==='done'){
    const t=2-Math.max(2-timeOffset,0)
    const px=t * (2 - t)*8
    return `0px 0px ${px}px ${px}px green`
  }
  return ''
}
export class IconsAnimator{
  //icons
  private id_changed:Record<string,number>={}
  private icon_versions:Record<string,IconVersion>={}
  constructor(public icons:Record<string,string>){}
  private set_icon_version(id:string,icon:string,version:number){ //call mutuple time, one for each id
    const exists=this.icon_versions[id]
    if (exists!=null && exists.icon===icon&&exists.version===version)
      return
    this.id_changed[id]=Date.now()
    this.icon_versions[id]={icon,version}
  }
  private update_icons(tree_node:TreeNode){
    const f=(node:TreeNode)=>{ 
      const {id,icon,icon_version}=node
      this.set_icon_version(id,icon,icon_version) //for the side effect of updating id_chaned
      update_child_html(document.body,`#${id}>.label_row .icon`,this.icons[icon]??'')
      update_class_name(document.body,`#${id}>.label_row .icon`,`icon ${icon}`)
      update_child_html(document.body,`#${id} .term_title_bar .icon`,` ${this.icons[icon]??''}&nbsp;&nbsp;&nbsp;${icon}`)
      update_class_name(document.body,`#${id} .term_title_bar .icon`,`icon ${icon}`)
      
      node.children.map(f)
    }
    f(tree_node)
  }
  animate(tree_node:TreeNode){
    //do a querySelectorAll for #{id} svg
    this.update_icons(tree_node)
    const now=Date.now()
    for (const [id,time] of Object.entries(this.id_changed)){ //animate
      const selector=`#${id} .icon`   
      const elements = document.querySelectorAll<SVGElement>(selector);
      for ( const el of elements){ 
        const timeOffset=(now-time)/1000
        if (timeOffset>4)
          continue
        const {icon}=this.icon_versions[id]!

        el.style.boxShadow=calc_box_shadow(icon,timeOffset)
      }
    }
  }
}