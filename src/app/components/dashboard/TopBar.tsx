
import ToolbarIconButton from "./ToolbarIconButton"

import IconPlus from "@/app/icons/IconPlus";
import IconInfo from "@/app/icons/IconInfo";

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


export default TopBar;