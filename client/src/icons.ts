import type {TreeNode} from './tree_internals.js'
import {post_message} from './common.js'
import {update_child_html,update_class_name,get_parent_by_classes,get_parent_id} from './dom_utils.js'
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
function deceleratingMap(x:number) { //ai genrated lol
  // 1. Constrain input and normalize to 0.0 - 1.0 range
  const t = Math.min(Math.max(x / 2, 0), 1);

  // 2. Apply Quadratic Ease-Out formula
  // This starts fast and slows down as it approaches 1
  const easeOut = 1 - (1 - t) * (1 - t);

  // 3. Map to output range (10 to 0)
  // When easeOut is 0, result is 10. When easeOut is 1, result is 0.
  return 10 - (easeOut * 10);
}
function calc_box_shadow(icon:string,timeOffset:number){
  function f(color:string){
    const px=deceleratingMap(timeOffset)
    return `0px 0px ${px}px ${px}px ${color}`
  }
  if (icon==='done')
    return f('rgba(0, 255, 0,.5)')
  if (icon==='error')
    return f('rgba(255, 0, 0, .5)')
  if (icon==='running')
    return f('rgba(255, 140, 0, 0.5)')
  if (icon==='stopped')
    return f('rgba(128, 0, 128, 0.5)')
  return ''
}


export class IconsAnimator{
  //icons
  private id_changed:Record<string,number>={}
  private icon_versions:Record<string,IconVersion>={}
  constructor(public icons:Record<string,string>){
    document.body.addEventListener('click',this.on_click)
  }
  on_click=(evt:MouseEvent)=>{
    if (evt.target==null)
      return false
    const command_icon=get_parent_by_classes(evt.target as HTMLElement,['command_icon','toggle_icon'])
    if (command_icon==null)
      return
    const command_name=command_icon.id
    if (command_name==null)
      return
    
    const id=get_parent_id(command_icon) //Argument of type 'HTMLElement | null' is not assignable to parameter of type 'HTMLElement'. why
    if (id==null)
      return
    post_message({
      command: "command_clicked",
      id,
      command_name
    })    
    evt.stopImmediatePropagation();

  }
  private set_icon_version(id:string,icon:string,version:number){ //call mutuple time, one for each id
    const exists=this.icon_versions[id]
    if (exists!=null && exists.icon===icon&&exists.version===version)
      return
    this.id_changed[id]=Date.now()
    this.icon_versions[id]={icon,version}
  }
  private calc_icon(k:string,v:boolean|undefined){
    if (v===undefined)
      return ''
    return this.icons[`${k}_${v}`]
  }
  private update_icons(tree_node:TreeNode){
    const f=(node:TreeNode)=>{ 
      const {id,icon,icon_version,commands}=node
      this.set_icon_version(id,icon,icon_version) //for the side effect of updating id_chaned
      const toggles=Object.entries(node.toggles).map(([k,v])=>`<div class='toggle_icon' id=${k}>${this.calc_icon(k,v)}</div>`).join('') 
      const commands_icons=commands.map(x=>`<div class=command_icon id=${x}>${this.icons[x]}</div>`).join('')
      const top=`#${id} > :not(.children)`
      update_child_html(document.body,`${top} .icon:not(.text)`,this.icons[icon]??'') //set the svg
      update_child_html(document.body,`${top} .icon.text`,` ${this.icons[icon]??''}&nbsp;&nbsp;&nbsp;${icon}`) ////set the svg +text
      update_child_html(document.body,`${top} .toggles_icons`,toggles)
      update_child_html(document.body,`${top} .commands_icons`,commands_icons)
      update_class_name(document.body,`${top} .icon.text`,`icon text ${icon}`) 
      update_class_name(document.body,`${top} .icon:not(.text)`,`icon ${icon}`) 
      
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