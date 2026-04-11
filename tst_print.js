let i=0;
setInterval(() => {
  i++
  process.stdout.write('*')
  if (i%3==0)
    process.stderr.write('$\n')
  if (i%5==0)
    process.stdout.write('\x1b[43m')  

}, 500);