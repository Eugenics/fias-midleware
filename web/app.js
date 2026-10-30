import Map from 'ol/Map.js';
import View from 'ol/View.js';
import TileLayer from 'ol/layer/Tile.js';
import WMSCapabilities from 'ol/format/WMSCapabilities.js';
import {fromLonLat, transformExtent} from 'ol/proj.js';
import ScaleLine from 'ol/control/ScaleLine.js';
import {catalog} from './catalog.js';
import {createMapSource} from './map-source.js';
import 'ol/ol.css';
import './style.css';

const endpoint = '/geoserver/wms';
const projection = 'EPSG:900913';
const status = document.querySelector('#status');
const info = document.querySelector('#info');
const featureDialog = document.querySelector('#feature-dialog');
document.querySelector('#close-feature-dialog').onclick = () => featureDialog.close();
featureDialog.addEventListener('close', () => {
  requestId++;
  document.querySelector('#map').focus({preventScroll: true});
});
const list = document.querySelector('#layers');
const search = document.querySelector('#search');
const reload = document.querySelector('#reload');
const map = new Map({target: 'map', view: new View({projection, center: fromLonLat([83, 55], projection), zoom: 5})});
map.addControl(new ScaleLine());
let entries = [];
let requestId = 0;
let order = 0;

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function fit(entry) {
  const extent = entry.extent;
  if (!extent || !extent.every(Number.isFinite) || extent[0] >= extent[2] || extent[1] >= extent[3]) return;
  const bounded = [extent[0], Math.max(-85, extent[1]), extent[2], Math.min(85, extent[3])];
  map.getView().fit(transformExtent(bounded, 'EPSG:4326', map.getView().getProjection()), {padding: [45, 45, 45, 45], maxZoom: 17, duration: 400});
}

function addEntry(entry) {
  const source = createMapSource(endpoint, projection, entry.name);
  entry.layer = new TileLayer({source, visible: false});
  map.addLayer(entry.layer);
  const card = element('article', undefined, 'layer');
  entry.card = card;
  const label = element('label', undefined, 'layer-title');
  const checkbox = element('input');
  checkbox.type = 'checkbox';
  label.append(checkbox, element('strong', entry.title));
  card.append(label, element('small', entry.name));
  const controls = element('div', undefined, 'layer-controls');
  const zoom = element('button', 'К слою');
  zoom.disabled = !entry.extent;
  zoom.onclick = () => fit(entry);
  const opacity = element('input');
  opacity.type = 'range'; opacity.min = '0'; opacity.max = '1'; opacity.step = '0.05'; opacity.value = '1';
  opacity.setAttribute('aria-label', `Прозрачность: ${entry.title}`);
  opacity.oninput = () => entry.layer.setOpacity(Number(opacity.value));
  controls.append(zoom, opacity);
  const legend = element('details');
  legend.append(element('summary', 'Легенда'));
  legend.addEventListener('toggle', () => {
    if (!legend.open || legend.querySelector('img')) return;
    const img = element('img');
    img.alt = `Легенда: ${entry.title}`;
    img.src = source.getLegendUrl();
    img.onerror = () => { img.replaceWith(element('p', 'Легенда недоступна.')); };
    legend.append(img);
  });
  const state = element('p', '', 'layer-state');
  let pendingTiles = 0;
  let failedTiles = 0;
  source.on('tileloadstart', () => {
    if (pendingTiles === 0) failedTiles = 0;
    pendingTiles++;
    state.textContent = 'Загрузка карты…';
  });
  const finishTile = failed => {
    pendingTiles = Math.max(0, pendingTiles - 1);
    if (failed) failedTiles++;
    state.textContent = failedTiles ? 'Не удалось загрузить карту. Проверьте слой в GeoServer.' : pendingTiles ? 'Загрузка карты…' : '';
  };
  source.on('tileloadend', () => finishTile(false));
  source.on('tileloaderror', () => finishTile(true));
  checkbox.onchange = () => {
    const first = !entries.some(item => item.layer.getVisible());
    entry.layer.setVisible(checkbox.checked);
    if (checkbox.checked) {
      entry.layer.setZIndex(++order);
      if (first) fit(entry);
    }
    requestId++;
    info.textContent = 'Нажмите на объект на карте.';
  };
  card.append(controls, legend, state);
  list.append(card);
}

function filter() {
  const query = search.value.trim().toLocaleLowerCase();
  for (const entry of entries) entry.card.hidden = !`${entry.title} ${entry.name}`.toLocaleLowerCase().includes(query);
}
search.oninput = filter;

async function load() {
  reload.disabled = true;
  status.textContent = 'Подключение к GeoServer…';
  try {
    const response = await fetch(`${endpoint}?SERVICE=WMS&REQUEST=GetCapabilities&VERSION=1.3.0`, {signal: AbortSignal.timeout(20000)});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = new WMSCapabilities().read(await response.text());
    if (!data?.Capability) throw new Error('GeoServer вернул некорректный каталог WMS');
    const next = catalog(data.Capability.Layer);
    requestId++;
    entries.forEach(entry => map.removeLayer(entry.layer));
    list.replaceChildren();
    entries = next;
    entries.forEach(addEntry);
    filter();
    status.textContent = entries.length ? `Доступно слоёв: ${entries.length}. Выберите слой для просмотра.` : 'Нет опубликованных слоёв. Опубликуйте слой через раздел Layers в GeoServer.';
    info.textContent = 'Включите слой и нажмите на объект.';
  } catch (error) {
    status.textContent = `Не удалось обновить слои: ${error.message}. Проверьте GeoServer и нажмите «Обновить».`;
  } finally { reload.disabled = false; }
}
reload.onclick = load;

map.on('singleclick', async event => {
  const id = ++requestId;
  const active = entries.filter(entry => entry.layer.getVisible() && entry.queryable);
  info.replaceChildren();
  if (!featureDialog.open) featureDialog.showModal();
  info.scrollTop = 0;
  if (!active.length) { info.textContent = 'Включите слой с поддержкой информации об объектах.'; return; }
  info.textContent = 'Поиск объектов…';
  const results = await Promise.all(active.map(async entry => {
    const block = element('div', undefined, 'feature');
    block.append(element('h3', entry.title));
    try {
      const url = entry.layer.getSource().getFeatureInfoUrl(event.coordinate, map.getView().getResolution(), map.getView().getProjection(), {INFO_FORMAT: 'application/json', FEATURE_COUNT: 10});
      const response = await fetch(url, {signal: AbortSignal.timeout(15000)});
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (!Array.isArray(data.features)) throw new Error();
      if (!data.features.length) block.append(element('p', 'Объектов в этой точке нет.'));
      for (const feature of data.features) {
        const table = element('table', undefined, 'feature-table');
        const head = element('thead');
        const headings = element('tr');
        for (const title of ['Поле', 'Значение']) {
          const heading = element('th', title);
          heading.scope = 'col';
          headings.append(heading);
        }
        head.append(headings);
        const body = element('tbody');
        for (const [key, value] of Object.entries(feature.properties || {})) {
          const row = element('tr');
          const name = element('th', key);
          name.scope = 'row';
          row.append(name, element('td', typeof value === 'object' ? JSON.stringify(value) : String(value ?? '—')));
          body.append(row);
        }
        table.append(head, body);
        block.append(table);
      }
    } catch { block.append(element('p', 'Информация недоступна. Проверьте поддержку GetFeatureInfo JSON для слоя.')); }
    return block;
  }));
  if (id === requestId) info.replaceChildren(...results);
});
load();
