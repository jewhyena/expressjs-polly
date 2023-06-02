import { arrayRange, lngLat, tiles } from "../lib/mercantile";

export const getMapTiles = (
  gt: number[],
  rasterSize: { x: number; y: number }
) => {
  const maxZoom = Math.floor(Math.log(40075016.0 / gt[1]) / Math.log(2)) - 7;

  const minZoom =
    maxZoom -
    Math.ceil(
      Math.log(Math.max(rasterSize.x, rasterSize.y) / 256) / Math.log(2)
    );

  const leftTop = lngLat(gt[0], gt[3]);
  const rightBottom = lngLat(
    gt[0] + rasterSize.x * gt[1],
    gt[3] + rasterSize.y * gt[5]
  );

  return {
    leftTop,
    rightBottom,
    minZoom,
    maxZoom,
    tiles: Array.from(
      tiles(
        leftTop.lng,
        rightBottom.lat,
        rightBottom.lng,
        leftTop.lat,
        arrayRange(minZoom, maxZoom, 1)
      )
    ),
  };
};
