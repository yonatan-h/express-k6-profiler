import { Application } from 'express';
import { getMeasurements, measuringMiddleware, resetMeasurements } from './measurement';
import path from 'path';
import fs from 'fs/promises';
import { wrapMongoose, wrapRouter } from './wrap/wrap';
import { log, stampSkipWrapping } from './utils';
import { wrapGlobals } from './wrap/wrap-globals';

export interface KRayOptions {
  prefix: string;
}

function addProfilerEndponts(app: Application, options: KRayOptions) {
  const allHandler = async (_: any, res: any) => {
    res.json(await getMeasurements());
  };
  stampSkipWrapping(allHandler);
  app.get(`${options.prefix}/__profile/api/all`, allHandler);

  const uiHandler = async (_: any, res: any) => {
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
      let htmlPath = path.join(__dirname,'..', 'index.html');
      try {
        await fs.access(htmlPath);
      } catch {
        console.error('index.html not found at ' + htmlPath);
        return res.status(502).send('index.html not found');
      }
      html = await fs.readFile(htmlPath, 'utf-8');
    }

    res.send(html);
  };
  stampSkipWrapping(uiHandler);
  app.get(`${options.prefix}/__profile`, uiHandler);

  const resetHandler = (_: any, res: any) => {
    resetMeasurements();
    res.send('ok');
  };
  stampSkipWrapping(resetHandler);
  app.post(`${options.prefix}/__profile/api/reset`, resetHandler);
}

export function profile(app: Application, options: KRayOptions = { prefix: '' }) {
  const oldListen = app.listen.bind(app);
  app.use(measuringMiddleware);
  //TODO: Add a warning to do the profile before the routes are registered
  addProfilerEndponts(app, options);

  app.listen = (...args: any[]) => {
    //TODO: check if it breaks in different express versions
    wrapRouter((app as any)._router || app.router, '');//instead of .router which is deprecated in 4 and 5
    wrapGlobals();
    wrapMongoose();

    return oldListen(...args);
  };
  log(
    `Express-k6-profiler setup complete. Please open yourbackend:port${options.prefix}/__profile`,
  );
}
