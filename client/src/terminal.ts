interface ParseRange<T extends object>{
  start:number
  end:number
  values:T
}
interface TerminalListener<T extends object>{
  parse:(line_text:string,state:unknown)=>{
    state:unknown,
    ranges:Array<ParseRange<T> > 
  }
  click:(values:T)=>void
}
type Channel='stderr'|'stdout'
export class Terminal<T extends object>{
  constructor(
    private el:HTMLElement,
    private listener:TerminalListener<T>
  ){
  }
  term_write(channel:Channel,...output:string[]){
  }
  clear(){
  }

}