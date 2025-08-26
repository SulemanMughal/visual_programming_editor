function ToolbarIconButton({
  title,
  children,
  onClick,
}: {
  title: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-md border border-neutral-800/70 bg-neutral-900 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      {children}
    </button>
  );
}


export default ToolbarIconButton;