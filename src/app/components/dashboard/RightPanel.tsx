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


export default RightPanel;