import { Router } from "express";

import { prisma } from "../lib/db";

const mapRouter = Router();

mapRouter.get("/:id", async (req, res, next) => {
  const id = req.params.id;

  try {
    const map = await prisma.map.findUnique({
      where: {
        id,
      },
      include: {
        polygons: true,
        rastersOnMap: true,
      },
    });

    if (!map) {
      res.status(404);
      res.json({ message: `Cannot found map with id ${id}` });
    }

    res.status(200);
    res.json({ map });
  } catch (error) {
    res.status(500);
    next(error);
  }
});

mapRouter.post("/", async (req, res, next) => {
  try {
    const map = await prisma.map.create({
      data: {},
    });

    res.status(200);
    res.json({ map });
  } catch (error) {
    res.status(500);
    next(error);
  }
});

mapRouter.post("/:id/polygon", async (req, res, next) => {
  try {
    const id = req.params.id;

    const body = req.body as {
      color: string | undefined;
      geojson: string | undefined;
    };

    // TODO validate color and geojson

    if (!body.geojson) {
      res.status(400);
      res.json({ message: "No GeoJSON provided" });

      return;
    }

    const polygon = await prisma.polygon.create({
      data: {
        color: body.color,
        geojson: body.geojson,
        map: {
          connect: {
            id,
          },
        },
      },
    });

    res.status(200);
    res.json({ polygon });
  } catch (error) {
    res.status(500);
    next(error);
  }
});

mapRouter.patch("/:id", async (req, res, next) => {
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

    const map = await prisma.map.update({
      data: {
        name: body.name,
      },
      where: {
        id,
      },
    });

    res.status(200);
    res.json({ map });
  } catch (error) {
    res.status(500);
    next(error);
  }
});

mapRouter.delete("/:id", async (req, res, next) => {
  const id = req.params.id;

  try {
    const map = await prisma.map.delete({
      where: {
        id,
      },
    });

    res.status(200);
    res.json({ map });
  } catch (error) {
    res.status(500);
    next(error);
  }
});
