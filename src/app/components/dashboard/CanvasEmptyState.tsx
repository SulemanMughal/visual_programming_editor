function CanvasEmptyState() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="rounded-xl border border-neutral-800/70 bg-neutral-900/30 px-4 py-2 text-sm text-neutral-400 backdrop-blur">
        Drop nodes here or click a dataset to start
      </div>
    </div>
  );
}


export default CanvasEmptyState;