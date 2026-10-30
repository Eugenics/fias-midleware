import test from 'node:test';
import assert from 'node:assert/strict';
import { catalog } from '../catalog.js';

test('nested layers inherit extent and queryability, with explicit child overrides', () => {
  const layers = catalog({queryable: true, EX_GeographicBoundingBox: [80, 50, 90, 60], Layer: [
    {Title: 'Group', Layer: [{Name: 'osm:roads', Title: 'Roads'},
      {Name: 'osm:water', queryable: false, EX_GeographicBoundingBox: [81, 51, 82, 52]}]}
  ]});
  assert.deepEqual(layers, [
    {name: 'osm:roads', title: 'Roads', queryable: true, extent: [80, 50, 90, 60]},
    {name: 'osm:water', title: 'osm:water', queryable: false, extent: [81, 51, 82, 52]}
  ]);
});

test('empty catalog and duplicate names do not create unusable layer controls', () => {
  assert.deepEqual(catalog(), []);
  assert.equal(catalog({Layer: [{Name: 'x'}, {Name: 'x'}]}).length, 1);
});
