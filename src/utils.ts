import path from 'path';
import { parse } from 'stacktrace-parser';

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

function stringifyArg(arg: unknown, depth = 0): string {
  const maxDepth = 0;
  if (arg === null) return 'null';
  if (arg === undefined) return 'undefined';
  if (typeof arg === 'string') return `'${arg}'`;
  if (typeof arg === 'function') return `() => { ... }`;
  if (typeof arg === 'object') {
    if ('then' in arg && typeof arg.then === 'function') return `Promise`;
    if (arg instanceof Date) return `Date(${arg.toISOString()})`;
    if (arg instanceof RegExp) return String(arg);

    if (Array.isArray(arg)) {
      const maxShowCount = 3;
      if (depth > maxDepth) return `[...]`;
      const items = arg.slice(0, maxShowCount).map((a) => stringifyArg(a, depth + 1));
      return `[${items.join(', ')}${arg.length > maxShowCount ? ', ...' : ''}]`;
    }

    if (depth > maxDepth) return `{...}`;
    try {
      const keys = Object.keys(arg);
      if (keys.length === 0) return '{}';
      const props = keys
        .slice(0, 3)
        .map((k) => `${k}: ${stringifyArg((arg as Record<string, any>)[k], depth + 1)}`);
      return `{ ${props.join(', ')}${keys.length > 3 ? ', ...' : ''} }`;
    } catch {
      return '{...}';
    }
  }
  return String(arg);
}

//error should directly in the wrapper function where oldFunction() is called
export function getCodeInfo(
  error: Error,
  { methodName, args, showLogs }: { methodName: string; args: unknown[]; showLogs?: boolean } = {
    methodName: '<anonymous>',
    args: [],
    showLogs: false,
  },
): {
  line: number;
  filePath: string;
  callerName: string;
  isUserLevel: boolean;
  snippet: string;
  code: string;
} {
  //example of error.stack
  //   at Promise.global.Promise.all (C:\Users\abebe\src\wrap\wrap-globals.ts:28:19)
  //   at authUsers (C:\Users\abebe\example\server.ts:23:17)
  //   at C:\Users\abebe\example\src\app.ts:53:19
  //   TODO: write custom parser if takes too much time

  if (showLogs) {
    log('\ngetCodeInfo for: ', methodName, error);
  }
  const stack = parse(error.stack || '');
  let x = '';
  for (const frame of stack) {
    const isUserLevel =
      !frame.file?.includes('node_modules') &&
      !frame.file?.includes('node:internal') &&
      !frame.file?.includes(path.join('express-k6-profiler', 'src')); //TODO: fix when project name is changed

    if (!isUserLevel) {
      x = frame.methodName;

      if (showLogs) {
        log(
          `isUserLevel${isUserLevel} \t frame: ${frame.methodName}\t file: ${frame.file}:${frame.lineNumber}`,
        );
      }
      continue;
    }

    if (showLogs) {
      log(
        `isUserLevel${isUserLevel} \t frame: ${frame.methodName}\t file: ${frame.file}:${frame.lineNumber}`,
      );
    }
    const snippet = `${methodName}(${args.length > 0 ? `${args.length} args` : ''})`;
    const argsStr = args.map((a) => stringifyArg(a, 0)).join(', ');
    const callerName = frame.methodName && frame.methodName !== '<unknown>' ? frame.methodName : '';
    let prefix = '';
    if (callerName) prefix += `// Inside ${callerName}\n`;
    prefix += '// note: approximated\n';
    const code = `${prefix} ${methodName}(${argsStr});`;

    return {
      filePath: frame.file || '',
      snippet,
      line: frame.lineNumber || -1,
      callerName,
      isUserLevel,
      code,
    };
  }

  return {
    line: -1,
    filePath: '',
    callerName: '',
    isUserLevel: false,
    snippet: `${methodName}(${args.length > 0 ? `${args.length} args` : ''})`,
    code: '',
  };
}

export function stampAsWrapped(thing: Function) {
  (thing as any).__krayWrapped = true;
}

export function stampSkipWrapping(thing: Function) {
  (thing as any).__kraySkipWrapping = true;
}

export function isWrapped(thing: Function) {
  return !!(thing as any)?.__krayWrapped;
}

export function skipWrapping(thing: Function) {
  return !!(thing as any)?.__kraySkipWrapping;
}
