import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css=fs.readFileSync('assets/atlas.css','utf8');

test('v0.5.12 quota uses rounded pill dots instead of a solid used block',()=>{
  assert.match(css,/Atlas v0\.5\.12 quota pill polish/);
  assert.match(css,/radial-gradient\(ellipse at center/);
  assert.match(css,/background-color:transparent!important/);
  assert.match(css,/border-radius:999px!important/);
  assert.match(css,/background-size:10px 5px!important/);
});
