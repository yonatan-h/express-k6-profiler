import { Application, NextFunction, Request, Response } from 'express';
import { getMeasurements, resetMeasurements } from './measurement';
import path from 'path';
import fs from 'fs/promises';
import { wrapRouter } from './wrap';
import { addEntry, createEntrySlot, getEntries, runWithStorage } from './async-storage';
import { measuringMiddleware } from './measuring-middleware';

export interface KRayOptions {
  prefix: string;
}

function addProfilerEndponts(app: Application, options: KRayOptions) {
  app.get(`${options.prefix}/__profile/api/all`, (_, res) => {
    res.json(getMeasurements());
  });

  app.get(`${options.prefix}/__profile`, async (_, res) => {
    let html: string;

    if (process.env.__AS_DEV === 'true') {
      try {
        html = await (await fetch('http://localhost:3011/')).text();
        //for vite to fetch its internal things from PORT=3011
        html = html.replace('<head>', `<head><base href="http://localhost:3011/" />`);
      } catch (e: any) {
        return res.status(502).send('Vite UI server not running' + e.message);
      }
    } else {
      let htmlPath = path.join(__dirname, 'index.html');
      try {
        await fs.access(htmlPath);
      } catch {
        console.error('index.html not found at ' + htmlPath);
        return res.status(502).send('index.html not found');
      }
      html = await fs.readFile(htmlPath, 'utf-8');
    }

    res.send(html);
  });

  app.post(`${options.prefix}/__profile/api/reset`, (_, res) => {
    resetMeasurements();
    res.send('ok');
  });
}

export function profile(app: Application, options: KRayOptions = { prefix: '' }) {
  const oldListen = app.listen.bind(app);
  app.use(measuringMiddleware);

  app.listen = (...args: any[]) => {
    addProfilerEndponts(app, options);
    wrapRouter(app.router, '');

    //registered after wrapRouter so it's excluded from wrapping (no storage context needed)
    return oldListen(...args);
  };
  console.log(
    `Express-k6-profiler setup complete. Please open yourbackend:port${options.prefix}/__profile`,
  );
}
