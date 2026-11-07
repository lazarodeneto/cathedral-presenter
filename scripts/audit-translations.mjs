import { build } from 'esbuild'
import ts from 'typescript'
import { readFileSync, readdirSync } from 'node:fs'
const built = await build({ stdin: { contents: "export { dictionaries } from './src/i18n/dictionary.ts'", resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' })
const { dictionaries } = await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`)
const en = dictionaries.en, errors = [], staticKeys = new Map(), literals = []
const intentionalEmpty = new Set(['template.blank-warm.text', 'template.blank-ivory.text'])
const variables = (text) => [...new Set([...text.matchAll(/\{([A-Za-z][A-Za-z0-9]*)\}/g)].map((m) => m[1]))].sort().join(',')
for (const [locale, dictionary] of Object.entries(dictionaries)) {
 for (const key of Object.keys(en)) {
  if (typeof dictionary[key] !== 'string' || (!dictionary[key].trim() && !intentionalEmpty.has(key))) errors.push({ locale, key, problem: 'missing-or-empty' })
  else if (variables(en[key]) !== variables(dictionary[key])) errors.push({ locale, key, problem: 'placeholder-mismatch', expected: variables(en[key]), actual: variables(dictionary[key]) })
 }
 for (const key of Object.keys(dictionary)) if (!(key in en)) errors.push({ locale, key, problem: 'unknown-key' })
}
function sourceFiles(directory) {
 return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const path = `${directory}/${entry.name}`
  if (entry.isDirectory()) return entry.name === 'tests' ? [] : sourceFiles(path)
  return entry.isFile() && /\.tsx?$/.test(entry.name) ? [path] : []
 })
}
const files = sourceFiles('src')
for (const file of files) {
 const code = readFileSync(file,'utf8'), ast = ts.createSourceFile(file,code,ts.ScriptTarget.Latest,true,file.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
 const visit = (node) => {
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 't' && ts.isStringLiteral(node.arguments[0])) {
   const key = node.arguments[0].text, line = ast.getLineAndCharacterOfPosition(node.getStart()).line + 1
   if (!staticKeys.has(key)) staticKeys.set(key,{file,line})
  }
  if (file.includes('/screens/') || file.includes('/components/')) {
   if (ts.isJsxText(node)) { const text = node.text.replace(/\s+/g,' ').trim(); if (/[A-Za-zÀ-ž]{3}/.test(text)) literals.push({file,line:ast.getLineAndCharacterOfPosition(node.getStart()).line+1,text:text.slice(0,160)}) }
  }
  ts.forEachChild(node,visit)
 };visit(ast)
}
for (const [key,location] of staticKeys) if (!(key in en)) errors.push({key,problem:'unresolved-static-key',...location})
console.log(JSON.stringify({ locales:Object.keys(dictionaries),keys:Object.keys(en).length,staticKeys:staticKeys.size,errors,literals },null,2))
if (errors.length) process.exitCode = 1
