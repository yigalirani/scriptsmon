
import type { Terminal,ILink,ILinkProvider,IBufferCellPosition,IBufferRange } from '@xterm/xterm';
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
  algorithm:
  start with y=last line, last length and keep looping until the end, keep track of the new last line and last length
  for create genrator for that: for text, line_range of new lines. only process complete new lines.
  the parse_line does: create links, update last_ancor
  question, if i detect a link, how do i calc its rnage start(x,y) end (x,y)
  ans you have mapping from the text pos to start of lines

  write function: read_line
  */

class Line { //https://gemini.google.com/share/7a938f003cb8
  private readonly offsets: Uint32Array;
  private readonly start_y: number;
  public readonly len: number;
  public readonly text: string;

  constructor(strings: string[], start_y = 0) {
    this.start_y = start_y;
    this.text = strings.join("");
    this.len = this.text.length;
    
    this.offsets = new Uint32Array(strings.length);
    
    let offset = 0;
    for (let i = 0; i < strings.length; i++) {
      this.offsets[i] = offset;
      offset += strings[i]!.length;
    }
  }

  public find_cell_pos(pos: number): IBufferCellPosition | undefined {
    if (pos < 0 || pos >= this.len) {
      return;
    }

    const index = this.binary_search_offsets(pos);
    
    return {
      y: this.start_y + index,
      x: pos - this.offsets[index]!
    };
  }
  public calc_range(start_pos:number,end_pos:number):IBufferRange{
    const start=this.find_cell_pos(start_pos)
    const end=this.find_cell_pos(end_pos)
    if (start==null||end==null)
      throw "bad range" //by theoram should not get here
    return {start,end}
  }

  private binary_search_offsets(target: number): number {
    let low = 0;
    let high = this.offsets.length - 1;

    while (low <= high) {
      // oxlint-disable-next-line no-bitwise
      const mid = (low + high) >>> 1;
      const val = this.offsets[mid]!;

      if (val === target) return mid;
      
      if (val < target) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    return high;
  }
}

interface IlinkData{
  start:number
  end:number
  text: string;
  row:number
  col:number
  source_file:string
}


function parse_text(text:string,ancore:string|undefined):{
  links:IlinkData[],
  new_ancore:string|undefined
}{
  return {
    links:[],
    new_ancore:ancore
  }
}

class LinkParser{
  y_head=0
  is_done=false
  buffer
  ancore:string|undefined
  line_map: Map<number, Set<ILink>>=new Map()
  private add_link(link: ILink): void {
    const start_y = link.range.start.y;
    const end_y = link.range.end.y;

    for (let y = start_y; y <= end_y; y++) {
        if (!this.line_map.has(y)) {
            this.line_map.set(y, new Set());
        }
        this.line_map.get(y)!.add(link);
    }
  }
  public y_links(y: number): ILink[] {
    const ans = [...this.line_map.get(y)|| new Set<ILink>()]
    return ans
  }    
  private skip_wrapped_lines(){ //because thats that vscode embbeded terminal does
    while(this.y_head < this.buffer.length)
      if (this.buffer.getLine(this.y_head)?.isWrapped===false)
        return
      this.y_head++
  }  
  private read_line(){
    this.skip_wrapped_lines()
    const strings= [];
    for (let y=this.y_head;y<this.buffer.length;y++){
      const line = this.buffer.getLine(y)!;
      const {isWrapped}=line
      if(!isWrapped || this.is_done){
        const ans=new Line(strings,this.y_head)
        this.y_head=y-(isWrapped?1:0)
        return ans
      }
      const string = line.translateToString(true);        
      strings.push(string)
    }
  }  
  constructor(
    term:Terminal,
    public workspace_folder:string
  ){
    this.buffer=term.buffer.normal
  }
  make_ilink(link_data:IlinkData,line:Line):ILink{
    const {start,end,text,row,col,source_file}=link_data
    const {workspace_folder}=this
    const range=line.calc_range(start,end)
    return {
      range,
      text,
      activate(){
        post_message({
          command: "command_open_file_rowcol",
          workspace_folder,
          source_file, 
          row,
          col
        });        
      }
    }
  }
  iter=()=>{
    while(true){
      const line=this.read_line()
      if (line==null)
        return
      const {links,new_ancore}=parse_text(line.text,this.ancore)
      for (const x of links){
        const ilink=this.make_ilink(x,line)
        this.add_link(ilink)
      }
      this.ancore=new_ancore
    }
  }
}

export class MyLinkProvider implements ILinkProvider{
  parser
  constructor(
    public terminal: Terminal,
    public workspace_folder:string
  ){
    this.parser=this.make_parser() //line A
    setInterval(this.parser.iter,100)
  }
  make_parser(){
    return new LinkParser(this.terminal,this.workspace_folder)
  }
  provideLinks(y:number, callback:(links: ILink[] | undefined) => void){//error TS7006: Parameter 'callback' implicitly has an 'any' type. why? doent it get the type from ILinkProvider
    const links=this.parser.y_links(y)
    //console.log(links)
    callback(links);
  }
  reset(){
    this.parser=this.make_parser() //line B
  }
}
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