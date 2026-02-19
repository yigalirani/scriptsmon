import type {WebviewMessage} from '../../src/extension.js'
import {vscode} from './dom_utils.js'
import type {RunnerReport,Run, Runner,State} from '../../src/data.js';


export interface FileLocation {
  file: string;
  row: number;
  col: number;
}
export function post_message(msg:WebviewMessage){
  vscode.postMessage(msg)
}
export function calc_runner_status(report:RunnerReport ,runner:Runner,last_run?:Run):{
    version: number;
    state: State;
}{
  if (last_run==null)
    return{version:0,state:'ready'}
  const {end_time,run_id:version,exit_code,start_time}=last_run
  if (end_time==null){
    if (Date.now()-start_time<2000)
      return {version,state:'running'}
    return {version,state:'longrunning'}
  }
  if (exit_code===0)
    return {version,state:'done'}
  return {version,state:'error'}
}
