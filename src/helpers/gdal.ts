import gdal from "gdal-async";

import type { GCP } from "../types";

export const writeGCP = (filename: string, ds: gdal.Dataset, gcps: GCP[]) => {
  const options = gcps.flatMap(({ x, y, lng, lat }) => [
    "-gcp",
    `${x}`,
    `${y}`,
    `${lng}`,
    `${lat}`,
  ]);

  options.push("-of", "GTiff");

  return gdal.translateAsync(filename, ds, options);
};

export const warp = (filename: string, ds: gdal.Dataset) => {
  return gdal.warpAsync(
    filename,
    null,
    [ds],
    [
      `-tps`,
      `-r`,
      `lanczos`,
      `-s_srs`,
      `EPSG:4326`,
      `-t_srs`,
      `EPSG:3857`,
      `-overwrite`,
      `-dstnodata`,
      `0`,
      `-co`,
      `COMPRESS=PACKBYTES`,
      `-co`,
      `TILED=YES`,
    ]
  );
};
