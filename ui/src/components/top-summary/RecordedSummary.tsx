import { useState } from "react";
import { IoMdArrowDropdown } from "react-icons/io";
import { getDuration } from "../../../../shared/big-utils";

export function RecordedSummary() {
  const avgLatency = 120;
  const totalReqs = 10;
  const status = 'k6 Running';
  const liveReqs = 5;
  const avgCpu = 10;
  const avgRam = 10;
  return (
    <div className="flex gap-6 items-center">
      <div>
        <div className="flex flex-col gap-px items-center relative justify-center">
          <DropDown />
          <span className="text-xs text-gray-500 absolute z-50 bg-white  rounded-full ">vs</span>
          <DropDown />
        </div>
      </div>
      {/* <button className="h-full flex gap-1 items-center rounded py-2 px-3 bg-gray-600 text-white">
        <FaCircle className="text-white" />
        Start
      </button> */}

      <div className="flex flex-col text-xs">
        <span className="text-gray-500">Average Latency</span>
        <span className="">{avgLatency}ms (+120ms)</span>
      </div>

      <div className="flex flex-col text-xs">
        <span className="text-gray-500">Error Rate</span>
        <span className="">10% (-10%)</span>
      </div>

      <div className="flex flex-col text-xs">
        <span className="text-gray-500">Total Reqs</span>
        <span className="">100k (+502)</span>
      </div>
    </div>
  );
}

function DropDown() {
  const [isOpen, setIsOpen] = useState(false);

  const forCurrent = true;
  const options = [
    {
      id: 'hello1',
      title: 'Run #1',
      time: new Date().toString(),
      avgLatency: 120,
      totalReqs: 10234,
    },
    {
      id: 'hello2',
      title: 'Run #2',
      time: new Date().toString(),
      avgLatency: 84,
      totalReqs: 8421,
    },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded border border-gray-400 px-3 py-1  text-sm bg-white"
      >
        <div className="text-xs">
          <div>Run #1</div>
        </div>

        <IoMdArrowDropdown className="text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute mt-2 rounded shadow-md border border-gray-400 bg-white min-w-125 z-50">
          {forCurrent ? <p className="p-3">Select Run</p> : <p className="p-3">Select Baseline</p>}
          <hr className="border-gray-200" />
          {options.map((o) => {
            const dur = getDuration(Date.now() - new Date(o.time).getTime());

            return (
              <button key={o.id} className="w-full rounded px-3 py-1 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="">{o.title}</div>

                  <div className=" text-gray-500">
                    {dur.hours > 0 && `${dur.hours}h `}
                    {dur.minutes}m ago
                  </div>
                </div>

                <div className="flex gap-4 text-xs text-gray-500">
                  <span>{o.avgLatency}ms</span>
                  <span>{o.totalReqs.toLocaleString()} reqs</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}