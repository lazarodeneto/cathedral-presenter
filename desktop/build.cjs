'use strict'
const { build } = require('esbuild')
const path = require('node:path')
build({ entryPoints: [path.join(__dirname, '../server/runtime.ts')], outfile: path.join(__dirname, 'build/server.mjs'), bundle: true, platform: 'node', format: 'esm', target: 'node24', packages: 'external', sourcemap: false }).catch((error) => { console.error(error.message); process.exitCode = 1 })
