interface Watcher{
  watch?:string[]
  filter?:string
  pre?:string
}

export type State="ready"|"done"|"error"|"running"|"stopped"

export interface Run{
  start_time  : number
  end_time    : number|undefined //initialy is undefined then changes to number and stops changing
  reason      : string
  output      : string[]////growing
  Err         : Error|undefined //initialy is undefined then maybe changes to error and stop changing
  state        : State
}
export interface Runner {
  type           : 'runner'
  watcher        : Watcher
  name           : string
  full_pathname  : string            
  script         : string            
  autorun        : boolean
  id             : string
  runs           : Run[] //growing
}

export interface Folder{
  type:'folder'
  name:string 
  full_pathname: string //where the package.json is 
  folders:Array<Folder>
  runners:Array<Runner>
  //scriptsmon:Scriptsmon
}
const root:Folder //replicate this