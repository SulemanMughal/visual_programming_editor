"use client";
import React, { useMemo, useState } from "react";

/**
 * Next.js + Tailwind component-based dark studio UI
 * -------------------------------------------------
 * - Left sidebar with search + collapsible sections (Datasets, Fields)
 * - Center canvas with dark grid background (like a diagramming surface)
 * - Optional right inspector panel (placeholder) you can extend later
 * - All pure Tailwind, no external UI libs required
 *
 * Copy this file into your Next.js app (e.g., `app/studio/page.tsx`).
 * Tailwind required. Works with the App Router (Next 13/14+).
 */

// -----------------------------
// Mock data
// -----------------------------
const DATASETS = [
  { id: "orders", name: "Orders" },
  { id: "customers", name: "Customers" },
  { id: "products", name: "Products" },
  { id: "invoices", name: "Invoices" },
];

const FIELD_DATA = [
  {
    "idProperty": "666",
    "idLoan": "800000011",
    "propertyName": "Centre Court",
    "address1": "1268 Madera Road",
    "address2": "",
    "city": "Simi Valley",
    "state": "CA",
    "zipcode": "93065",
    "county": "Ventura",
    "yearBuilt": "0.0",
    "sqFootage": "0.0",
    "region": "SOUTH_WEST",
    "acliRegion": "PACIFIC",
    "propType": "RT-RETAIL",
    "systemType": "RETAIL",
    "netSqFootage": "162903.0",
    "renovDate": null,
    "buildings": "0.0",
    "parking": "0.0",
    "stories": "0.0",
    "noUnits": "0.0",
    "seismicZone": "",
    "seismicPml": "0.0",
    "seismicSul": "0.0",
    "latitude": "34.2616858",
    "longitude": "-118.7946734",
    "tier1Wind": "",
    "appraisalType": null,
    "replacementValue": null,
    "appraisalDate": null,
    "statementDate": null,
    "annualizedRent": null,
    "typeOpStatement": null,
    "frequency": null,
    "relatedLoans": [
      {
        "idLoan": "800000011",
        "LienPos": "1.0",
        "LoanKind": "LIFE_COMPANY",
        "Sponsor": "Miracle Mile Properties, LP",
        "Analyst": null,
        "CBalance": 9472684.85,
        "certificateHolder": [],
        "BorrowerLegalName": ["Miracle Mile Properties, LP"]
      }
    ],
    "floodZones": []
  }
];

