import  type { s2t,MaybePromise} from '@yigal/base_types'
import {get_parent_by_class} from './dom_utils.js'
export interface TreeNode{
  type                   : 'item'|'folder'   //is this needed?
  label                  : string,
  id                     : string;
  icon                   : string
  className              : string|undefined
  description           ?: string
  commands               : string[]          //hard codded commmand: checkbox clicked
  children               : TreeNode[]
  icon_version           : number,
  toggles                : Record<string,boolean|"missing">
  tags:                  string[]
  //checkbox_state         : boolean|undefined
  //default_checkbox_state : boolean|undefined
}
export interface TreeDataProvider{
  toggle_order:Array<string>
  //convert: (root:unknown)=>TreeNode
  command:(id:string,command_name:string)=>MaybePromise<void>
  selected:(id:string)=>MaybePromise<void>
  icons_html:string
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
  const ignore=['icon_version','icon','toggles','className']
  function replacer(k:string,v:unknown){
    if (ignore.includes(k))
      return ''
    return v
  }
  return JSON.stringify(node,replacer,2)//⚠ Error (TS2769)
}
export function need_full_render(root:TreeNode,old_root:TreeNode|undefined){
  if (old_root==null)
    return true
  const summary=calc_summary(root)
  const old_summary=calc_summary(old_root)
  return (old_summary!==summary)
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
export function element_for_up_arrow(selected:HTMLElement){
  const ans=get_prev_selected(selected)
  if (ans==null)
    return get_parent_by_class(selected.parentElement,'tree_folder')
  return get_last_visible(ans)
}
export function element_for_down_arrow(selected:HTMLElement){
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