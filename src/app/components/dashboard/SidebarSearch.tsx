
import IconSearch from "@/app/icons/IconSearch";

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


export default SidebarSearch;