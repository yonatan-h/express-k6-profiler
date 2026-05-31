import { IoChevronDown, IoChevronForward } from 'react-icons/io5';

export default function FolderPad({ dir }: { dir: 'right' | 'down' | 'line' | 'none' }) {
  return (
    <div className="flex justify-center items-center w-5">
      {dir === 'right' && <IoChevronForward />}
      {dir === 'down' && <IoChevronDown />}
      {dir === 'line' && <div className="w-px h-full group-hover:border-l border-gray-200"></div>}
      {dir === 'none' && null}
    </div>
  );
}