// -----------------------------
// Primitives
// -----------------------------
const IconChevron = ({ open }: { open?: boolean }) => (
  <svg
    className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`}
    viewBox="0 0 20 20"
    fill="currentColor"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
      clipRule="evenodd"
    />
  </svg>
);

const IconPlus = () => (
  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
    <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
  </svg>
);

const IconInfo = () => (
  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
    <path
      fillRule="evenodd"
      d="M18 10A8 8 0 11 2 10a8 8 0 0116 0zM9 9a1 1 0 112 0v5a1 1 0 11-2 0V9zm1-4a1 1 0 100 2 1 1 0 000-2z"
      clipRule="evenodd"
    />
  </svg>
);

const IconEdit = () => (
  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
    <path d="M13.586 3.586a2 2 0 112.828 2.828l-9.9 9.9a1 1 0 01-.39.243l-3 1a1 1 0 01-1.265-1.265l1-3a1 1 0 01.243-.39l9.9-9.9z" />
  </svg>
);

const IconX = () => (
  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
    <path
      fillRule="evenodd"
      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
      clipRule="evenodd"
    />
  </svg>
);

const IconSearch = () => (
  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
    <path
      fillRule="evenodd"
      d="M12.9 14.32a8 8 0 111.414-1.414l3.387 3.387a1 1 0 01-1.414 1.414l-3.387-3.387zM14 8a6 6 0 11-12 0 6 6 0 0112 0z"
      clipRule="evenodd"
    />
  </svg>
);

function ToolbarIconButton({
  title,
  children,
  onClick,
}: {
  title: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-md border border-neutral-800/70 bg-neutral-900 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      {children}
    </button>
  );
}

// -----------------------------
// Sidebar
// -----------------------------
function SidebarSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="relative block">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-neutral-500">
        <IconSearch />
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type / to search"
        className="w-full rounded-lg border border-neutral-800/70 bg-neutral-900 pl-9 pr-3 py-2 text-sm text-neutral-200 placeholder-neutral-500 outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </label>
  );
}

function SidebarSection({
  title,
  actions,
  children,
  defaultOpen = true,
}: {
  title: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="select-none">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setOpen((o) => !o)}
          className="group flex items-center gap-2 text-left text-sm font-medium text-neutral-300 hover:text-neutral-100"
        >
          <IconChevron open={open} />
          <span>{title}</span>
        </button>
        <div className="flex items-center gap-1">{actions}</div>
      </div>

      <div className={`mt-2 overflow-hidden transition-all ${open ? "max-h-96" : "max-h-0"}`}>
        {children}
      </div>
    </div>
  );
}

function SidebarList({
  items,
  filter,
  renderExtra,
}: {
  items: { id: string; name: string; type?: string }[];
  filter: string;
  renderExtra?: (item: { id: string; name: string; type?: string }) => React.ReactNode;
}) {
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.name.toLowerCase().includes(q));
  }, [filter, items]);

  return (
    <ul className="space-y-1">
      {filtered.map((item) => (
        <li key={item.id} className="group">
          <button
            className="flex w-full items-center justify-between rounded-md border border-transparent px-2 py-1.5 text-left text-sm text-neutral-300 hover:border-neutral-800/70 hover:bg-neutral-900"
            onClick={() => console.log("clicked", item)}
          >
            <span className="truncate">{item.name}</span>
            <span className="text-xs text-neutral-500 group-hover:text-neutral-400">{item.type ?? ""}</span>
          </button>
          {renderExtra?.(item)}
        </li>
      ))}
      {filtered.length === 0 && (
        <li className="rounded-md border border-dashed border-neutral-800/70 px-3 py-4 text-center text-xs text-neutral-500">
          No results
        </li>
      )}
    </ul>
  );
}

function Sidebar() {
  const [query, setQuery] = useState("");

  return (
    <aside className="h-full w-72 shrink-0 border-r border-neutral-800/70 bg-neutral-950 p-3">
      <div className="flex flex-col gap-4">
        <SidebarSearch value={query} onChange={setQuery} />

        <SidebarSection
          title="Datasets"
          actions={
            <div className="flex items-center gap-1">
              <ToolbarIconButton title="New dataset">
                <IconPlus />
              </ToolbarIconButton>
              <ToolbarIconButton title="Info">
                <IconInfo />
              </ToolbarIconButton>
              <ToolbarIconButton title="Edit">
                <IconEdit />
              </ToolbarIconButton>
              <ToolbarIconButton title="Remove">
                <IconX />
              </ToolbarIconButton>
            </div>
          }
        >
          <div className="mt-2">
            <SidebarList items={DATASETS} filter={query} />
          </div>
        </SidebarSection>

        <div className="h-px w-full bg-neutral-800/70" />

        <SidebarSection title="Fields" defaultOpen>
          <div className="mt-2">
            <FieldsTree data={FIELD_DATA} filter={query} />
          </div>
        </SidebarSection>
      </div>
    </aside>
  );
}

// -----------------------------
// Fields Tree (nested +/-)
// -----------------------------
function isObjectLike(v: any) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function hasDeepKeyMatch(v: any, term: string): boolean {
  if (!term) return true;
  const t = term.toLowerCase();
  if (isObjectLike(v)) {
    for (const [k, val] of Object.entries(v)) {
      if (String(k).toLowerCase().includes(t)) return true;
      if (hasDeepKeyMatch(val as any, term)) return true;
    }
  } else if (Array.isArray(v)) {
    for (const item of v) {
      if (hasDeepKeyMatch(item, term)) return true;
    }
  }
  return false;
}

function valueTypeLabel(v: any): string {
  if (Array.isArray(v)) return `array(${v.length})`;
  if (isObjectLike(v)) return "object";
  if (v === null) return "null";
  return typeof v;
}

function FieldNode({ label, value, depth = 0, filter }: { label: string; value: any; depth?: number; filter: string }) {
  const nestedArray = Array.isArray(value) && value.some((x) => isObjectLike(x));
  const isNested = isObjectLike(value) || nestedArray;

  const visibleByFilter = !filter
    ? true
    : label.toLowerCase().includes(filter.toLowerCase()) || hasDeepKeyMatch(value, filter);

  const [open, setOpen] = useState<boolean>(false);

  if (!visibleByFilter) return null;

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
          <span className="text-neutral-300">{label}</span>
        </div>
        <span className="text-xs text-neutral-500">{valueTypeLabel(value)}</span>
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
                    <span className="text-xs text-neutral-500">{valueTypeLabel(item)}</span>
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

function FieldsTree({ data, filter }: { data: any; filter: string }) {
  const root = Array.isArray(data) ? data[0] ?? {} : data ?? {};
  return (
    <div className="space-y-1">
      {Object.entries(root as any).map(([k, v]) => (
        <FieldNode key={k} label={k} value={v} depth={0} filter={filter} />
      ))}
    </div>
  );
}

// -----------------------------
// Canvas (center)
// -----------------------------
function CanvasGrid() {
  // Two-layer grid: fine (20px) + bold (100px)
  const style: React.CSSProperties = {
    backgroundColor: "#0f1216",
    backgroundImage:
      "linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px)," +
      "linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)," +
      "linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px)," +
      "linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)",
    backgroundSize: "20px 20px, 20px 20px, 100px 100px, 100px 100px",
    backgroundPosition: "0 0, 0 0, 0 0, 0 0",
  };

  return <div className="absolute inset-0" style={style} />;
}

function CanvasEmptyState() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="rounded-xl border border-neutral-800/70 bg-neutral-900/30 px-4 py-2 text-sm text-neutral-400 backdrop-blur">
        Drop nodes here or click a dataset to start
      </div>
    </div>
  );
}

function Canvas() {
  return (
    <main className="relative h-full w-full overflow-hidden">
      <CanvasGrid />
      <CanvasEmptyState />
    </main>
  );
}

// -----------------------------
// Right panel (placeholder)
// -----------------------------
function RightPanel() {
  return (
    <aside className="hidden xl:block h-full w-80 shrink-0 border-l border-neutral-800/70 bg-neutral-950/70 p-4">
      <div className="mb-3 text-sm font-medium text-neutral-300">Inspector</div>
      <div className="rounded-lg border border-neutral-800/70 bg-neutral-900 p-3 text-sm text-neutral-400">
        Select an item to see its properties.
      </div>
    </aside>
  );
}

// -----------------------------
// Top bar
// -----------------------------
function TopBar() {
  return (
    <header className="flex items-center justify-between border-b border-neutral-800/70 bg-neutral-950/80 px-4 py-2">
      <div className="text-sm font-medium text-neutral-300">Dark Studio</div>
      <div className="flex items-center gap-2">
        <ToolbarIconButton title="New">
          <IconPlus />
          <span>New</span>
        </ToolbarIconButton>
        <ToolbarIconButton title="Info">
          <IconInfo />
        </ToolbarIconButton>
      </div>
    </header>
  );
}

// -----------------------------
// Shell (page)
// -----------------------------
export default function DarkStudioPage() {
  return (
    <div className="flex h-screen w-full flex-col bg-[#0b0e12] text-neutral-200">
      <TopBar />

      <div className="flex h-[calc(100vh-40px)] w-full overflow-hidden">
        <Sidebar />
        <Canvas />
        <RightPanel />
      </div>
    </div>
  );
}
