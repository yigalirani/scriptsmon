
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
  type           : 'runner'
  name           : string
  full_pathname  : string
  id             : string
  script         : Lstr
  runs           : Run[]     //growing
  watched        : boolean
  effective_watch: Filename[]
    /*state        : State
  version: number*/
}


export interface Folder{
  type         : 'folder'
  name         : string
  full_pathname: string         //where the package.json is 
  id           : string
  folders      : Array<Folder>
  runners      : Array<Runner>
  //scriptsmon   : Scriptsmon
}
export type FolderRunner=Runner|Folder
export function find_runner(root:Folder,id:string){
  function f(folder:Folder):Runner|undefined{
    const ans=folder.runners.find(x=>x.id===id)
    if (ans!=null)
      return ans
    for (const subfolder of folder.folders){
      const ans=f(subfolder)
      if (ans!=null)
        return ans
    }
  }
  return f(root)
}
