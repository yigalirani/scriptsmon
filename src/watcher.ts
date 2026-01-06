export class Watcher{
  add(k:string,path:string){//can have multiple watchers per k
  }
  unchnaged(k:string):boolean{ //have watches under this k and did not changed
    return this.has('root') && this.get_changed('root').length===0
  }
  has(k:string):boolean{
  }
  has_changed(k:string):boolean{
  }
  get_changed(k:string):string[]{//return list of paths that have changed
    return []
  }
  clear(k:string){
  }
  stop_watching(){ //and clear the 
  }
    

}
/*
  watch_to_set(watched_dirs:Set<string>,changed_dirs:Set<string>){
    for (const watched_dir of watched_dirs){
      try{
        console.log(`watching ${watched_dir}`)
        chokidar.watch(watched_dir).on('change', (changed_file) =>{
        //fsSync.watch(watched_dir,{},(eventType, changed_file) => {
          changed_dirs.add(watched_dir)
          console.log(`changed: *${watched_dir}/${changed_file} `)
        }) 
      }catch(ex){
        console.warn(`file not found, ignoring ${watched_dir}: ${String(ex)}`)  
      }
    }
  }
  get_runners_by_changed_dirs(root:Folder,changed_dirs:Set<string>){
    const ans:RunnerWithReason[]=[]
    function f(node:Folder){
      const {folders,runners}=node
      folders.forEach(f);
      for (const runner of runners){
        if (runner.watched)
          for (const {full} of runner.effective_watch)
            if (changed_dirs.has(full))
              ans.push({runner,reason:full})
      }
    }
    f(root)
    return Object.values(ans)
  }*/