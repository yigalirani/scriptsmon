function begin(a){
  a.beginElement()
}
document.querySelector('#animatebutton').addEventListener('click', () => {
  document.querySelectorAll('animateTransform').forEach(begin)
});
document.querySelector('#animatebutton_the_done').addEventListener('click', () => {
  document.querySelectorAll('#the_done animateTransform').forEach(begin)
});
function spin_loop(){
  const start=Date.now()
  setInterval(() => {
    const animationDelay=`-${(Date.now()-start)/1000}s`
    let anim_count=0
    for (const anim of document.body.querySelectorAll('svg .animated,svg.animated')){
      anim_count++
      anim.style.animationDelay=animationDelay
    }
    document.body.querySelector('#stat').innerHTML=`${animationDelay} ${anim_count}`
  }, 100);
}
spin_loop() //not suppesed to moved without it except the upcomming longrunning
