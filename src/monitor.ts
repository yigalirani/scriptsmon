import * as path from "node:path";
import {
  is_object,
  s2t,
  mkdir_write_file,
  read_json_object ,
  s2u,
  reset,
  green,
  is_string_array,
  s2s
} from "@yigal/base_types";
interface Watcher{
  watch?:string[]
  filter?:string
  pre?:string
}
export type Scriptsmon=  Record<string,Watcher|string[]>&
{
  $watch?:string[]
  autorun?:string[]
}

interface Runner extends Watcher{//adds some runtime
  name:string
  full_pathname: string //where the package.json is   
  script:string //coming from the scripts section of package.json
  autorun:boolean
}

interface Folder{
  name:string 
  full_pathname: string //where the package.json is 
  folders:Array<Folder>
  runners:Array<Runner>
}
export async function read_package_json(
  full_pathnamezs: string[]
) {

  const folder_index: Record<string, Folder> = {}; //by full_pathname
  async function f(full_pathname: string,name:string){
    const pkgPath = path.resolve(path.normalize(full_pathname), "package.json");
    const d= path.resolve(full_pathname);
    const exists=folder_index[d]
    if (exists!=null){
      console.warn(`${pkgPath}: skippin, already done`)
      return exists
    }    
    //const pkgJson = await 
     read_json_object(pkgPath,'package.json')
    if (pkgJson==null)
      return null
    console.warn(`${green}${pkgPath}${reset}`)
    const watchers=parse_watchers(pkgPath,pkgJson)
    const scripts=parse_scripts(pkgJson)
    const runners=watchers_to_runners(pkgPath,watchers,scripts)
    const {workspaces} = pkgJson
    const folders=[]
    if (is_string_array(workspaces))
      for (const workspace of workspaces){
          const ret=await f(path.join(full_pathname,workspace),workspace)
          if (ret!=null)
            folders.push(ret)
        }

    
    const ans:Folder= {runners,folders,name,full_pathname,watchers}
    return ans
  }
  const folders=[]
  for (const full_pathname of full_pathnames){
    const ret=await f(full_pathname,path.basename(full_pathname))
      if (ret!=null)
        folders.push(ret)
  }
  const root:Folder={
    name:'root',
    full_pathname: '',
    folders,
    runners:[],
    watchers:{}
  }
  //const keys=Object.keys(ans)
  //const common_prefix=getCommonPrefix(keys)
  //const extra={keys,common_prefix}
  //await mkdir_write_file('generated/extra.json',JSON.stringify(extra,null,2))
  await mkdir_write_file('generated/packages.json',JSON.stringify(root,null,2))
  return root
}
