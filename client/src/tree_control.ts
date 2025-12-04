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
    if (v!=null)
      ans.push(`<div class="${k}">${v}</div>`)
  return ans.join('')
}

function get_parent_by_class(el:HTMLElement,className:string){
  let ans:HTMLElement|null=el
  while(ans!=null){
    if (ans.classList.contains(className))
      return ans
    ans=ans.parentElement
  }
  return null
}
export class TreeControl<T>{
  public base_uri=''
  //selected:string|boolean=false
  last_root:T|undefined
  last_converted:TreeNode=make_empty_tree_folder()
  //collapsed_set:Set<string>=new Set()
  create_node_element(node:TreeNode,margin:number,parent?:HTMLElement){
    const {type,id,description,label,icon='undefined'}=node
    const template = document.createElement("template")
    const style=''//this.collapsed_set.has(id)?'style="display:none;"':''
    const children=(type==='folder')?`<div class=children ${style}></div>`:''
    return create_element(`
  <div class="tree_${type}" id="${id}" >
    <div class=label_row>
      <div class=shifter style='margin-left:${margin}px'>
        <img class=icon src="${this.base_uri}/icons/${icon}.svg"/>
        ${divs({label,description})}
      </div>
    </div>
    ${children}
  </div>`,parent)
  }  
  constructor(
    public parent:HTMLElement,
    public provider:TreeDataProvider<T>
  ){
    parent.addEventListener('click',(evt)=>{
      if (!(evt.target instanceof HTMLElement))
        return
      const clicked=get_parent_by_class(evt.target,'label_row')?.parentElement
      if (clicked==null)
        return
      //this.selected=clicked.id
      if (clicked.classList.contains('tree_folder'))
        clicked.classList.toggle('collapsed')
      parent.querySelectorAll('.selected').forEach(x => x.classList.remove('selected'))
      clicked.classList.add('selected')
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