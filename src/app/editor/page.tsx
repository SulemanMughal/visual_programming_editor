"use client";

// import React, { 
//   useCallback, useEffect, useMemo, 
//   // useRef, 
//   useState } from "react";
import {
  // ReactFlow,
  ReactFlowProvider,
  // Background,
  // Controls,
  // MiniMap,
  // addEdge,
  // useNodesState,
  // useEdgesState,
  // Handle,
  // Position,
  // Connection,
  // Edge,
  // useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// import sidebar
// import Sidebar from "@/app/components/dashboard/Sidebar";
// import {ALL_OPERATORS, 
//   // OP_HELP, handleDot
// } from "@/app/components/dashboard/constants";

// import {
//   flattenPaths,
//   getByPath,
//   buildEdgeMaps,
//   generatePythonProgram
// } from "@/app/components/dashboard/utils";

// import pill from "@/app/components/dashboard/pill";

// import InfoButton from "@/app/components/dashboard/InfoButton"

// import CardShell from "@/app/components/dashboard/CardShell"

// import FieldNodeUI from "@/app/components/dashboard/nodes/FieldNodeUI"

// import ConstNode from "@/app/components/dashboard/nodes/ConstNode"

// import OperatorNode from "@/app/components/dashboard/nodes/OperatorNode"

// import OutputNode from "@/app/components/dashboard/nodes/OutputNode"

import CanvasUI from "@/app/components/dashboard/nodes/CanvasUI"

/**
 * Visual Programming Editor — Prominent, self‑explanatory node UI
 * - Clean card layout for nodes with bold headers & dtype pills
 * - Precisely centered handles per input row
 * - Python code generation with a toggleable side panel
 * - Loop/list ops: Range, Sum, Map +, Map ×, Length
 */

// /** @typedef {"number"|"string"|"boolean"|"date"|"list"|"any"} DType */
// /** @typedef {{id:string,dtype:DType,label?:string}} Port */
// /** @typedef {{id:string,label:string,inputs:Port[],output:Port,eval:(args:any)=>any,toPy?:(args:any)=>string}} OperatorSpec */

// /** @type {Record<string, OperatorSpec>} */
// const OPS = ALL_OPERATORS;

// Demo record used by Field palette & evaluation
// const sampleRecord = {
//   id: 1,
//   price: 99.99,
//   quantity: 3,
//   discount: 0.1,
//   customer: { name: "Jane Doe", city: "Simi Valley", state: "CA" },
//   created_at: "2025-01-15",
// };

// ---------- Node UI ----------


// const nodeTypes = { field: FieldNodeUI, const: ConstNode, operator: OperatorNode, output: OutputNode };



export default function Page() {
  return (
    <div className="p-4 h-[100vh]">
      <ReactFlowProvider>
        <CanvasUI />
      </ReactFlowProvider>
    </div>
  );
}
