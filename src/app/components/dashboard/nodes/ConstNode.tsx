

import { useState } from "react";

import {
  Handle,
  Position,
} from "@xyflow/react";

import pill from "@/app/components/dashboard/pill";

import {handleDot} from "@/app/components/dashboard/constants";


type ConstNodeData = {
  value?: string | number | boolean | unknown[];
  dtype: string;
};

function ConstNode({ data }: { data: ConstNodeData }) {
  const [local, setLocal] = useState<string | number | boolean | unknown[]>(() => String(data.value ?? ""));
  return (
    <div className="relative min-w-[320px] rounded-[24px] border bg-gradient-to-b from-gray-100 to-gray-200 p-4 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="text-xs font-extrabold tracking-[0.2em] text-gray-600">CONST</div>
        {pill(String(data.dtype).toUpperCase())}
      </div>
      <div className="mt-3">
        <input
          className="w-full rounded-2xl border bg-white px-4 py-3 text-sm shadow-inner outline-none focus:ring"
          value={String(local)}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={() => {
            let parsed: string | number | boolean | unknown[] = local;
            if (data.dtype === "number") parsed = Number(local);
            if (data.dtype === "boolean") parsed = local === "true";
            if (data.dtype === "list") { try { parsed = JSON.parse(String(local)); } catch { parsed = []; } if (!Array.isArray(parsed)) parsed = []; }
            data.value = parsed;
          }}
          placeholder={`value (${data.dtype})`}
        />
      </div>
      <Handle type="source" position={Position.Right} id="out" style={{ ...handleDot, right: -8, top: "50%", transform: "translateY(-50%)" }} />
    </div>
  );
}


export default ConstNode;