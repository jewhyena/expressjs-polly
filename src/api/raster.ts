import multer from "multer";
import gdal from "gdal-async";
import { Router } from "express";
import { randomUUID } from "crypto";

import { prisma } from "../lib/db";
import { xy_bounds } from "../lib/mercantile";
import { handleUpload } from "../helpers/upload-file";
import { getDataURI } from "../helpers/data-uri";
import { getMapTiles } from "../helpers/map-tiles";
import { writeGCP, warp } from "../helpers/gdal";

import type { UploadApiResponse } from "cloudinary";
import type { GCP } from "../types";

export const rasterRouter = Router();

const storage = multer.memoryStorage();
const uploader = multer({ storage });

rasterRouter.get("/:id", async (req, res, next) => {
  const id = req.params.id;

  try {
    const raster = await prisma.raster.findUnique({
      where: {
        id,
      },
    });

    if (!raster) {
      res.status(404);
      res.json({
        message: `Cannot find raster with id ${id}`,
      });

      return;
    }

    res.status(200);
    res.json({
      raster,
    });
  } catch (error) {
    res.status(500);
    next(error);
  }
});

rasterRouter.post("/", uploader.single("raster"), async (req, res, next) => {
  const file = req.file;

  if (!file) {
    res.status(400);
    res.json({ message: `No file provided` });

    return;
  }

  if (!req.body.gcps) {
    res.status(400);
    res.json({ message: "No GCPs provided" });

    return;
  }

  const gcps = JSON.parse(req.body.gcps) as Array<GCP>;

  try {
    const rasterUpload = handleUpload(
      getDataURI(file.buffer, file.mimetype),
      "rasters"
    );

    let ds = await writeGCP(
      `/vsimem/${file.filename}.gcps`,
      gdal.open(file.buffer),
      gcps
    );

    const warpFilename = `/vsimem/${file.filename}.tif`;

    ds = await warp(warpFilename, ds);

    if (!ds.geoTransform) {
      throw new Error("Dataset GeoTransform object is null");
    }

    const { leftTop, rightBottom, minZoom, maxZoom, tiles } = getMapTiles(
      ds.geoTransform,
      ds.rasterSize
    );

    const rasterId = randomUUID();
    const tilesPromises: Promise<UploadApiResponse>[] = [];

    for (const tile of tiles) {
      const filename = `${tile.z}_${tile.x}_${tile.y}.png`;
      const { left, bottom, right, top } = xy_bounds(tile);

      await gdal.translateAsync(`/vsimem/${filename}`, ds, [
        `-projwin`,
        `${left}`,
        `${top}`,
        `${right}`,
        `${bottom}`,
        `-outsize`,
        `256`,
        `256`,
        `-co`,
        `COMPRESS=PACKBYTES`,
      ]);

      tilesPromises.push(
        handleUpload(
          getDataURI(gdal.vsimem.release(`/vsimem/${filename}`), "image/png"),
          `tiles/${rasterId}`,
          filename
        )
      );
    }

    // because of cloudinary 10mb per file restriction

    // const geotiffUpload = handleUpload(
    //   getDataURI(gdal.vsimem.release(warpFilename), "image/tiff"),
    //   "geotiffs"
    // );

    const tileTemplate = `https://res.cloudinary.com/${process.env.CLOUD_NAME}/image/upload/v1685461453/tiles/${rasterId}/{z}_{x}_{y}.png`;

    const rasterUrl = (await rasterUpload).secure_url;
    const geotiffUrl = ""; // (await geotiffUpload).secure_url;

    const raster = await prisma.raster.create({
      data: {
        id: rasterId,
        rasterUrl,
        geotiffUrl,
        tileTemplate,
        leftTopLat: leftTop.lat,
        leftTopLong: leftTop.lng,
        rightBottomLat: rightBottom.lat,
        rightBottomLong: rightBottom.lng,
        minZoom,
        maxZoom,
      },
    });

    await Promise.all(tilesPromises);

    res.status(200);
    res.json({ raster });
  } catch (error) {
    res.status(500);
    next(error);
  }
});

rasterRouter.patch("/:id", async (req, res, next) => {
  try {
    const id = req.params.id;

    const body = req.body as {
      name: string | undefined;
    };

    if (!body.name) {
      res.status(400);
      res.json({ message: "No data to change provided" });

      return;
    }

    const raster = await prisma.raster.update({
      data: {
        name: body.name,
      },
      where: {
        id,
      },
    });

    res.status(200);
    res.json({ raster });
  } catch (error) {
    res.status(500);
    next(error);
  }
});

rasterRouter.delete("/:id", async (req, res, next) => {
  const id = req.params.id;

  try {
    const raster = await prisma.raster.delete({
      where: {
        id,
      },
    });

    res.status(200);
    res.json({ raster });
  } catch (error) {
    res.status(500);
    next(error);
  }
});
