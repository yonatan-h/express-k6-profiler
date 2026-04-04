import { Express } from 'express';
export default function profile(app: Express) {
    const oldUse = app.use;
    app.use = function(this: any, ...args: any[]) {
        return oldUse.apply(this, args as any);
    } as any;
}
