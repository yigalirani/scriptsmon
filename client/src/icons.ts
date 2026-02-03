export function parseIcons(html: string): Record<string, string> {
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
export class Icons{
  icons
  id_changed:Record<string,number>={}
  icon_versions:Record<string,IconVersion>={}
  constructor(public icons_html:string){
    this.icons=parseIcons(icons_html)
  }
  set_icon_version(id:string,icon:string,version:number){
    const exists=this.icon_versions[id]
    if (exists!=null && exists.icon===icon&&exists.version===version)
      return
    this.id_changed[id]=Date.now()
    this.icon_versions[id]={icon,version}
  }

  animate(){
    //do a querySelectorAll for #{id} svg
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