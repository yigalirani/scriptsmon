import { s2t} from '@yigal/base_types'
type MaybePromise<T>=T|Promise<T>
export function query_selector(el:HTMLElement,selector:string){
    const ans=el.querySelector(selector);
    if (ans==null ||  !(ans instanceof HTMLElement))
      throw new Error('selector not found or not html element')  
    return ans
}
export interface TreeNode{
  type:'item'|'folder'
  label:string,
  id: string;
  icon?: string
  description?: string
  commands:string[]
  children: TreeNode[]
}

function make_empty_tree_folder():TreeNode{
  return{
    type:'folder',
    children:[],
    label:'',
    id:'roottreenode',
    commands:[]  
  }
}
export interface TreeDataProvider<T>{
  convert: (root:T)=>TreeNode
  command:(item:T,command:string)=>MaybePromise<void>
}

function create_element(html:string,parent?:HTMLElement){
  const template = document.createElement("template")
  template.innerHTML = html.trim()
  const ans = template.content.firstElementChild as HTMLElement;
  if (parent!=null)
    parent.appendChild(ans)
  return ans
}

import isEqual from "lodash.isequal";
function divs(vals:s2t<string|undefined>){
  const ans=[]
  for (const [k,v] of Object.entries(vals))
    if (v!=null&&v!=='')
      ans.push(`<div class="${k}">${v}</div>`)
  return ans.join('')
}

function get_parent_by_class(el:HTMLElement,className:string){
  let ans:HTMLElement|null=el
  while(ans!=null){
    ans=ans.parentElement as HTMLElement
    if (ans!=null&&ans.classList.contains(className))
      return ans    
  }
  return null
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
    return get_parent_by_class(selected,'tree_folder')
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
    const parent=get_parent_by_class(cur,'tree_folder')
    if (parent==null)
      return null
    const ans=get_next_selected(parent)
    if (ans!=null)
      return ans
    cur=parent
  }
  return get_next_selected(selected)
  //return a
  //if (ans==null)
  //  return get_parent_by_class(selected,'tree_folder')
}


function remove_class(el:HTMLElement,className:string){
  el.querySelectorAll('.selected').forEach(x => x.classList.remove(className))      
}

export class TreeControl<T>{
  public base_uri=''
  //selected:string|boolean=false
  last_root:T|undefined
  last_converted:TreeNode=make_empty_tree_folder()
  //collapsed_set:Set<string>=new Set()
  create_node_element(node:TreeNode,margin:number,parent?:HTMLElement){
    const {type,id,description,label,icon='undefined',commands}=node
    const template = document.createElement("template")
    const style=''//this.collapsed_set.has(id)?'style="display:none;"':''
    const children=(type==='folder')?`<div class=children ${style}></div>`:''
    const  commands_icons=commands.map(cmd=>`<div class=command_icon><img  src="${this.base_uri}/icons/${cmd}.svg"/></div>`).join('')
    return create_element(`
  <div class="tree_${type}" id="${id}" >
    <div class=label_row>
      <div class=shifter style='margin-left:${margin}px'>
        <img class=icon src="${this.base_uri}/icons/${icon}.svg"/>
        ${divs({label,description})}
      </div>
      ${divs({commands_icons})}
    </div>
    ${children}
  </div>`,parent)
  }
  on_selected_changed:(a:string)=>MaybePromise<void>=(a:string)=>undefined
  async set_selected(el:HTMLElement){
    el.classList.add('selected')
    await this.on_selected_changed(el.id)
  }
  constructor(
    public parent:HTMLElement,
    public provider:TreeDataProvider<T>
  ){
    parent.addEventListener('click',(evt)=>{
      if (!(evt.target instanceof HTMLElement))
        return
      parent.tabIndex = 0;
      parent.focus();
      const clicked=get_parent_by_class(evt.target,'label_row')?.parentElement
      if (clicked==null)
        return
      //this.selected=clicked.id
      if (clicked.classList.contains('tree_folder'))
        clicked.classList.toggle('collapsed')
      remove_class(parent,'selected')
      void this.set_selected(clicked)
    })
    parent.addEventListener('keydown',(evt)=>{
      if (!(evt.target instanceof HTMLElement))
        return
      console.log(evt.key)
      const selected=parent.querySelector('.selected')
      if (!(selected instanceof HTMLElement))
        return
      switch(evt.key){
        case 'ArrowUp':{
          const prev=element_for_up_arrow(selected)
          if (prev==null)
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
      const new_parent=this.create_node_element(node,depth*20,parent)
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
    const is_equal=isEqual(converted,this.last_converted)
    this.last_root=root
    if (is_equal)
      return
    this.parent.innerHTML = '';
    this.create_node(this.parent,converted,0) //todo pass the last converted so can do change/cate animation
    this.last_converted=converted

  }

}