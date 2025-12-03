import { s2t} from '@yigal/base_types'
type MaybePromise<T>=T|Promise<T>
export function query_selector(el:HTMLElement,selector:string){
    const ans=el.querySelector(selector);
    if (ans==null ||  !(ans instanceof HTMLElement))
      throw new Error('selector not found or not html element')  
    return ans
}
interface Treecommon{
  label:string,
  id: string;
  icon?: string
  description?: string
  commands:string[]
}
export interface TreeItem extends Treecommon{
  type:'item'
}

interface TreeFolder extends Treecommon{
  type:'folder',
  children: TreeNode[]
}
export type TreeNode=TreeItem|TreeFolder
function make_empty_tree_folder():TreeFolder{
  return{
    type:'folder',
    children:[],
    label:'',
    id:'root',
    commands:[]  
  }
}
export interface TreeDataProvider<T>{
  convert: (root:T)=>TreeNode
  command:(item:T,command:string)=>MaybePromise<void>
}
import isEqual from "lodash.isequal";
function divs(vals:s2t<string|undefined>){
  const ans=[]
  for (const [k,v] of Object.entries(vals))
    if (v!=null)
      ans.push(`<div class="${k}">${v}</div>`)
  return ans.join('')
}
export class TreeControl<T>{
  selected:string|undefined
  last_root:T|undefined
  last_converted:TreeNode=make_empty_tree_folder()
  collapsed_id:Set<string>=new Set()
  create_node_element(node:TreeNode){
    const {type,id,description,label}=node
    const template = document.createElement("template")
    const style=this.collapsed_id.has(id)?'style="display:none;"':''
    const children=(type==='folder')?`<div class=children ${style}></div>`:''
    template.innerHTML = `
  <div class="tree_${type}" id="${id}" >
    ${divs({label,description})}
    ${children}
  </div>
    `.trim();
    const element = template.content.firstElementChild as HTMLElement;
    return element
  }  
  constructor(
    public parent:HTMLElement,
    public provider:TreeDataProvider<T>
  ){}
  create_node(parent:HTMLElement,node:TreeNode){ //todo: compare to last by id to add change animation?
    const el=this.create_node_element(node)
    parent.appendChild(el)
    if (node.type==='item'){
      return
    }
    const children_el=query_selector(el,'.children')
    for (const x of node.children){
      this.create_node(children_el,x)
    }
    
  }
  render(root:T){
    /*convert, comapre and if there is a diffrence rebuilt the content of the parent*/
    const converted=this.provider.convert(root)
    const is_equal=isEqual(converted,this.last_converted)
    this.last_root=root
    if (is_equal)
      return
    this.parent.innerHTML = '';
    this.create_node(this.parent,converted) //todo pass the last converted so can do change/cate animation
    this.last_converted=converted

  }

}