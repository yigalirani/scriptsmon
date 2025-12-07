function begin(a){
  a.beginElement()
}
document.querySelector('#animatebutton').addEventListener('click', () => {
  document.querySelectorAll('animate').forEach(begin)
});
