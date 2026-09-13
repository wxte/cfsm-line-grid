import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync('assets/app.js','utf8');
const css=fs.readFileSync('assets/atlas.css','utf8');

test('v0.5.15 keeps OS identity beside the node title and refines the desktop row',()=>{
  const html=fs.readFileSync('index.html','utf8');
  assert.match(html,/class="node-os-emblem"/);
  assert.match(app,/querySelector\('\.node-os-emblem'\)/);
  assert.match(app,/osName\.className='os-name'/);
  assert.doesNotMatch(app,/os\.className='os-tag'/);
  assert.match(app,/if\(\/centos\/\.test\(text\)\)return 'centos'/);
  assert.match(app,/viewBox="0 0 24 24"/);
  assert.match(app,/family==='centos'/);
  assert.match(css,/Atlas v0\.5\.15 node density \+ authentic OS marks/);
  assert.match(css,/minmax\(230px,1\.55fr\)/);
  assert.match(css,/grid-template-columns:30px minmax\(72px,1fr\) 36px/);
  assert.match(css,/height:4px!important/);
});
