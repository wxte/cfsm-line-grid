import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const css=fs.readFileSync('assets/atlas.css','utf8');
test('v0.5.13 gives OS marks a larger visual footprint',()=>{
  assert.match(css,/Atlas v0\.5\.13 OS icon scale/);
  assert.match(css,/\.node-meta \.os-logo\{/);
  assert.match(css,/width:18px!important/);
  assert.match(css,/data-os="debian"/);
  assert.match(css,/transform:scale\(1\.24\)/);
});
