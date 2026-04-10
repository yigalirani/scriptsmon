export interface SearchData{
  term_el:HTMLElement/*
* typicly structures is
  <div class=term_text>
    <div class="line_stdout"><br></div> //new line is indicated by br because empty line
    <div class="line_stdout"><span>hello</span></div>   /// new br here because no empty line, none the less new line is implied
    <div class="line_stdout"><br></div>  
    <div class="line_stdout"><span>world</span></div>  
    <div class="line_stdout"><br></div>
  </div>
   */  
  term_text:HTMLElement
  highlight:Highlight  
  term_plain_text:string //contains \n matching thew new lines as described the html above
}

interface NodeOffset{
  node:Node
  node_pos:number
}


  get_node_offsets(term_el:HTMLElement,plain_text:string,text_pos:number[]):NodeOffset[]{
  /*text_pos are increasing and refer to postins within plain_text
  term_el typicls strucuter is 
  <div class=term_text>
    <div class="line_stdout"><br></div> //new line is indicated by br because empty line
    <div class="line_stdout"><span>hello</span></div>   /// new br here because no empty line, none the less new line is implied
    <div class="line_stdout"><br></div>  
    <div class="line_stdout"><span>world</span></div>  
    <div class="line_stdout"><br></div>
  </div>
   */  
    /*implment this stucure, algorithm: loop over the children of term_el, for children that have br, 
        return the br,0 it its correspoding text pos is pos
    for non br lines use document.createTreeWalker(line , NodeFilter.SHOW_TEXT);
    use variables:
      plain_text_head/
      text_pos_head
      i for linr number
      line for childern[i]
  

  }

}


    for (let line=line_head;
      

      const {lastIndex}=this.regex
      const match = this.regex.exec(this.data.term_plain_text)
      if (match==null){
        this.regex.lastIndex=lastIndex // match causes redex.lastindex to reset - let put it back
        return
      }
      const {length}=match[0]
      if (length===0){
        this.regex.lastIndex++
        continue
      }
      const start=this.advance_head(match.index)
      const end=this.advance_head(match.index + match[0].length)
      const range = new Range();
      range.setStart(start.node,start.pos)
      range.setEnd(end.node,end.pos)
      yield range
    }
  }