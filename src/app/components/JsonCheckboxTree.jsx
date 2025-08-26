"use client";
import React, { useState, useMemo } from "react";
import { FixedSizeList as List } from "react-window";

// Leaf Node
const JsonLeaf = React.memo(({ keyName, value, path, checkedKeys, onCheckChange }) => {
  const key = path.join(".");
  return (
    <div className="ml-6 py-1">
      <label className="flex items-center gap-2 cursor-pointer bg-gray-50 rounded px-2 transition duration-150 whitespace-nowrap overflow-x-auto w-full">
        <input
          type="checkbox"
          checked={!!checkedKeys[key]}
          onChange={(e) => onCheckChange(key, e.target.checked)}
          className="accent-blue-600 w-4 h-4 flex-shrink-0"
        />
        <span className="text-gray-900 text-sm font-mono truncate max-w-[400px]">
          <span className="inline-block mr-1">🗝️</span>
          <span className="font-semibold">{keyName}</span>: <span className="text-gray-500">{String(value)}</span>
        </span>
      </label>
    </div>
  );
});

// Virtualized children
function VirtualizedChildren({ items, renderItem, height = 400, itemSize = 32 }) {
  return (
    <List height={height} itemCount={items.length} itemSize={itemSize} width="100%">
      {({ index, style }) => <div style={style}>{renderItem(items[index], index)}</div>}
    </List>
  );
}

// Recursive Node
const JsonNode = React.memo(({ data, path = [], onCheckChange, checkedKeys }) => {
  const [expanded, setExpanded] = useState(true);
  const handleToggle = () => setExpanded((v) => !v);

  const keys = useMemo(() => (data && typeof data === "object" && !Array.isArray(data) ? Object.keys(data) : []), [data]);

  if (typeof data !== "object" || data === null) {
    return <JsonLeaf keyName={path[path.length - 1]} value={data} path={path} checkedKeys={checkedKeys} onCheckChange={onCheckChange} />;
  }

  // Array Node
  if (Array.isArray(data)) {
    return (
      <div className="ml-4 border-l-2 border-gray-200 pl-3">
        <div
          className="cursor-pointer font-medium flex items-center gap-2 px-2 py-1 bg-blue-50 rounded transition duration-150"
          onClick={handleToggle}
        >
          <span className="inline-block text-blue-600">{expanded ? "▼" : "▶"}</span>
          <span className="inline-block">{path[path.length - 1]} <span className="text-xs text-gray-400">[Array:{data.length}]</span></span>
        </div>
        {expanded && (
          <VirtualizedChildren
            items={data}
            renderItem={(item, idx) => <JsonNode key={idx} data={item} path={[...path, idx]} onCheckChange={onCheckChange} checkedKeys={checkedKeys} />}
            height={Math.min(400, data.length * 32)}
            itemSize={32}
          />
        )}
      </div>
    );
  }

  // Object Node
  return (
    <div className="ml-4 border-l-2 border-gray-200 pl-3">
      {path.length > 0 && (
        <div
          className="cursor-pointer font-medium flex items-center gap-2 px-2 py-1 bg-blue-50 rounded transition duration-150"
          onClick={handleToggle}
        >
          <span className="inline-block text-blue-600">{expanded ? "▼" : "▶"}</span>
          <span className="inline-block">{path[path.length - 1]}</span>
        </div>
      )}
      {expanded && (
        <VirtualizedChildren
          items={keys}
          renderItem={(key) => <JsonNode key={key} data={data[key]} path={[...path, key]} onCheckChange={onCheckChange} checkedKeys={checkedKeys} />}
          height={Math.min(400, keys.length * 32)}
          itemSize={32}
        />
      )}
    </div>
  );
});

// Main Component
export default function JsonCheckboxTree({ jsonData }) {
  const [checkedKeys, setCheckedKeys] = useState(() => new Set());
  const [search, setSearch] = useState("");

  const handleCheckChange = (key, value) => {
    setCheckedKeys((prev) => {
      const next = new Set(prev);
      if (value) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  // Filtered keys for search (optional: recursive search)
  const filteredJson = useMemo(() => {
    if (!search) return jsonData;
    const filterRecursive = (obj) => {
      if (typeof obj !== "object" || obj === null) return obj;
      if (Array.isArray(obj)) return obj.map(filterRecursive);
      const res = {};
      Object.keys(obj).forEach((k) => {
        if (k.toLowerCase().includes(search.toLowerCase())) res[k] = obj[k];
        else {
          const child = filterRecursive(obj[k]);
          if (child && (typeof child === "object" ? Object.keys(child).length : true)) res[k] = child;
        }
      });
      return res;
    };
    return filterRecursive(jsonData);
  }, [jsonData, search]);

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg max-h-[700px] overflow-auto border border-gray-100">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white pb-3 mb-3 border-b border-gray-100">
        <h1 className="text-2xl font-extrabold text-blue-700 tracking-tight">JSON Checkbox Tree</h1>
        <p className="text-gray-500 text-sm">Browse and select keys from your JSON file.</p>
        <input
          type="text"
          placeholder="Search keys..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mt-2 w-full px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-200"
        />
      </div>

      {/* Tree */}
      <div className="overflow-x-auto">
        <JsonNode data={filteredJson} path={[]} onCheckChange={handleCheckChange} checkedKeys={Object.fromEntries([...checkedKeys].map(k => [k, true]))} />
      </div>

      {/* Checked Keys */}
      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
        <h2 className="font-bold mb-2 text-blue-700 text-lg">Checked Keys ({checkedKeys.size})</h2>
        <div className="flex flex-wrap gap-2">
          {[...checkedKeys].length === 0 ? (
            <span className="text-gray-400">No keys selected.</span>
          ) : (
            [...checkedKeys].map((k) => (
              <span key={k} className="bg-blue-100 text-blue-800 px-3 py-1 rounded text-sm font-mono border border-blue-200 truncate max-w-[200px]" title={k}>
                {k}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
