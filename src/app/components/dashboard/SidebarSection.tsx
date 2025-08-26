
import IconChevron from "@/app/icons/IconChevron";

import { useState } from "react"

function SidebarSection({
  title,
  actions,
  children,
  defaultOpen = false,
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

      <div className={`mt-2 overflow-hidden transition-all ${open ? "overflow-y-auto" : "max-h-0"}`}>
        {children}
      </div>
    </div>
  );
}

export default SidebarSection;
