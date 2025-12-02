import * as esbuild from 'esbuild'
await esbuild.build({ 
  entryPoints: ['src/extension.ts','src/test.ts'],
  platform: 'node',
  bundle: true,
  outdir: './dist', 
  sourcemap: true,
  target: 'node22',
  minifySyntax:false,
  format: 'esm',
  external:['vscode','node','@lydell/node-pty']
})
 

