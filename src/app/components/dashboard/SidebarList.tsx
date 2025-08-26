
import {useMemo} from "react";

function SidebarList({
  items,
  filter,
  renderExtra,
}: {
  
  items: { id: number; name: string; file?: string, content_type : string, file_size : number, created_at : string }[] | any[];
  filter: string;
  renderExtra?: (item: { id: string; name: string; type?: string }) => React.ReactNode;
}) {
  
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.name.toLowerCase().includes(q));
  }, [filter, items]);

  return (
    <ul className="space-y-1 h-[200px] overflow-y-auto">
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

export default SidebarList;