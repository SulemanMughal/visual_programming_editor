"use client";
import React from "react";

export type ClickItem = {
  id: string;        // dot path (unique)
  name: string;      // key name
  path: string[];    // segments
  count: number;     // how many times clicked
};

export default function ClickedKeysPanel({
  items,
  onRemove,
  onClear,
}: {
  items: ClickItem[];
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="rounded-md border border-gray-200 shadow-sm bg-white">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Clicked Keys</h3>
        <div className="text-sm text-gray-600">
          {items.length} unique {items.length === 1 ? "key" : "keys"}
        </div>
      </div>

      <div className="p-3 flex flex-wrap gap-2">
        {items.length === 0 ? (
          <div className="text-gray-400 text-sm">No clicks yet. Click any key in the tree.</div>
        ) : (
          items.map((it) => (
            <div
              key={it.id}
              className="group flex items-center gap-2 bg-[#E6F4FF] text-blue-800 px-2.5 py-1 rounded border border-blue-200 text-[12px] font-mono max-w-full"
              title={it.id}
            >
              <span className="truncate">{it.id}</span>
              <span className="inline-flex items-center justify-center h-5 px-2 rounded bg-white/80 text-blue-700 border border-blue-200">
                ×{it.count}
              </span>
              <button
                onClick={() => onRemove(it.id)}
                className="inline-flex items-center justify-center w-4 h-4 rounded border border-blue-300 text-blue-700 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600"
                title="Remove"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      {items.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-200">
          <button
            onClick={onClear}
            className="text-sm text-red-600 hover:underline"
            title="Clear all"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
