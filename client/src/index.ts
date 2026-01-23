
import type {WebviewMessage} from '../../src/extension.js'
import {query_selector,ctrl} from './dom_utils.js'
import {TreeControl,type TreeDataProvider,type TreeNode} from './tree_control.js';
import type { Folder,Runner,FolderError} from '../../src/data.js';
import * as parser from '../../src/parser.js';
import type {RunnerReport} from '../../src/monitor.js';  
import {post_message,calc_runner_status} from './common.js'
import ICONS_HTML from '../resources/icons.html'
import {make_terminals} from './terminals.js'

function convert(report:RunnerReport):TreeNode{
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

function make_provider(terminals:ReturnType<typeof make_terminals>):TreeDataProvider<RunnerReport>{
  return {
    toggle_order:['watched'],
    convert,
    command(root,id,command_name,){
      post_message({
        command: "command_clicked",
        id,
        command_name
      })
    },
    icons_html:ICONS_HTML, 
    animated:'.running,.done .check,.error .check',
    selected(report,id){
      terminals.set_selected(id)
      const base=parser.find_base(report.root,id)
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
}
function start(){
  console.log('start')
  const terminals=make_terminals()
  let base_uri=''
  const provider=make_provider(terminals)
  const tree=new TreeControl(query_selector(document.body,'#the_tree'),provider) //no error, whay
  let report:RunnerReport|undefined
  window.addEventListener('message',  (event:MessageEvent<WebviewMessage>) => {
      const message = event.data;
      switch (message.command) {
          case 'RunnerReport':{
            terminals.render(message)
            report=message
            base_uri=message.base_uri
            tree.render(message,base_uri)
            break
          }
          case 'set_selected':
            //upda(document.body,'#selected', message.selected)
            void provider.selected(report!,message.selected)
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
