import type {WebviewMessage} from '../../src/extension.js'
import type {s2t} from '@yigal/base_types'
import { Terminal,type ILink, type ILinkProvider } from '@xterm/xterm';
import {query_selector,create_element,get_parent_by_class,update_child_html,CtrlTracker,path_join,vscode} from './dom_utils.js'
import {TreeControl,type TreeDataProvider,type TreeNode} from './tree_control.js';
import type { Folder,Runner,State} from '../../src/data.js';
import * as parser from '../../src/parser.js';
import type {RunnerReport} from '../../src/monitor.js';  
import ICONS_HTML from '../resources/icons.html'


export interface FileLocation {
  file: string;
  row: number;
  col: number;
}
export function post_message(msg:WebviewMessage){
  vscode.postMessage(msg)
}
export function calc_runner_status(report:RunnerReport ,runner:Runner):{
    version: number;
    state: State;
}{
  const runs=report.runs[runner.id]??[]
  if (runs.length===0)
    return{version:0,state:'ready'}
  const {end_time,run_id:version,exit_code,start_time}=runs.at(-1)!
  if (end_time==null){
    if (Date.now()-start_time<2000)
      return {version,state:'running'}
    return {version,state:'longrunning'}
  }
  if (exit_code===0)
    return {version,state:'done'}
  return {version,state:'error'}
}
