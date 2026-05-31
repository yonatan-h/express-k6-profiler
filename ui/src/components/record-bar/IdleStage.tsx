import { FaCircle } from 'react-icons/fa';
import Progress from './Progress';
import { useGContext } from '../../global-context';
import { useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import { CgSpinner } from 'react-icons/cg';
import StartCaptureButton from './StartCaptureButton';

export default function IdleDesc({ onNext }: { onNext: () => Promise<void> }) {
  return (
    <div className="w-full flex flex-col gap-3 ">
      <div className="flex gap-3 items-center">
        <StartCaptureButton text="Start Capturing" primary />
      </div>
    </div>
  );
}
