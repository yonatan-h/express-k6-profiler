import { Request, Response, NextFunction } from 'express';
import { addEntry, createEntrySlot, getEntries, runWithStorage, StorageEntry } from './async-storage';
import { addSpan } from './measurement';
import { Span, SpanCode } from '../shared-types';

export const measuringMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const begin = Date.now();
  runWithStorage(() => {
    const slotIndex = createEntrySlot();
    res.on('finish', () => {
      addEntry(slotIndex, {
        code: null,
        startMs: begin,
        endMs: Date.now(),
        evalCodeSnippet: `${req.path}()`,
        displayName: `Endpoint ${req.path}`,
        errorCode: undefined,
        errorMessage: '',
        spanType: 'endpoint',
        file: null,
        subPath: '',
      });

      const allEntries = [...getEntries()];
      console.log('🚀 ~ measuringMiddleware ~ allEntries:', allEntries);

      //merge overlapping entries
      const mergedEntries: StorageEntry[][] = [];
      let left = 0;
      
      for (let right = 1; right < allEntries.length; right++) {
        const leftEntry = allEntries[left];
        
      }


      for (const entry of allEntries) {
        addSpan(req.method, req.path, span, spanCode);
      }
    });

    next();
  });
};
measuringMiddleware.__kraySkipWrap = true;
