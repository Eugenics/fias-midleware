export function catalog(root) {
  const layers = new Map();
  function visit(layer, parent = {}) {
    if (!layer) return;
    const extent = layer.EX_GeographicBoundingBox ?? parent.extent;
    const queryable = layer.queryable ?? parent.queryable ?? false;
    if (layer.Name && !layers.has(layer.Name)) {
      layers.set(layer.Name, {name: layer.Name, title: layer.Title || layer.Name, extent, queryable});
    }
    for (const child of layer.Layer || []) visit(child, {extent, queryable});
  }
  visit(root);
  return [...layers.values()];
}
