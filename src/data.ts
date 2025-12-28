
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
export interface Lstr{
  str:string
  full_pathname:string
  start:number
  end:number
}
export interface Filename{
  rel:Lstr
  full:string
}
export interface Runner {
  //ntype          : 'runner' //deprecated
  name           : string
  full_pathname  : string
  id             : string
  script         : Lstr
  runs           : Run[]     //growing
  watched        : boolean
  effective_watch: Filename[]
}
export interface FolderError{
  //ntype         : 'folder_error'
  message       : Lstr
}
export interface Folder{
  //ntype        : 'folder'
  name         : string
  full_pathname: string         //where the package.json is 
  id           : string
  folders      : Array<Folder>
  runners      : Array<Runner>
  //scriptsmon   : Scriptsmon
}


