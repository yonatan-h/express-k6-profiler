import { IoChevronDown, IoChevronForward } from 'react-icons/io5';

export default function FolderPad({ dir }: { dir: 'right' | 'down' | 'line' | 'none' | 'dot' }) {
  return (
    <div className={`flex justify-center w-2.5  `}>
      {dir === 'right' && <IoChevronForward />}
      {dir === 'down' && <IoChevronDown />}
      {dir === 'line' && <div className="w-px h-full border-l border-gray-300"></div>}
      {dir === 'dot' && <div className="w-1.5 h-1.5 rounded-full bg-gray-300 self-center"></div>}
      {dir === 'none' && null}
    </div>
  );
}
