import { SpanCode } from '../shared/types';

export function getSpanCode(): SpanCode['file'] {
  return {
    filePath: '',
    lineNumber: 0,
    content: '',
  };
}
