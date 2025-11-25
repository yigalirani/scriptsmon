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
  scriptsmon:Scriptsmon
}
function is_valid_watch(a:unknown){
  if (a==null)
    return true
  return is_string_array(a)
}
function is_valid_watcher(a:unknown){
  if (typeof a==='string' || is_string_array(a))
      return true 
  if (!is_object(a))
    return "expecting object"
  if (!is_valid_watch(a.watch)){
    return 'watch: expecting  array of strings'
  }

  for (const k of Object.keys(a))
    if (!['watch','env','filter','pre'].includes(k))
      return `${k}:invalid key`
  return true
}
function is_non_watcher(k:string){
  return  (['autorun','$watch'].includes(k))
}
function is_config2(a:unknown){
  if (!is_object(a))
    return false
  const {$watch}=a
  if (!is_valid_watch($watch)){
    console.log('watch: must be string or array of string')
    return false  
  }
  for (const [k,v] of Object.entries(a)){
    if (is_non_watcher(k))
      continue
    const valid_watcher=is_valid_watcher(v)
    if (valid_watcher!==true){
      console.log(`${k}: invalid watcher:${valid_watcher}`)
      return false
    }

  }
  return true

}
function parse_config(filename:string,pkgJson:s2u|undefined):Scriptsmon{
  if (pkgJson==null)
    return{}
  const {scriptsmon}=pkgJson
  if (scriptsmon==null)
    return {}
  const ans=is_config2(scriptsmon);
  if (ans)
    return scriptsmon as Scriptsmon
  console.warn(ans)
  return {}  
}
function parse_scripts(pkgJson:s2u):s2s{

  if (pkgJson==null)
    return {}
  const {scripts}=pkgJson
  if (scripts==null)
    return {}  
  return scripts as s2s
}
function normalize_watch(a:string[]|undefined){
  if (a==null)
    return []
  return a
}
function scriptsmon_to_runners(pkgPath:string,watchers:Scriptsmon,scripts:s2s){
  const $watch=normalize_watch(watchers.$watch)
  const autorun=normalize_watch(watchers.autorun)
  const ans=[]
  for (const [name,v] of Object.entries(watchers)){
    if (is_non_watcher(name))
      continue
    const watcher:Watcher=function(){
      if (is_string_array(v)){
        return {watch:normalize_watch(v)}
      }
      return v
    }()
    const script=scripts[name]
    if (script==null){
      console.warn(`missing script ${name}`)
      continue
    }
    const runner:Runner=function(){
      return {
        ...watcher, //i like this
        name,
        script,
        full_pathname:path.dirname(pkgPath),
        watch:[...normalize_watch($watch),...normalize_watch(watcher.watch)],
        autorun:autorun.includes(name)
      }
    }()
    ans.push(runner)
  }
  return ans
}
export async function read_package_json(
  full_pathnames: string[]
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
    const pkgJson=await read_json_object(pkgPath,'package.json')
    if (pkgJson==null)
      return null
    console.warn(`${green}${pkgPath}${reset}`)
    const scriptsmon=parse_config(pkgPath,pkgJson)
    const scripts=parse_scripts(pkgJson)
    const runners=scriptsmon_to_runners(pkgPath,scriptsmon,scripts)
    const {workspaces} = pkgJson
    const folders=[]
    if (is_string_array(workspaces))
      for (const workspace of workspaces){
          const ret=await f(path.join(full_pathname,workspace),workspace)
          if (ret!=null)
            folders.push(ret)
        }

    
    const ans:Folder= {runners,folders,name,full_pathname,scriptsmon}
    return ans
  }
  const folders=[]
  for (const pathname of full_pathnames){
    const full_pathname=path.resolve(pathname)
    const ret=await f(full_pathname,path.basename(full_pathname))
      if (ret!=null)
        folders.push(ret)
  }
  const root:Folder={
    name:'root',
    full_pathname: '',
    folders,
    runners:[],
    scriptsmon:{}
  }
  //const keys=Object.keys(ans)
  //const common_prefix=getCommonPrefix(keys)
  //const extra={keys,common_prefix}
  //await mkdir_write_file('generated/extra.json',JSON.stringify(extra,null,2))
  await mkdir_write_file('generated/packages.json',JSON.stringify(root,null,2))
  return root
}
