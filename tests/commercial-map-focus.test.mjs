import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const map=fs.readFileSync(new URL('../src/components/MapView.js',import.meta.url),'utf8');const runtime=fs.readFileSync(new URL('../commercial-prospects-runtime.js',import.meta.url),'utf8');
test('map exposes prospect focus event and runtime emits it',()=>{assert.match(map,/commercial-prospect-map-focus/);assert.match(runtime,/commercial-prospect-map-focus/);assert.match(runtime,/cp-map/);});
