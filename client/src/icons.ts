import type {TreeNode} from './tree_internals.js'
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
      this.set_icon_version(id,icon,icon_version)
      node.children.map(f)
    }
    f(tree_node)
  }
  animate(tree_node:TreeNode){
    //do a querySelectorAll for #{id} svg
    this.update_icons(tree_node)
    const now=Date.now()
    for (const [id,time] of Object.entries(this.id_changed)){ //animate
      const selector=`#${id} .animated`   
      const element = document.querySelectorAll<SVGElement>(selector);
      for ( const anim of element){ 
        const timeOffset=(now-time)/1000
        if (timeOffset>2)
          continue
        const animation_delay=`-${timeOffset}s`
        //console.log(id,animation_delay)          
        anim.style.animationDelay = animation_delay;
      }
    }
    this.id_changed={}
  }
}