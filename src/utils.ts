const oldLog = console.log.bind(console);
export const log = (...args: any[]) => {
  oldLog(...args);
};

export function safeImport(importString: string): unknown | null {
  try {
    const importedThing = require(importString);
    return importedThing;
  } catch (e) {
    return null;
  }
}

//error should directly in the wrapper function where oldFunction() is called
export function getCodeInfo(error: Error): { line: number; filePath: string; callerName: string } {
  //example of error.stack
  //   at Promise.global.Promise.all (C:\Users\abebe\src\wrap\wrap-globals.ts:28:19)
  //   at authUsers (C:\Users\abebe\example\server.ts:23:17)
  const callerLine = error.stack?.split('\n')[2] || ''; // frame 2 = actual caller
  const match = callerLine.match(/at\s+(\S+)\s+\((.+):(\d+):(\d+)\)$/);

  let callerName = '';
  let line = -1;
  let filePath = '';

  if (match) {
    callerName = match[1];
    line = parseInt(match[3], 10);
    filePath = match[2];
  }

  return { line, filePath, callerName };
}
