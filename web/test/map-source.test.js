import test from 'node:test';
import assert from 'node:assert/strict';
import {get as getProjection} from 'ol/proj.js';
import {createMapSource} from '../map-source.js';

test('map requests aligned GeoWebCache tiles, including on Retina displays', () => {
  const source = createMapSource('/geoserver/wms', 'EPSG:900913', 'osm:osm');
  assert.equal(typeof source.getTileUrlFunction, 'function');
  const projection = getProjection('EPSG:900913');
  const tileUrl = source.getTileUrlFunction();
  const url = tileUrl([1, 1, 0], 1, projection);
  assert.equal(tileUrl([1, 1, 0], 2, projection), url);
  const params = new URL(url, 'http://localhost').searchParams;
  for (const [key, value] of Object.entries({
    REQUEST: 'GetMap', LAYERS: 'osm:osm', TILED: 'true',
    WIDTH: '256', HEIGHT: '256', CRS: 'EPSG:900913', FORMAT: 'image/png'
  })) assert.equal(params.get(key), value, key);
  const bbox = params.get('BBOX').split(',').map(Number);
  const expected = [0, 0, 20037508.342789244, 20037508.342789244];
  bbox.forEach((value, index) => assert.ok(Math.abs(value - expected[index]) < 1e-6));
});

test('tile source preserves legend and feature info requests', () => {
  const source = createMapSource('/geoserver/wms', 'EPSG:900913', 'osm:osm');
  const legend = new URL(source.getLegendUrl(), 'http://localhost');
  assert.equal(legend.searchParams.get('REQUEST'), 'GetLegendGraphic');
  assert.equal(legend.searchParams.get('LAYER'), 'osm:osm');
  const info = new URL(source.getFeatureInfoUrl([0, 0], 1000, 'EPSG:900913', {
    INFO_FORMAT: 'application/json', FEATURE_COUNT: 10
  }), 'http://localhost');
  assert.equal(info.searchParams.get('REQUEST'), 'GetFeatureInfo');
  assert.equal(info.searchParams.get('QUERY_LAYERS'), 'osm:osm');
  assert.equal(info.searchParams.get('INFO_FORMAT'), 'application/json');
});
