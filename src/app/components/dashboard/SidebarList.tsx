
import {useMemo, useState} from "react";

import DeleteModal from "./DeleteModal";
import IconDelete from "@/app/icons/IconDelete";
import { deleteFile } from "@/app/services/file";
import { notifySuccess, notifyError } from "@/app/utils/toast";

function SidebarList({
  items,
  filter,
  renderExtra,
}: {
  items: { id: number; name: string; file?: string, content_type : string, file_size : number, created_at : string }[] | any[];
  filter: string;
  renderExtra?: (item: { id: string; name: string; type?: string }) => React.ReactNode;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<any>(null);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.name.toLowerCase().includes(q));
  }, [filter, items]);

  const handleDeleteClick = (item: any) => {
    setPendingDelete(item);
    setShowConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (pendingDelete) {
      try {
        await deleteFile(pendingDelete.id);
        notifySuccess("File deleted successfully.");
        // Remove deleted item from UI
        if (typeof items === 'object' && Array.isArray(items)) {
          const idx = items.findIndex((i) => i.id === pendingDelete.id);
          if (idx !== -1) items.splice(idx, 1);
        }
      } catch (err) {
        notifyError("Failed to delete file.");
        console.error("Delete failed", err);
      }
    }
    setShowConfirm(false);
    setPendingDelete(null);
  };

  const handleCancelDelete = () => {
    setShowConfirm(false);
    setPendingDelete(null);
  };

  return (
    <>
      <ul className="space-y-1 h-[200px] overflow-y-auto">
        {filtered.map((item) => (
          <li key={item.id} className="group relative">
            <button
              className="flex w-full items-center justify-between rounded-md border border-transparent px-2 py-1.5 text-left text-sm text-neutral-300 hover:border-neutral-800/70 hover:bg-neutral-900"
            >
              <span className="truncate">{item.name}</span>
              <span className="text-xs text-neutral-500 group-hover:text-neutral-400">{item.type ?? ""}</span>
            </button>
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-700 hover:bg-red-800 hover:cursor-pointer text-white rounded-full p-1"
              title="Delete"
              onClick={() => handleDeleteClick(item)}
            >
              <IconDelete />
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
      {showConfirm && (
        <DeleteModal handleCancelDelete={handleCancelDelete} handleConfirmDelete={handleConfirmDelete} pendingDelete={pendingDelete} />
      )}
    </>
  );
}

export default SidebarList;