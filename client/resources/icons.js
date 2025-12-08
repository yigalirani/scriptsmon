function begin(a){
  a.beginElement()
}
document.querySelector('#animatebutton').addEventListener('click', () => {
  document.querySelectorAll('animateTransform').forEach(begin)
});
document.querySelector('#animatebutton_the_done').addEventListener('click', () => {
  document.querySelectorAll('#the_done animateTransform').forEach(begin)
});