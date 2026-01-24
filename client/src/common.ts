import type {WebviewMessage} from '../../src/extension.js'
import {vscode} from './dom_utils.js'
import type { Runner,State} from '../../src/data.js';
import type {RunnerReport} from '../../src/monitor.js';  


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
