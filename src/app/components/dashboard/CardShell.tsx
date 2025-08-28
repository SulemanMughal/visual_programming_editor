interface CardShellProps {
  title: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
}

function CardShell({ title, rightSlot, children }: CardShellProps) {
  return (
    <div className="relative min-w-[380px] rounded-[28px] border bg-gradient-to-b from-gray-100 to-gray-200 p-4 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="text-xs font-extrabold tracking-[0.2em] text-gray-600">{title}</div>
        <div className="flex items-center gap-2">{rightSlot}</div>
      </div>
      {children}
    </div>
  );
}


export default CardShell;