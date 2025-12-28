import type { s2t,s2s} from '@yigal/base_types'
import {get_parent_by_class,create_element,divs,get_parent_by_classes,remove_class} from './dom_utils.js'
type MaybePromise<T>=T|Promise<T>
export interface TreeNode{
  type            : 'item'|'folder' //is this needed?
  label           : string,
  id              : string;
  icon            : string
  className       : string|undefined
  description    ?: string
  commands        : string[]
  children        : TreeNode[]
  icon_version     : number
}
function parseIcons(html: string): Record<string, string> {
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
      if (name) {
        result[name] = content
      }
    }
  });
  const iconnames=Object.keys(result)
  console.log({iconnames})
  return result;
}
export interface TreeDataProvider<T>{
  convert: (root:T)=>TreeNode
  command:(root:T,id:string,command:string)=>MaybePromise<void>
  selected:(root:T,id:string)=>MaybePromise<void>
  icons_html:string
  animated:string
}
function get_prev_selected(selected:HTMLElement){
  if (selected==null)
    return null // i like undefined better but want to have the 
  let cur:ChildNode|null=selected
  while(cur!=null){
    cur=cur.previousSibling
    if (cur instanceof HTMLElement)
      return cur
  }
  return null
}
function get_next_selected(selected:HTMLElement){
  if (selected==null)
    return null // i like undefined better but want to have the 
  let cur:ChildNode|null=selected
  while(cur!=null){
    cur=cur.nextSibling
    if (cur instanceof HTMLElement)
      return cur
  }
  return null
}
function index_folder(root:TreeNode){
  const ans:s2t<TreeNode>={}
  function f(node:TreeNode){
    ans[node.id]=node
    node.children.forEach(f)
  }
  f(root)
  return ans
}
function calc_summary(node:TreeNode):string{
  const ignore=['icon_version','icon']
  function replacer(k:string,v:unknown){
    if (ignore.includes(k))
      return ''
    return v
  }
  return JSON.stringify(node,replacer,2)//⚠ Error (TS2769)
}
function calc_changed(root:TreeNode,old_root:TreeNode|undefined){
  const versions=new Set<string>()
  const icons=new Set<string>()
  const big=true // a change that requires drawing the tree from scratch. rarely happens, obnly whewn user update theus project.json
  const new_index=index_folder(root)
  const ans={versions,icons,big,new_index}
  if (old_root==null)
    return ans
  const old_index=index_folder(old_root)
  if (calc_summary(root)!==calc_summary(old_root)){
    return ans
  }
  ans.big=false
  function f(node:TreeNode){
    const {id,children}=node                                                                                                                                                                                                                                                                   
    const old_node=old_index[id]
    if (old_node==null)
      throw new Error('old node not found')
    if (node.icon!==old_node.icon)
      icons.add(id)
    if (node.icon_version!==old_node.icon_version)
      versions.add(id)
    children.map(f)
  }
  f(root)
  return ans
}
function get_children(selected:HTMLElement){
  if (selected.classList.contains('collapsed'))
    return null
  return selected.querySelector('.children') as HTMLElement//by thoernm is an HTMLElement
}
function getLastElementChild(parent: HTMLElement): HTMLElement | null {
  // Iterate backwards through child nodes
  for (let i = parent.childNodes.length - 1; i >= 0; i--) {
    const node = parent.childNodes[i];
    if (node instanceof HTMLElement) {
      return node;
    }
  }
  return null;
}
function getFirstElementChild(parent: HTMLElement): HTMLElement | null {
  for (let i = 0;i<parent.childNodes.length; i++) {
    const node = parent.childNodes[i];
    if (node instanceof HTMLElement) {
      return node;
    }
  }
  return null;
}
function get_last_visible(selected:HTMLElement){
  const children_div=get_children(selected)
  if (children_div==null)
    return selected
  const last_child=getLastElementChild(children_div)
  if (last_child==null)
    return selected
  return get_last_visible(last_child)
}
function element_for_up_arrow(selected:HTMLElement){
  const ans=get_prev_selected(selected)
  if (ans==null)
    return get_parent_by_class(selected.parentElement,'tree_folder')
  return get_last_visible(ans)
}
function element_for_down_arrow(selected:HTMLElement){
  const children_div=get_children(selected)
  if (children_div!=null){
    const first=getFirstElementChild(children_div)
    if (first!==null)
      return first
  }
  const ans=get_next_selected(selected)
  if (ans!=null)
    return ans
  let cur=selected
  while(true){
    const parent=get_parent_by_class(cur.parentElement,'tree_folder')
    if (!(parent instanceof HTMLElement))
      return null
    const ans=get_next_selected(parent)
    if (ans!=null)
      return ans
    cur=parent
  }
  //return get_next_selected(selected)
  //return a
  //if (ans==null)
  //  return get_parent_by_class(selected,'tree_folder')
}
/*function getBaseName(path: string): string {
  // Extract last path segment
  const fileName = path.split(/[/\\]/).pop() || "";
  // Remove extension (last dot and everything after)
  const lastDot = fileName.lastIndexOf(".");
  return lastDot > 0 ? fileName.slice(0, lastDot) : fileName;
}*/
/*function is_html_element(el:Node|null){
    return el instanceof HTMLElement||el instanceof SVGElement
  }
 function begin_element(node:SVGAnimateElement){
  node.beginElement()
  console.log('node.beginElement()')
 }*/
