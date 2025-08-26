


function isObjectLike(v: any) {
  return v !== null && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length > 0;
}


function hasDeepKeyMatch(v: any, term: string): boolean {
  if (!term) return true;
  const t = term.toLowerCase();
  if (isObjectLike(v)) {
    for (const [k, val] of Object.entries(v)) {
      if (String(k).toLowerCase().includes(t)) return true;
      if (hasDeepKeyMatch(val as any, term)) return true;
    }
  } else if (Array.isArray(v)) {
    for (const item of v) {
      if (hasDeepKeyMatch(item, term)) return true;
    }
  }
  return false;
}

function valueTypeLabel(v: any): string {
  if (Array.isArray(v)) return `array(${v.length})`;
  if (isObjectLike(v)) return "object";
  if (v === null) return "null";
  return typeof v;
}


export {
    isObjectLike,
    hasDeepKeyMatch,
    valueTypeLabel
}