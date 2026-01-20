import  { type s2t,type s2s,toggle_set,type MaybePromise} from '@yigal/base_types'
import {get_parent_by_class,create_element,divs,get_parent_by_classes,update_class_name,update_child_html} from './dom_utils.js'
export interface TreeNode{
  type                   : 'item'|'folder'   //is this needed?
  label                  : string,
  id                     : string;
  icon                   : string
  className              : string|undefined
  description           ?: string
  commands               : string[]          //hard codded commmand: checkbox clicked
  children               : TreeNode[]
  icon_version           : number
  checkbox_state         : boolean|undefined
  default_checkbox_state : boolean|undefined
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
      if (name!=null) {
        result[name] = content
      }
    }
  });
  const iconnames=Object.keys(result)
  console.log({iconnames})
  return result;
}
interface Toggle{
  name:string
  on:string
  off:string
  none:string
}
export interface TreeDataProvider<T>{
  //toggle:Array<Toggle>
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
  const ignore=['icon_version','icon','checkbox_state','className','description']
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
  const summary=calc_summary(root)
  const old_summary=calc_summary(old_root)
  if (old_summary!==summary){
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
  const ans= selected.querySelector('.children')//by thoernm is an HTMLElement
  if (ans!=null)
    return ans as HTMLElement 

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
}
const check_svg=`<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M13.6572 3.13573C13.8583 2.9465 14.175 2.95614 14.3643 3.15722C14.5535 3.35831 14.5438 3.675 14.3428 3.86425L5.84277 11.8642C5.64597 12.0494 5.33756 12.0446 5.14648 11.8535L1.64648 8.35351C1.45121 8.15824 1.45121 7.84174 1.64648 7.64647C1.84174 7.45121 2.15825 7.45121 2.35351 7.64647L5.50976 10.8027L13.6572 3.13573Z"/></svg>`
export class TreeControl<T>{
  private base_uri=''
  private icons:s2s
  private root:T|undefined
  private id_last_changed:Record<string,number>={}
  private collapsed=new Set<string>()
  private selected_id=''
  private converted:TreeNode|undefined
  private id_to_class:Record<string,string>={}
  private calc_node_class(node:TreeNode){
    const ans=new Set<string>([`tree_${node.type}`])
    const {checkbox_state,default_checkbox_state,id}=node
    if (this.selected_id===id)
      ans.add('selected')
    if (default_checkbox_state!=null)
      ans.add('chk_visible')
    if (default_checkbox_state!==checkbox_state)
      ans.add('chk_different')
    if (checkbox_state===true)
      ans.add('chk_checked')
    else
      ans.add('chk_unchecked')
    if (this.collapsed.has(id))
      ans.add('collapsed')
    return [...ans].join(' ')
  }
  private apply_classes(){
    const f=(a:TreeNode)=>{
      const {id,children}=a
      const new_class=this.calc_node_class(a)
      if (this.id_to_class[id]!==new_class){
        this.id_to_class[id]=new_class
        update_class_name(this.parent,`#${id}`,new_class)
      }
      children.map(f)
    }
    if (this.converted)
      f(this.converted)
    update_child_html(this.parent,".chk_checked>.label_row .tree_checkbox",check_svg)
    update_child_html(this.parent,".chk_unchecked>.label_row .tree_checkbox",'')
  }
  //collapsed_set:Set<string>=new Set()
  private create_node_element(node:TreeNode,margin:number,parent?:HTMLElement){
    const {icons}=this
    const {type,id,description,label,icon,commands}=node
    const children=(type==='folder')?`<div class=children></div>`:''
    const  commands_icons=commands.map(cmd=>`<div class=command_icon id=${cmd}>${icons[cmd]}</div>`).join('')
    this.mark_changed(id)
    const node_class=this.calc_node_class(node)
    const ans= create_element(` 
  <div  class="${node_class}" id="${id}" >
    <div  class="label_row">
      <div id='checkbox_clicked' class="tree_checkbox"></div>
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
  private async set_selected(id:string){
    this.selected_id=id
    await this.provider.selected(this.root!,id)
  }
  private command_clicked(evt:Event){
    if (evt.target==null)
      return false
    const command_icon=get_parent_by_classes(evt.target as HTMLElement,['command_icon','tree_checkbox'])
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
  private mark_changed(id:string){
    this.id_last_changed[id]=Date.now()
  }
  constructor(
    private parent:HTMLElement,
    private provider:TreeDataProvider<T>
  ){
    this.icons=parseIcons(this.provider.icons_html)
    setInterval(()=>{//todo: detect if parent is dismounted and exit this interval
      this.apply_classes()
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
      const {id}=clicked
      if (!command_clicked&&clicked.classList.contains('tree_folder')) //if clicked command than don  change collpased status because dual action is annoing
        toggle_set(this.collapsed,id)
      void this.set_selected(id)
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
          void this.set_selected(prev.id)         
         break
        }
        case 'ArrowDown':{
          const prev=element_for_down_arrow(selected)
          if (prev==null)
            return
          void this.set_selected(prev.id)
          break
        }
        case 'ArrowRight':
          this.collapsed.delete(this.selected_id)
          break
        case 'ArrowLeft':
          this.collapsed.add(this.selected_id)
          break
        case 'Enter':          
        case ' ':
          toggle_set(this.collapsed,this.selected_id)
          break
      }
    })    
  }
  private create_node(parent:HTMLElement,node:TreeNode,depth:number){ //todo: compare to last by id to add change animation?
    const children_el=(()=>{
      if (depth===0)
        return create_element('<div class=children></div>',parent)
      const new_parent=this.create_node_element(node,depth*20+16+16,parent)
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
    this.base_uri=`${base_uri}/client/resources`
    const converted=this.provider.convert(root)
    //const is_equal=isEqual(converted,this.last_converted)
    this.root=root
    const change=calc_changed(converted,this.converted)
    this.converted=converted
    if (change.big){
      this.parent.innerHTML = '';
      this.create_node(this.parent,converted,0) //todo pass the last converted so can do change/cate animation
      return
    }
    for (const id of change.icons){
      const existing_svg=this.parent.querySelector<SVGElement>(`#${id} .icon svg`)
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
      update_class_name(this.parent,`#${id} .icon`,`icon background_${icon}`)
    }
    const combined=new Set([...change.icons, ...change.versions]);
    for (const id of combined){
      this.mark_changed(id)
    }
  }
}