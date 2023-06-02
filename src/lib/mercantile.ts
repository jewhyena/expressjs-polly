const R2D = 180 / Math.PI;
const RE = 6378137.0;
const CE = 2 * Math.PI * RE;
const EPSILON = 1e-14;
const LL_EPSILON = 1e-11;

interface LngLat {
  lng: number;
  lat: number;
}

interface Tile {
  x: number;
  y: number;
  z: number;
}

interface Bbox {
  left: number;
  bottom: number;
  right: number;
  top: number;
}

function minmax(z: number): [number, number] {
  if (z < 0 || !Number.isInteger(z)) {
    throw new Error("Zoom must be a positive integer");
  }

  return [0, 2 ** z - 1];
}

function newTile(x: number, y: number, z: number): Tile {
  const [lo, hi] = minmax(z);

  if (!(lo <= x && x <= hi) || !(lo <= y && y <= hi)) {
    console.warn(
      "Mercantile 2.0 will require tile x and y to be within the range (0, 2 ** zoom)"
    );
  }

  return { x, y, z: z };
}

function tile(
  lng: number,
  lat: number,
  z: number,
  truncate: boolean = false
): Tile {
  const [x, y] = _xy(lng, lat, truncate);
  const Z2 = Math.pow(2, z);

  let xtile, ytile;

  if (x <= 0) {
    xtile = 0;
  } else if (x >= 1) {
    xtile = Z2 - 1;
  } else {
    xtile = Math.floor((x + EPSILON) * Z2);
  }

  if (y <= 0) {
    ytile = 0;
  } else if (y >= 1) {
    ytile = Z2 - 1;
  } else {
    ytile = Math.floor((y + EPSILON) * Z2);
  }

  return { x: xtile, y: ytile, z: z };
}

export function* tiles(
  west: number,
  south: number,
  east: number,
  north: number,
  zooms: number[] | number,
  truncate = false
) {
  if (truncate) {
    [west, south] = truncateLngLat(west, south);
    [east, north] = truncateLngLat(east, north);
  }

  let bboxes: number[][];

  if (west > east) {
    const bbox_west = [-180.0, south, east, north];
    const bbox_east = [west, south, 180.0, north];
    bboxes = [bbox_west, bbox_east];
  } else {
    bboxes = [[west, south, east, north]];
  }

  for (const [w, s, e, n] of bboxes) {
    const clamped_w = Math.max(-180.0, w);
    const clamped_s = Math.max(-85.051129, s);
    const clamped_e = Math.min(180.0, e);
    const clamped_n = Math.min(85.051129, n);

    if (!Array.isArray(zooms)) {
      zooms = [zooms];
    }

    for (const z of zooms) {
      const ul_tile = tile(clamped_w, clamped_n, z);
      const lr_tile = tile(clamped_e - LL_EPSILON, clamped_s + LL_EPSILON, z);

      for (let i = ul_tile.x; i <= lr_tile.x; i++) {
        for (let j = ul_tile.y; j <= lr_tile.y; j++) {
          yield newTile(i, j, z);
        }
      }
    }
  }
}

export function xy_bounds(tile: Tile): Bbox {
  const { x, y, z } = tile;

  const tileSize = CE / Math.pow(2, z);

  const left = x * tileSize - CE / 2;
  const right = left + tileSize;
  const top = CE / 2 - y * tileSize;
  const bottom = top - tileSize;

  return { left, bottom, right, top };
}

function _xy(lng: number, lat: number, truncate = false): [number, number] {
  if (truncate) {
    [lng, lat] = truncateLngLat(lng, lat);
  }

  const x = lng / 360.0 + 0.5;
  const sinLat = Math.sin(degreesToRadians(lat));

  try {
    const y =
      0.5 - (0.25 * Math.log((1.0 + sinLat) / (1.0 - sinLat))) / Math.PI;

    return [x, y];
  } catch (error) {
    throw new Error(`Y can not be computed: lat=${lat}`);
  }
}

function truncateLngLat(lng: number, lat: number): [number, number] {
  if (lng > 180.0) {
    lng = 180.0;
  } else if (lng < -180.0) {
    lng = -180.0;
  }

  if (lat > 90.0) {
    lat = 90.0;
  } else if (lat < -90.0) {
    lat = -90.0;
  }

  return [lng, lat];
}

export function lngLat(x: number, y: number, truncate = false): LngLat {
  let lng: number = (x * R2D) / RE;
  let lat: number = (Math.PI * 0.5 - 2.0 * Math.atan(Math.exp(-y / RE))) * R2D;

  if (truncate) {
    [lng, lat] = truncateLngLat(lng, lat);
  }

  return { lng, lat };
}

function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export const arrayRange = (start: number, stop: number, step: number) =>
  Array.from(
    { length: (stop - start) / step + 1 },
    (value, index) => start + index * step
  );
