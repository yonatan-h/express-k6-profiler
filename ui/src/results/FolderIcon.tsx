import { AiOutlineBranches } from 'react-icons/ai';
import { TbBrackets, TbDatabase, TbLogs, TbRouteAltRight } from 'react-icons/tb';
import type { SpanType } from '../../../shared/types';

const ICONS: Record<SpanType, React.ReactNode> = {
  route: <TbRouteAltRight />,
  middleware: <AiOutlineBranches />,
  db: <TbDatabase />,
  'promise-all': <TbBrackets />,
  'console-log': <TbLogs />,
  endpoint: <span>E</span>,
  root: <span>R</span>,
};
export default function FolderIcon({ type }: { type: SpanType }) {
  const accent: Record<SpanType, string> = {
    route: 'text-blue-600',
    middleware: 'text-purple-600',
    db: 'text-emerald-700',
    'promise-all': 'text-amber-600',
    'console-log': 'text-gray-600',
    endpoint: '',
    root: '',
  };

  return (
    <div
      className="
        h-4 w-4
        flex items-center justify-center
        text-[12px]
        text-gray-600
      "
      title={type}
    >
      <span className={accent[type]}>{ICONS[type]}</span>
    </div>
  );
}
