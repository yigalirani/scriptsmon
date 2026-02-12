import  { type s2s,toggle_set} from '@yigal/base_types'
import {get_parent_by_class,create_element,divs,get_parent_by_classes,update_class_name,update_child_html} from './dom_utils.js'
import {
  type TreeNode,
  type TreeDataProvider,
  element_for_up_arrow,
  element_for_down_arrow,
  need_full_render
}from './tree_internals.js'
export type {TreeDataProvider,TreeNode}
export class TreeControl{
  //private root:unknown
  private collapsed=new Set<string>()
  private selected_id=''
  private converted:TreeNode|undefined
  private calc_node_class(node:TreeNode){
    const {id,type,toggles}=node    
    const ans=new Set<string>([`tree_${type}`])
    for (const k of this.provider.toggle_order){
      const cls=`${k}_${toggles[k]}`
      ans.add(cls)
    } 
    if (this.selected_id===id)
      ans.add('selected')
    if (this.collapsed.has(id))
      ans.add('collapsed')
    return [...ans].join(' ')
  }
  on_interval(){
    const f=(a:TreeNode)=>{
      const {id,children}=a
      const new_class=this.calc_node_class(a)
      update_class_name(this.parent,`#${id}`,new_class)
      children.map(f)
    }
    if (this.converted)
      f(this.converted)
    for (const toggle of  this.provider.toggle_order){
      for (const state of [true,false,undefined]){
        const selector=`.${toggle}_${state}>.label_row #${toggle}.toggle_icon`
        const icon_name=`${toggle}_${state}`
        update_child_html(this.parent,selector,this.icons[icon_name]??'')
      }
    }
    //update_child_html(this.parent,".label_row .tree_checkbox",check_svg)
    //update_child_html(this.parent,".chk_unchecked>.label_row .tree_checkbox",'')
  }
  //collapsed_set:Set<string>=new Set()
  private create_node_element(node:TreeNode,margin:number,parent?:HTMLElement){
    const {icons}=this
    const {type,id,description,label,icon,commands,tags}=node
    const children=(type==='folder')?`<div class=children></div>`:''
    const  commands_icons=commands.map(x=>`<div class=command_icon id=${x}>${icons[x]}</div>`).join('')
    const  toggles_icons=this.provider.toggle_order.map(x=>`<div class="toggle_icon" id=${x}></div>`).join('')
    const node_class=this.calc_node_class(node)
    const vtags=tags.map(x=>`<div class=tag>${x}</div>`).join('')
    const ans= create_element(` 
  <div  class="${node_class}" id="${id}" >
    <div  class="label_row">
      ${divs({toggles_icons})}
      <div  class=shifter style='margin-left:${margin}px'>
        <div class="icon background ${icon}">${icons[icon]}</div>
        ${divs({label,vtags,description})}
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
    await this.provider.selected(id)
  }
  private command_clicked(evt:Event){
    if (evt.target==null)
      return false
    const command_icon=get_parent_by_classes(evt.target as HTMLElement,['command_icon','toggle_icon'])
    if (command_icon==null)
      return false
    const command=command_icon.id
    if (command==null)
      return false
    const item=get_parent_by_classes(evt.target as HTMLElement,['tree_item','tree_folder'])
    if (item==null||this.converted==null)
      return false
    const id=item.id
    void this.provider.command(id,command)
    return true
  }

  constructor(
    private parent:HTMLElement,
    private provider:TreeDataProvider,
    private icons:s2s
  ){
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
  private big_render(converted:TreeNode){
    this.parent.innerHTML = '';
    this.create_node(this.parent,converted,0) //todo pass the last converted so can do change/cate animation    
  }
  on_data(converted:TreeNode){
    //const converted=this.provider.convert(root)
    //this.root=root
    if (need_full_render(converted,this.converted))
      this.big_render(converted)
    this.converted=converted
  }
}