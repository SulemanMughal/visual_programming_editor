
import CanvasGrid from "./CanvasGrid";

import CanvasEmptyState from "./CanvasEmptyState";

function Canvas() {
  return (
    <main className="relative h-full w-full overflow-hidden">
      <CanvasGrid />
      <CanvasEmptyState />
    </main>
  );
}


export default Canvas;