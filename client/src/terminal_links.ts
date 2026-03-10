
import type { Terminal,ILink,ILinkProvider, IBuffer } from '@xterm/xterm';
import  {post_message} from './common.js'
const links_regex = /(?<source_file>([a-zA-Z]:)?[a-zA-Z0-9_\-./\\@]+)(:(?<row>\d+))?(:(?<col>\d+))?/g;
const ancor_regex = /^(?<source_file>([a-zA-Z]:)?[a-zA-Z0-9_\-./\\@]+)(:(?<row>\d+))?(:(?<col>\d+))?\s*$/;
const ref_regex = /^\s*(?<row>\d+):(?<col>\d+)(.*)/
/*
interface LineMap{
  pos:number//int the orig line
  y:number//in the broken
}
class OrigLine{
  text=''
  linemap:Array<LineMap>=[]
  constructor(y:number){
    const first_line_map:LineMap={y,pos:0}
    this.linemap=[first_line_map]
  }
}


class TerminalIndex{
  orig_lines:OrigLine[]=[]
  broken_to_orig:number[]=[]
}
class LineBuilder{
  last_line_number=0
  last_line_length=0
  cur_texts=Array<string>
  line_map=Array<LineMap>  
  constructor(public orig_line:OrigLine){
  }
}
class TerminalLines{
  index=new TerminalIndex
  buffer
  line_builder
  constructor(private term:Terminal){
     this.buffer= this.term.buffer.normal
     this.line_builder=new LineBuilder(this.index.orig_lines[0]!)
  }

  refresh(){
    this.index=new TerminalIndex
    this.read_all()
  }
  read_line(y:number){
    const line = this.buffer.getLine(y)
    if (line==null){
      console.warn('buffer.getLine is null',y)
      return    
    }
    if (!line.isWrapped){
      const new_orig_line=new OrigLine(y)
      this.index.orig_lines.push(new_orig_line)
      this.line_builder=new LineBuilder(new_orig_line) //old one is not needed
    }
    this.index.broken_to_orig[y]=this.index.orig_lines.length-1
    const text=line.translateToString(false)
    if (text.length<=this.line_builder.last_line_length)
      return
    if (start===0)
      line_map.push({y,line_map.text.length}

  }
  read_all(){
    this.read_last_line()
    //loops over the terminal.buffer.normal and creates a new index
    
    const buffer = this.term.buffer.normal
    for (let i=this.index.last_line_number;i<buffer.length;i++){
      const line = buffer.getLine(i)
      if (line==null){
        console.warn('buffer.getLine is null',i)
        continue
      }
      const text= line.translateToString(false)
      const {isWrapped}=line
      if (isWrapped){
        cur_line.push(text)
        continue
      }
      orig_lines.at(-1).push(
    
      return ans      
    }

  }
  on_timer(){
    //called overy 100ms and updates the index based on appends to terminal.buffer.normal
  }
  get_orig_line(y:number):OrigLine{
    //consultes the index and return the apprriate orig_line
  }
  get_row_col(orig_line:OrigLine,orig_line_number:number,offset:number){
  }
}
  */
export function addFileLocationLinkDetection(
  terminal: Terminal,
  workspace_folder:string
){
  const ancors:Array<undefined|string|false>=[] //string means anchor/unknown/no ancore
  let links:Array<ILink>=[]
  function clearAnchors() {
    ancors.length = 0
  }
  function get_terminal_top_line_is_wrapped(term:Terminal){
    const topline_number=terminal.buffer.active.viewportY
    const topline=terminal.buffer.active.getLine(topline_number)
    const {isWrapped}=topline!
    return  isWrapped   //is this gurantted to be false
  }
  function get_text(y:number){

    const line = terminal.buffer.active.getLine(y - 1)
    const ans=line&&line.translateToString(true)||''
    return ans
  }
  function write_ancores(start:number,end:number,value:false|string){
    ///ancors.fill(value, start, end); ///didnt work
    //console.log('write_ancores',start,end,value)
    for (let i=start;i<=end;i++)
      if (ancors[i]==null)
          ancors[i]=value
  }
  function push_link({match,y,source_file,groups}:{
    y:number
    source_file:string,
    groups:Record<string,string>
    match:RegExpExecArray|RegExpMatchArray
  }){
    const { index } = match;
    const text = match[0];
    const start= index!+1
    const end= index! + text.length  
    const row= groups.row && parseInt(groups.row, 10)||0
    const col= groups.col && parseInt(groups.col, 10)||0  
    const link:ILink={
      range: {
        start: { x: start, y },
        end: { x: end, y }
      },
      activate(){
        post_message({
          command: "command_open_file_rowcol",
          workspace_folder,
          source_file, 
          row,
          col
        });
      },
      text
    }
    links.push(link)
  }
  function find_anchor(y:number){
    for (let i=y;i>=0;i--){
      const ancor=ancors[i]
      if (ancor===false){
        write_ancores(i,y,false)
        return false
      }
      if (typeof(ancor)==='string'){
        write_ancores(i,y,ancor)
        return ancor
      }
      const input=get_text(i)
      const ancor_match=input.match(ancor_regex)
      if (ancor_match!=null){
        const source_file=ancor_match.groups!.source_file!
        write_ancores(i,y,source_file)
        return source_file
      }
      const ref_match=input.match(ref_regex) 
      if (ref_match==null){
        write_ancores(i,y,false)
        return false
      }
    }
    write_ancores(0,y,false)
    return false
  }
  function make_ref_link(input: string,y:number){
    if (ancors[y]===false)
      return false
 
    const source_file=find_anchor(y)
    if (source_file===false)
      return false
    const match = input.match(ref_regex)
    if (match==null){
      write_ancores(y,y,false)
      return false
    }    
    const {groups}=match
    if (groups==null)
      return false
    push_link({match,y,source_file,groups})
    return true

  }
  function make_links(y:number) {
    const input=get_text(y)    
    if (make_ref_link(input,y))
      return 

    
    for (const match of input.matchAll(links_regex)){
      const { groups } = match;
      if (groups==null)
        continue 
      const source_file= groups.source_file!////by the defintioin of the regex, it is clear that it is not undefined, why tsc cannt know it


      push_link({match,y,source_file,groups})

    }
    return links
  }
  const provider: ILinkProvider = {
    provideLinks(y, callback) {
      links=[]
      make_links(y)
      //console.log(links)
      callback(links);
    }
  };
  terminal.registerLinkProvider(provider);
  terminal.onResize(() => clearAnchors())
  return clearAnchors
}