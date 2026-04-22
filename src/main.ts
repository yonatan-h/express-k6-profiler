import { Application, NextFunction, Request, Response } from 'express';
import { getMeasurements, resetMeasurements } from './measurement';
import path from 'path';
import fs from 'fs/promises';
import { storage } from './async-storage';
import { wrapRouter } from './wrap';

export function profile(app: Application, options: { prefix: string } = { prefix: '' }) {
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

  app.use((req: Request, res: Response, next: NextFunction) => {
    const begin = Date.now();
    const store = { entries: [] };
    storage.run(store, () => {
      res.on('finish', () => {});

      next();
    });
  });

  const oldListen = app.listen.bind(app);
  app.listen = (...args: any[]) => {
    wrapRouter(app, '');
    return oldListen(...args);
  };
  console.log(
    `Express-k6-profiler setup complete. Please open yourbackend:port${options.prefix}/__profile`,
  );
}
