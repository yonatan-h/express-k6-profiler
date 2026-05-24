import type { SpanType } from "../../shared/types";

export interface SpanFolder {
  type:SpanType;
  cur: FolderProps;
  prev: FolderProps | null;
  subFolders: SpanFolder[];
}
export interface FolderProps {
  totalMs: number;
  count: number;
  snippet: string;
  errors: Record<string, { count: number; message: string }>;
}

