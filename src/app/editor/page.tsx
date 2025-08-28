"use client";
import {
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import "./style.css"


import CanvasUI from "@/app/components/dashboard/nodes/CanvasUI"

export default function Page() {
  return (
    <div className="p-4 h-[100vh]">
      <ReactFlowProvider>
        <CanvasUI />
      </ReactFlowProvider>
    </div>
  );
}
