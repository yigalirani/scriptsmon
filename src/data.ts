import type{Pos} from './vscode_utils.ts'
export type {Pos}

export interface Watcher{
  watch?:string[]
  filter?:string
  pre?:string
}
export type Scriptsmon=  Record<string,Watcher|string[]>&
{
  $watch?:string[]
  watched?:string[]
}
export type State="ready"|"done"|"error"|"running"|"stopped"

export interface Run{
  start_time: number
  end_time  : number|undefined  //initialy is undefined then changes to number and stops changing
  reason    : string
  output    : string[]          ////growing
  Err       : Error|undefined   //initialy is undefined then maybe changes to error and stop changing
  exit_code : number|undefined
  stopped   : undefined|true
  run_id    : number
}

export interface Lstr extends Pos{
  str:string
}
export interface Filename{
  rel:Lstr
  full:string
}
export interface RunnerBase{
  pos:Pos|undefined
  id:string
  need_ctl:boolean
}
export interface Runner extends RunnerBase{
  //ntype          : 'runner' //deprecated
  name           : string
  workspace_folder : string
  script         : string
  //growing
  //watched_default: boolean
  effective_watch: Filename[]
}
export interface FolderError extends RunnerBase{
  //ntype         : 'folder_error'
  message       : string
}
export interface Folder extends RunnerBase{
  //ntype        : 'folder'
  name         : string
  workspace_folder: string         //where the package.json is 
  folders      : Array<Folder>
  runners      : Array<Runner>
  errors       : Array<FolderError>
  //scriptsmon   : Scriptsmon
}


