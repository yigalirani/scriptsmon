interface VSCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}
import type {WebviewMessage} from '../../src/extension.js'
import {CtrlTracker} from './dom_utils.js'
import type { Runner} from '../../src/data.js';
import type {RunnerReport} from '../../src/monitor.js';  
declare function acquireVsCodeApi(): VSCodeApi;
const vscode = acquireVsCodeApi();
export interface FileLocation {
  file: string;
  row: number;
  col: number;
}
export function post_message(msg:WebviewMessage){
  vscode.postMessage(msg)
}
export const ctrl=new CtrlTracker()

export function formatElapsedTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const milliseconds = ms % 1000;
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  const pad2 = (n: number) => n.toString().padStart(2, '0');
  const pad3 = (n: number) => n.toString().padStart(3, '0');
  const time =
    hours > 0
      ? `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`
      : `${pad2(minutes)}:${pad2(seconds)}`;
  return `${time}<span class=ms>.${pad3(milliseconds)}</span>`;
}

export function calc_runner_status(report:RunnerReport ,runner:Runner){
  const runs=report.runs[runner.id]||[]
  if (runs.length===0)
    return{version:0,state:'ready'}
  const {end_time,run_id:version,exit_code}=runs.at(-1)!
  if (end_time==null)
    return {version,state:'running'}
  if (exit_code===0)
    return {version,state:'done'}
  return {version,state:'error'}
}

export function default_get<T>(obj:Record<PropertyKey,T>,k:PropertyKey,maker:()=>T){
  const exists=obj[k]
  if (exists==null){
    obj[k]=maker()
  }
  return obj[k]
}