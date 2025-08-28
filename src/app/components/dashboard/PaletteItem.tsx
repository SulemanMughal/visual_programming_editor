type PaletteItemProps = {
  type: string;
  label: string;
  payload: unknown;
};

function PaletteItem({ type, label, payload }: PaletteItemProps) {
  const onDragStart = (e: React.DragEvent<HTMLDivElement>) => { e.dataTransfer.setData("application/reactflow", JSON.stringify({ type, payload })); e.dataTransfer.effectAllowed = "move"; };
  return (
    <div draggable onDragStart={onDragStart} className="cursor-move rounded-md border border-transparent px-2 py-1.5 text-left text-sm text-neutral-300 border-neutral-800/50 bg-neutral-900">{label}</div>
  );
}


export default PaletteItem;