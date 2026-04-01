import { Express, NextFunction, RequestHandler, Request, Response } from 'express';

export default function profile(app: Express) {
  console.log('🚀 ~ profiler ~ app configuring:');
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log('🚀 ~ profiler2 ~ req - middle2');
    next();
  });
}
