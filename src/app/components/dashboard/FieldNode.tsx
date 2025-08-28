
import { useState } from "react";

import { isObjectLike , hasDeepKeyMatch} from "./utils"
import PaletteItem from "./PaletteItem"

function FieldNode({ label, value, depth = 0, filter }: { label: string; value: any; depth?: number; filter: string }) {
  const nestedArray = Array.isArray(value) && value.some((x) => isObjectLike(x));
  const isNested = isObjectLike(value) || nestedArray;

  const visibleByFilter = !filter
    ? true
    : label.toLowerCase().includes(filter.toLowerCase()) || hasDeepKeyMatch(value, filter);

  const [open, setOpen] = useState<boolean>(false);

  if (!visibleByFilter) return null;

  // console.debug(label, " : ", value)

  return (
    <div className="text-sm">
      <div
        className="group flex items-center justify-between rounded-md border border-transparent px-2 py-1.5 hover:border-neutral-800/70 hover:bg-neutral-900"
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        <div className="flex items-center gap-2">
          {isNested ? (
            <button
              type="button"
              aria-label={open ? "Collapse" : "Expand"}
              onClick={() => setOpen((o) => !o)}
              className="flex h-5 w-5 items-center justify-center rounded border border-neutral-800/70 bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
            >
              <span className="-mt-px text-xs">{open ? "−" : "+"}</span>
            </button>
          ) : (
            <span className="inline-block h-5 w-5" />
          )}
          {/* <span className="text-neutral-300">{label}</span> */}
          {/* <PaletteItem type="output" label="Output" payload={{ label: "Result" }} /> */}
          <PaletteItem key={label} type="field" label={`Field: ${label}`} payload={{ path: label, dtype: "number" }} />
        </div>
        {/* <span className="text-xs text-neutral-500">{valueTypeLabel(value)}</span> */}
      </div>

      {isNested && open && (
        <div className="mt-1 space-y-1">
          {Array.isArray(value)
            ? (value as any[]).map((item, idx) =>
                isObjectLike(item) ? (
                  <FieldNode key={idx} label={`[${idx}]`} value={item} depth={depth + 1} filter={filter} />
                ) : (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-md border border-transparent px-2 py-1.5 text-sm hover:border-neutral-800/70 hover:bg-neutral-900"
                    style={{ paddingLeft: 8 + (depth + 1) * 14 }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-5 w-5" />
                      <span className="text-neutral-300">[{idx}]</span>
                    </div>
                    {/* <span className="text-xs text-neutral-500">{valueTypeLabel(item)}</span> */}
                  </div>
                )
              )
            : Object.entries(value as any).map(([k, v]) => (
                <FieldNode key={k} label={k} value={v} depth={depth + 1} filter={filter} />
              ))}
        </div>
      )}
    </div>
  );
}


export default FieldNode;