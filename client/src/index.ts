
import type {WebviewMessage} from '../../src/extension.js'
import {query_selector,ctrl,update_child_html} from './dom_utils.js'
import {TreeControl,type TreeDataProvider,type TreeNode} from './tree_control.js';
import type { Folder,Runner,FolderError,RunnerReport} from '../../src/data.js';
import {find_base} from '../../src/parser.js';
import {post_message,calc_runner_status} from './common.js'
import ICONS_HTML from '../resources/icons.html'
import {Terminals} from './terminals.js'
import {IconsAnimator,parse_icons} from './icons.js'

function the_convert(report:RunnerReport):TreeNode{
  function convert_runner(runner:Runner):TreeNode{
      const {script,id,name,effective_watch,tags}=runner
      const watched=function(){
        if (effective_watch.length===0)
          return
        return report.monitored.includes(id)
      }()
      const {version,state}=calc_runner_status(report,runner)
      //const className=(watched?'watched':undefined
      return {
        type:'item',
        id,
        label:name,
        commands:['play','stop'], 
        children:[],
        description:script,
        icon:state,
        icon_version:
        version,
        className:undefined,
        toggles: {watched},
        tags
        //default_checkbox_state: effective_watch.length>0||undefined
    }
  }
  function convert_error(root:FolderError):TreeNode{
      const {id,message}=root
      return {
        type:"item",
        id,
        label:message,
        children:[],
        icon:"syntaxerror",
        icon_version:1,
        commands:[],
        className:"warning",
        toggles: {},
        tags:[]
    }

  }  
  function convert_folder(root:Folder):TreeNode{
      const {name,id}=root
      const folders=root.folders.map(convert_folder)
      const items=root.runners.map(convert_runner)
      const errors=root.errors.map(convert_error)  
      const children=[...folders,...items,...errors]
      const icon=errors.length===0?'folder':'foldersyntaxerror'
      return {
        children,
        type:'folder',
        id,label:name,
        commands:[],
        icon,
        icon_version:0,
        className:undefined,
        toggles: {},
        tags:[]
      }
  }
  return convert_folder(report.root)
}

class TheTreeProvider implements TreeDataProvider{
  constructor(public terminals:Terminals){}
  toggle_order=['watched']
  report:RunnerReport|undefined
  command(id:string,command_name:string){//Parameter 'command_name' implicitly has an 'any' type.ts(7006) why
    post_message({
      command: "command_clicked",
      id,
      command_name
    })
  }
  //icons_html=ICONS_HTML
  selected(id:string){
    this.terminals.set_selected(id)
    const base=find_base(this.report!.root,id)
    if (base==null||base.pos==null)
      return
    if (base.need_ctl&&!ctrl.pressed)
      return
    const {pos}=base
    post_message({
      command: "command_open_file_pos",
      pos
    })
  }
}
function save_width(_width:string){
}
function attach_splitter(){
  const splitter = document.querySelector<HTMLElement>('#splitter');

  const left_panel = document.querySelector<HTMLElement>('.container');
  if (splitter==null||left_panel==null){
    console.warn('splitter the_tree is null')
    return
  }  
  let orig_width = left_panel.offsetWidth //i want width to be int
  let offset=0
  let is_resizing = false;

  // Start dragging
  splitter.addEventListener('pointerdown', (e) => { //type of e is Event and not MouseEvent, why?
      is_resizing = true;
      const {target,pointerId}=e
      if (!(target instanceof HTMLElement))
        return
      orig_width = left_panel.offsetWidth
      target.setPointerCapture(pointerId);
      offset=orig_width-e.clientX
  });
  

  document.addEventListener('pointermove', (e) => {
      if (!is_resizing) return;
      const new_width=function(){
        const { clientX,target } = e;
        const new_width=clientX+offset
        if (!(target instanceof HTMLElement)||target.parentElement==null)
          return
        const {clientWidth:parent_width}=target.parentElement
        //console.log('parent_width',parent_width)
        if (new_width<100)
          return 100
        if (new_width>parent_width-100) //todo: run this limit also when parent resize
          return parent_width-100
        return new_width
      }()
      if (new_width==null)
        return
      left_panel.style.width = `${new_width}px`
      //for (const child of left_panel.children) //this trix was need for mousemove, but noy for pointer move
        //child.scrollLeft=0
        
  });

  // Stop dragging
  document.addEventListener('pointerup', (e) => {
      const {target,pointerId}=e
      if (!(target instanceof HTMLElement)||!is_resizing)
        return
      target.releasePointerCapture(pointerId);
      is_resizing = false;
      document.body.style.cursor = 'default';
      
      // Save the final width to VS Code state
      const { width } = left_panel.style;
      save_width(width);
  })
}
function collect_tags(report:RunnerReport){
  const ans=new Set<string>
  function f(folder:Folder){
    folder.folders.map(f)
    folder.runners.forEach(runner=>{
      runner.tags.map(x=>ans.add(x))
    })
  }
  f(report.root)
  return [...ans]
}
function make_selector(report:RunnerReport){
  const tags_options=collect_tags(report).map(x=>`<option value="#${x}">#${x}</option>`)
  return `<select name="status_filter" class="vscode_selector">
  <option value="all">All</option>
  <option value="watchables">Watchables</option>
  <option value="watching">Watching now</option>
  <option value="watching">Started</option>
  <option value="errors_warnings">With errors/warnnings</option>
  ${tags_options}
</select>`
}
function start(){
  attach_splitter()
  console.log('start')
  const terminals=new Terminals()
  // /let base_uri=''
  const provider=new TheTreeProvider(terminals)
  const icons=parse_icons(ICONS_HTML)
  const icons_animator=new IconsAnimator(icons,["watched","play","stop"])
  const container:HTMLElement=query_selector(document.body,'#the_tree')
    window.addEventListener('focus', () => {
      post_message({command:'view_focus',val:true})
    });

    window.addEventListener('blur', () => {
      post_message({command:'view_focus',val:false})
    });  
  const tree=new TreeControl(container,provider,icons) //no error, whay
 
  function on_interval(){
    tree.on_interval()
    terminals.on_interval()
  }
  setInterval(on_interval,100)
  window.addEventListener('message',  (event:MessageEvent<WebviewMessage>) => {
      const message = event.data;
      switch (message.command) {
          case 'RunnerReport':{
            provider.report=message            
            terminals.on_data(message)
            const tree_selector=make_selector(message)
            update_child_html(document.body,'#tree_selector',tree_selector)
            const tree_node=the_convert(message)
            //base_uri=message.base_uri
            tree.on_data(tree_node)
            icons_animator.animate(tree_node)
            
            break
          }
          case 'search_command':{
            const search=terminals.get_search()
            const {subcommand}=message
            if (search!=null)
              search.search_command(subcommand)
            break
          }
      
          case 'set_selected':
            //upda(document.body,'#selected', message.selected)
            provider.selected(message.selected)
            break
          default:
            console.log(`unexpected message ${message.command}`)
            break
      }
  });
}
start()
const el = document.querySelector('.terms_container');
console.log(el)