export class TreeControl<T>{
  public base_uri=''
  icons:s2s
  root:T|undefined
  id_last_changed:Record<string,number>={}
  //selected:string|boolean=false
  //last_root:T|undefined
  last_converted:TreeNode|undefined
  //collapsed_set:Set<string>=new Set()
  create_node_element(node:TreeNode,margin:number,parent?:HTMLElement){
    const {icons}=this
    const {type,id,description,label,icon='undefined',commands,className}=node
    //const template = document.createElement("template")
    const style=''//this.collapsed_set.has(id)?'style="display:none;"':''
    const children=(type==='folder')?`<div class=children ${style}></div>`:''
    const  commands_icons=commands.map(cmd=>`<div class=command_icon id=${cmd}>${icons[cmd]}</div>`).join('')
    this.mark_changed(id)
    const ans= create_element(`
  <div  class="tree_${type} ${className||""}" id="${id}" >
    <div  class=label_row>
      <div  class=shifter style='margin-left:${margin}px'>
        <div class="icon background_${icon}">${icons[icon]}</div>
        ${divs({label,description})}
      </div>
      ${divs({commands_icons})}
    </div>
    ${children}
  </div>`,parent) 
    return ans
  }
  //on_selected_changed:(a:string)=>MaybePromise<void>=(a:string)=>undefined
  async set_selected(el:HTMLElement){
    el.classList.add('selected')
    await this.provider.selected(this.root!,el.id)
    //await this.on_selected_changed(el.id)
  }
  command_clicked(evt:Event){
    if (evt.target==null)
      return false
    const command_icon=get_parent_by_class(evt.target as HTMLElement,'command_icon')
    if (command_icon==null)
      return false
    const command=command_icon.id
    if (command==null)
      return false
    const item=get_parent_by_classes(evt.target as HTMLElement,['tree_item','tree_folder'])
    if (item==null||this.root==null)
      return false
    const id=item.id
    void this.provider.command(this.root,id,command)
    return true
  }
  mark_changed(id:string){
    this.id_last_changed[id]=Date.now()
  }
  constructor(
    public parent:HTMLElement,
    public provider:TreeDataProvider<T>
  ){
    this.icons=parseIcons(this.provider.icons_html)
    setInterval(()=>{//todo: detect if parent is dismounted and exit this interval
      for (const [id,time] of Object.entries(this.id_last_changed)){
        const selector=this.provider.animated.split(',').map(x=>`#${id} ${x}`).join(',')
        const element = parent.querySelectorAll<SVGElement>(selector);
        for ( const anim of element){ 
          const timeOffset=(Date.now()-time)/1000
          if (timeOffset>2)
            continue
          const animation_delay=`-${timeOffset}s`
          console.log(id,animation_delay)          
          anim.style.animationDelay = animation_delay;
        } 
      } 
    },100)
    parent.addEventListener('click',(evt)=>{
      if (!(evt.target instanceof Element))
        return
      parent.tabIndex = 0;
      parent.focus();
      const command_clicked=this.command_clicked(evt)
      const clicked=get_parent_by_class(evt.target,'label_row')?.parentElement
      if (clicked==null)
        return
      //this.selected=clicked.id
      if (!command_clicked&&clicked.classList.contains('tree_folder')) //if clicked command than don  change collpased status because dual action is annoing
        clicked.classList.toggle('collapsed')
      remove_class(parent,'selected')
      void this.set_selected(clicked)
    })
    parent.addEventListener('keydown',(evt)=>{
      if (!(evt.target instanceof HTMLElement))
        return
      evt.preventDefault(); // stops default browser action
      console.log(evt.key)
      const selected=parent.querySelector('.selected')
      if (!(selected instanceof HTMLElement))
        return
      switch(evt.key){
        case 'ArrowUp':{
          const prev=element_for_up_arrow(selected)
          if (! (prev instanceof HTMLElement))
            return
          remove_class(parent,'selected')   
          void this.set_selected(prev)         
         break
        }
        case 'ArrowDown':{
          const prev=element_for_down_arrow(selected)
          if (prev==null)
            return
          remove_class(parent,'selected')            
          void this.set_selected(prev)
          break
        }
        case 'ArrowRight':
          selected.classList.remove('collapsed')
          break
        case 'ArrowLeft':
          selected.classList.add('collapsed')
          break
        case 'Enter':          
        case ' ':
          selected.classList.toggle('collapsed')
          break
      }
    })    
  }
  create_node(parent:HTMLElement,node:TreeNode,depth:number){ //todo: compare to last by id to add change animation?
    const children_el=(()=>{
      if (depth===0)
        return create_element('<div class=children></div>',parent)
      const new_parent=this.create_node_element(node,16+depth*20,parent)
      return new_parent.querySelector('.children') //return value might be null for item node  
    })()
    if (children_el==null){
      return
    }
    for (const x of node.children){
      this.create_node(children_el as HTMLElement,x,depth+1)
    }
  }
  render(root:T,base_uri:string){
    /*convert, comapre and if there is a diffrence rebuilt the content of the parent*/
    this.base_uri=base_uri+'/client/resources'
    const converted=this.provider.convert(root)
    //const is_equal=isEqual(converted,this.last_converted)
    this.root=root
    const change=calc_changed(converted,this.last_converted)
    this.last_converted=converted
    if (change.big){
      this.parent.innerHTML = '';
      this.create_node(this.parent,converted,0) //todo pass the last converted so can do change/cate animation
      return
    }
    for (const id of change.icons){
      const existing_svg=this.parent.querySelector<SVGElement>(`#${id} svg`)
      if (existing_svg==null){
        console.warn(`cant find old svg for ${id}`)
        continue
      }
      if (id==null){
        console.warn('id is null')
        continue
      }
      const new_index=change.new_index[id]
      if (new_index==null)
        continue
      const icon=new_index.icon
      const new_svg=this.icons[icon]
      if (new_svg==null){
        console.warn('new_svg is null')
        continue
      }
      existing_svg.outerHTML=new_svg
      console.log(`${id}: new svg`)
      this.parent.querySelector<HTMLElement>(`#${id} .icon`)!.className=`icon background_${icon}`
    }
    const combined=new Set([...change.icons, ...change.versions]);
    for (const id of combined){
      this.mark_changed(id)
    }
  }
}