import esbuild from 'esbuild';

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/** @type {import('esbuild').BuildOptions} */
const extensionOptions = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node18',
  external: ['vscode'],
  outfile: 'dist/extension.js',
  sourcemap: !production,
  minify: production,
  logLevel: 'info',
};

/** @type {import('esbuild').BuildOptions} */
const webviewOptions = {
  entryPoints: { webview: 'src/webview/main.ts' },
  bundle: true,
  platform: 'browser',
  format: 'iife',
  target: 'es2022',
  outdir: 'dist',
  sourcemap: !production,
  minify: production,
  logLevel: 'info',
  loader: {
    '.woff': 'dataurl',
    '.woff2': 'dataurl',
    '.ttf': 'dataurl',
    '.otf': 'dataurl',
    '.eot': 'dataurl',
    '.svg': 'dataurl',
    '.png': 'dataurl',
  },
};

if (watch) {
  const contexts = await Promise.all([
    esbuild.context(extensionOptions),
    esbuild.context(webviewOptions),
  ]);
  await Promise.all(contexts.map((ctx) => ctx.watch()));
} else {
  await Promise.all([esbuild.build(extensionOptions), esbuild.build(webviewOptions)]);
}
