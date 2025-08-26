
import FieldNode from "./FieldNode"

function FieldsTree({ data, filter }: { data: any; filter: string }) {
  const root = Array.isArray(data) ? data[0] ?? {} : data ?? {};
  return (
    <div className="space-y-1 h-[calc(100vh-12rem)] overflow-y-auto pb-[24px]">
      {Object.entries(root as any).map(([k, v]) => (
        <FieldNode key={k} label={k} value={v} depth={0} filter={filter} />
      ))}
    </div>
  );
}


export default FieldsTree;