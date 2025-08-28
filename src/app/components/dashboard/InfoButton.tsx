
import {useState, useRef, useEffect} from "react"

interface InfoButtonProps {
  text: string;
}

function InfoButton({ text }: InfoButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onDoc = (e: PointerEvent) => {
        if (!ref.current) return;
        if (!open) return;
        if (!(ref.current as HTMLElement).contains(e.target as HTMLElement)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Show operator help"
        className="grid h-6 w-6 place-items-center rounded-full border-2 border-sky-300 bg-white text-[11px] font-bold text-sky-700 shadow-sm"
      >
        i
      </button>
      {open && (
        <div role="tooltip" className="absolute right-0 z-50 mt-2 w-64 rounded-xl border bg-white p-3 text-xs leading-5 text-gray-700 shadow-xl">
          {text}
        </div>
      )}
    </div>
  );
}


export default InfoButton;