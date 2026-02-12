
import type {WebviewMessage} from '../../src/extension.js'
import {query_selector,ctrl} from './dom_utils.js'
import {TreeControl,type TreeDataProvider,type TreeNode} from './tree_control.js';
import type { Folder,Runner,FolderError} from '../../src/data.js';
import * as parser from '../../src/parser.js';
import type {RunnerReport} from '../../src/monitor.js';  
import {post_message,calc_runner_status} from './common.js'
import ICONS_HTML from '../resources/icons.html'
import {Terminals} from './terminals.js'
import {IconsAnimator,parse_icons} from './icons.js'

function the_convert(_report:unknown):TreeNode{
  const report=_report as RunnerReport //deliberatly makes less strok typen
  function convert_runner(runner:Runner):TreeNode{
      const {script,id,name,effective_watch,tags}=runner
      const watched=function(){
        if (effective_watch.length===0)
          return "missing"
        return report.monitored.includes(id)
      }()
      const {version,state}=calc_runner_status(report,runner)
      //const className=(watched?'watched':undefined
      return {
        type:'item',
        id,
        label:name,
        commands:['play','debug'], 
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
  //convert=the_convert
  report:RunnerReport|undefined
  command(id:string,command_name:string){//Parameter 'command_name' implicitly has an 'any' type.ts(7006) why
    post_message({
      command: "command_clicked",
      id,
      command_name
    })
  }
  icons_html=ICONS_HTML
  selected(id:string){
    this.terminals.set_selected(id)
    const base=parser.find_base(this.report!.root,id)
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

function start(){
  console.log('start')
  const terminals=new Terminals()
  // /let base_uri=''
  const provider=new TheTreeProvider(terminals)
  const icons=parse_icons(ICONS_HTML)
  const icons_animator=new IconsAnimator(icons)
  const tree=new TreeControl(query_selector(document.body,'#the_tree'),provider,icons) //no error, whay
 
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
            const tree_node=the_convert(message)
            //base_uri=message.base_uri
            tree.on_data(tree_node)
            icons_animator.animate(tree_node)
            
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
