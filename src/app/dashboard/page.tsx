"use client";

import React from "react";

import { ToastContainer } from 'react-toastify';

import Sidebar from "@/app/components/dashboard/Sidebar";

import Canvas from "@/app/components/dashboard/Canvas";

import TopBar from "@/app/components/dashboard/TopBar";

export default function DarkStudioPage() {
  return (
    <>
    <ToastContainer />
    <div className="flex h-screen w-full flex-col bg-[#0b0e12] text-neutral-200">
      <TopBar />

      <div className="flex h-[calc(100vh-40px)] w-full overflow-hidden">
        <Sidebar />
        <Canvas />
        {/* <RightPanel /> */}
      </div>
    </div>
    </>
  );
}
