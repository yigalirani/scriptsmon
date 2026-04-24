import {strip_ansi} from './terminals_ansi.js'
import type {WebviewMessage} from '../../src/extension.js'
import {vscode} from './dom_utils.js'
import type {RunnerReport,Runner,State} from '../../src/data.js';


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
    return{version:0,state:'Ready'}
  const {end_time,run_id:version,exit_code,stopped,last_k}=last_run
  if (end_time==null){
      return {version,state:'Running'}
  }
  if (stopped) 
    return {version,state:'Stopped'}

  if (exit_code===0){
    const {plain_text}=strip_ansi(last_k,{
      foreground:undefined,
      background:undefined,
      font_styles: new Set()
    })
    if (plain_text.match(/\d+\s+warnings/gi)!=null)
      return {version,state:'Warning'}
    return {version,state:'Done'}
  }
  return {version,state:'Error'}
}

