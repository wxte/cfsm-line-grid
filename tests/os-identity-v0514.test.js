import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('assets/app.js','utf8');
const css=fs.readFileSync('assets/atlas.css','utf8');

test('v0.5.14 moves OS identity beside node title',()=>{
  assert.match(html,/class="node-os-emblem"/);
  assert.match(app,/querySelector\('\.node-os-emblem'\)/);
  assert.match(app,/osName\.className='os-name'/);
  assert.doesNotMatch(app,/os\.className='os-tag'/);
  assert.match(css,/Atlas v0\.5\.14 OS identity layout/);
  assert.doesNotMatch(css,/Atlas v0\.5\.13 OS icon scale/);
});
