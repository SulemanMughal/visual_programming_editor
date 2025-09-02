function generatePythonProgram(nodes: Node[], edges: Edge[]): string {
  const { byTarget } = buildEdgeMaps(edges);
  const nodeMap = new Map<string, Node>(nodes.map((n) => [n.id, n]));

  const header = [""].join("\n");

  // ----- handle-aware expr resolver: exprOf(nodeId, sourceHandle?) -----
  const keyOf = (id: string, sh?: string | null) => `${id}::${sh ?? "__"}`;
  const visiting = new Set<string>();
  const memo = new Map<string, string>();

  const exprOf = (nodeId: string, sourceHandle?: string | null): string => {
    const k = keyOf(nodeId, sourceHandle);
    if (memo.has(k)) return memo.get(k)!;
    if (visiting.has(k)) return "None  # cycle";
    visiting.add(k);

    const node = nodeMap.get(nodeId);
    let expr = "None";
    if (!node) {
      visiting.delete(k);
      return expr;
    }

    switch (node.type) {
      case "field": {
        const d = node.data as NodeDataField;
        expr = `get_nested(row, ${pyQuote(d.path)})`;
        break;
      }
      case "const": {
        const d = node.data as NodeDataConst;
        expr = pyLiteral(d.dtype, d.value);
        break;
      }
      case "operator": {
        const d = node.data as NodeDataOperator;
        const spec = OPS[d.opId];
        if (!spec) break;

        const incoming = byTarget[node.id] || [];
        const argExpr: Record<string, string> = {};
        (spec.inputs || []).forEach((inp) => {
          const edge = incoming.find((e) => e.targetHandle === inp.id);
          argExpr[inp.id] = edge ? exprOf(edge.source, edge.sourceHandle ?? null) : "None";
        });

        const py = spec.toPy ? spec.toPy(argExpr) : undefined;

        if (typeof py === "string") {
          expr = py;
        } else if (py && typeof py === "object") {
          const want =
            sourceHandle ||
            (Array.isArray((spec as any).outputs) && (spec as any).outputs[0]?.id) ||
            null;
          expr = (want && (py as Record<string, string>)[want]) || "None";
        } else {
          expr = "None";
        }
        break;
      }
      case "output": {
        const inc = (byTarget[node.id] || [])[0];
        expr = inc ? exprOf(inc.source, inc.sourceHandle ?? null) : "None";
        break;
      }
      default:
        expr = "None";
    }

    visiting.delete(k);
    memo.set(k, expr);
    return expr;
  };

  // ----- utilities to detect while-body ancestry -----
  const edgesByTarget: Record<string, Edge[]> = byTarget;
  const nodeById = nodeMap;

  function isUnderWhileBody(nodeId: string): boolean {
    const seen = new Set<string>();
    const stack = [nodeId];
    while (stack.length) {
      const id = stack.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      const incomers = edgesByTarget[id] || [];
      for (const e of incomers) {
        const src = nodeById.get(e.source) as any;
        if (src?.type === "operator" && src?.data?.opId === "while_loop" && e.sourceHandle === "body") {
          return true;
        }
        stack.push(e.source);
      }
    }
    return false;
  }

  function nearestDrivingWhile(nodeId: string): Node | null {
    const seen = new Set<string>();
    const stack = [nodeId];
    while (stack.length) {
      const id = stack.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      const incomers = edgesByTarget[id] || [];
      for (const e of incomers) {
        const src = nodeById.get(e.source) as any;
        if (src?.type === "operator" && src?.data?.opId === "while_loop" && e.sourceHandle === "body") {
          return src as Node;
        }
        stack.push(e.source);
      }
    }
    return null;
  }

  // ----- outputs -----
  const outputs = nodes.filter((n) => n.type === "output");
  if (outputs.length === 0) {
    return (
      header +
      [
        "def compute(row):",
        "    # No outputs; add an Output node and connect it.",
        "    return {}",
        "",
      ].join("\n")
    );
  }

  const body: string[] = ["def compute(row):", "    _results = {}"];

  outputs.forEach((n, i) => {
    const label = (n.data as NodeDataOutput).label || `result_${i + 1}`;
    const labelPy = pyQuote(label);

    if (!isUnderWhileBody(n.id)) {
      body.push(`    _results[${labelPy}] = ${exprOf(n.id)}`);
      return;
    }

    // Under a while body → emit a loop for this output
    const w = nearestDrivingWhile(n.id);
    if (!w) {
      body.push(`    _results[${labelPy}] = ${exprOf(n.id)}`);
      return;
    }

    const incW = edgesByTarget[w.id] || [];
    const edgeCond = incW.find((e) => e.targetHandle === "cond");
    const edgeMax  = incW.find((e) => e.targetHandle === "max");

    const condPy = edgeCond ? exprOf(edgeCond.source, edgeCond.sourceHandle ?? null) : "False";
    const maxPy  = edgeMax  ? exprOf(edgeMax.source,  edgeMax.sourceHandle  ?? null) : "1000";

    const valueExpr = exprOf(n.id);

    // NEW: evaluate all dynamic expressions attached to this While (data.exprs)
    const whileData = (w.data as any) || {};
    const exprHandles: string[] = Array.isArray(whileData.exprs) ? whileData.exprs : [];

    const exprLines: string[] = [];
    for (const hid of exprHandles) {
      const e = incW.find((x) => x.targetHandle === hid);
      if (!e) continue;
      const ePy = exprOf(e.source, e.sourceHandle ?? null);
      exprLines.push(`        _ = ${ePy}`);
    }

    body.push(
      `    _i = 0`,
      `    _last_val = None`,
      `    while (bool(${condPy})) and _i < int(${maxPy}):`,
      ...(exprLines.length ? exprLines : []),      // run extra expressions each iteration
      `        _iter_val = ${valueExpr}`,
      `        if _iter_val is not None:`,
      `            _last_val = _iter_val`,
      `        _i += 1`,
      `    _results[${labelPy}] = _last_val`
    );
  });

  body.push("    return _results");

  return header + "\n" + body.join("\n") + "\n";
}
