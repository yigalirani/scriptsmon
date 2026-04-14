

function find_ranges(el:HTMLElement ,re:RegExp):Range[]{
  const {textContent}=el
  const ans=[];

  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let text_head=0
  for (const m of textContent.matchAll(re)) {
  }

}