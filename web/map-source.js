import TileWMS from 'ol/source/TileWMS.js';
import {createXYZ} from 'ol/tilegrid.js';
import {get as getProjection} from 'ol/proj.js';

export function createMapSource(url, projection, name) {
  return new TileWMS({
    url,
    projection,
    params: {LAYERS: name, VERSION: '1.3.0', TILED: true, FORMAT: 'image/png'},
    serverType: 'geoserver',
    // GeoWebCache expects 256px tiles even on high pixel density displays.
    hidpi: false,
    tileGrid: createXYZ({extent: getProjection(projection).getExtent(), tileSize: 256, maxZoom: 30})
  });
}
