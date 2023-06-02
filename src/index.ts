import express, { json, urlencoded } from "express";
import cors from "cors";

import { rasterRouter } from "./api/raster";

const PORT = process.env.PORT || 5000;

const app = express();

app.use(cors());
app.use(json());
app.use(urlencoded({ extended: true }));

app.use("/raster", rasterRouter);

app.listen(PORT);
