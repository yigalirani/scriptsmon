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
export function calc_last_run(report:RunnerReport,runner:Runner){
  const runs=report.runs[runner.id]??[]
  return runs.at(-1)
}
export function calc_runner_status(report:RunnerReport ,runner:Runner):{
    version: number;
    state: State;
}{
  const last_run=calc_last_run(report,runner)
  if (last_run==null)
    return{version:0,state:'ready'}
  const {end_time,run_id:version,exit_code,start_time,stopped}=last_run
  if (end_time==null){
    if (Date.now()-start_time<2000)
      return {version,state:'running'}
    return {version,state:'longrunning'}
  }
  if (stopped)
    return {version,state:'stopped'}

  if (exit_code===0)
    return {version,state:'done'}
  return {version,state:'error'}
}
