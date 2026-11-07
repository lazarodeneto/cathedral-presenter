'use strict'
require('esbuild').build({ entryPoints: ['worker/run.ts'], outfile: 'worker/build/run.mjs', bundle: true, platform: 'node', format: 'esm', target: 'node24', packages: 'external' }).catch((error) => { console.error(error.message); process.exitCode = 1 })
