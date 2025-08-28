const OPS = {
  add: {
    id: "add",
    label: "Add",
    inputs: [
      { id: "a", dtype: "number", label: "A" },
      { id: "b", dtype: "number", label: "B" },
    ],
    output: { id: "out", dtype: "number" },
    eval: ({ a, b }) => Number(a ?? 0) + Number(b ?? 0),
    toPy: ({ a, b }) => `(${a} + ${b})`,
  },
  subtract: {
    id: "subtract",
    label: "Subtract",
    inputs: [
      { id: "a", dtype: "number", label: "A" },
      { id: "b", dtype: "number", label: "B" },
    ],
    output: { id: "out", dtype: "number" },
    eval: ({ a, b }) => Number(a ?? 0) - Number(b ?? 0),
    toPy: ({ a, b }) => `(${a} - ${b})`,
  },
  multiply: {
    id: "multiply",
    label: "Multiply",
    inputs: [
      { id: "a", dtype: "number", label: "A" },
      { id: "b", dtype: "number", label: "B" },
    ],
    output: { id: "out", dtype: "number" },
    eval: ({ a, b }) => Number(a ?? 0) * Number(b ?? 0),
    toPy: ({ a, b }) => `(${a} * ${b})`,
  },
  divide: {
    id: "divide",
    label: "Divide",
    inputs: [
      { id: "a", dtype: "number", label: "A" },
      { id: "b", dtype: "number", label: "B" },
    ],
    output: { id: "out", dtype: "number" },
    eval: ({ a, b }) => {
      const d = Number(b ?? 0);
      return d === 0 ? null : Number(a ?? 0) / d;
    },
    toPy: ({ a, b }) => `(${a} / ${b})`,
  },
  concat: {
    id: "concat",
    label: "Concat",
    inputs: [
      { id: "a", dtype: "string", label: "A" },
      { id: "b", dtype: "string", label: "B" },
    ],
    output: { id: "out", dtype: "string" },
    eval: ({ a, b }) => `${a ?? ""}${b ?? ""}`,
    toPy: ({ a, b }) => `(str(${a}) + str(${b}))`,
  },
  
  
};


const LOGICAL_OPERATORS={
  eq: {
    id: "eq",
    label: "==",
    inputs: [
      { id: "a", dtype: "any", label: "A" },
      { id: "b", dtype: "any", label: "B" },
    ],
    output: { id: "out", dtype: "boolean" },
    eval: ({ a, b }) => a === b,
    toPy: ({ a, b }) => `(${a} == ${b})`,
  },
  gt: {
    id: "gt",
    label: ">",
    inputs: [
      { id: "a", dtype: "number", label: "A" },
      { id: "b", dtype: "number", label: "B" },
    ],
    output: { id: "out", dtype: "boolean" },
    eval: ({ a, b }) => Number(a ?? 0) > Number(b ?? 0),
    toPy: ({ a, b }) => `(${a} > ${b})`,
  },
  ne: {
    id: "ne",
    label: "≠",
    inputs: [
      { id: "a", dtype: "any", label: "A" },
      { id: "b", dtype: "any", label: "B" },
    ],
    output: { id: "out", dtype: "boolean" },
    eval: ({ a, b }) => a !== b,
    toPy: ({ a, b }) => `(${a} != ${b})`,
  },
  lt: {
    id: "lt",
    label: "<",
    inputs: [
      { id: "a", dtype: "number", label: "A" },
      { id: "b", dtype: "number", label: "B" },
    ],
    output: { id: "out", dtype: "boolean" },
    eval: ({ a, b }) => Number(a ?? 0) < Number(b ?? 0),
    toPy: ({ a, b }) => `(${a} < ${b})`,
  },
  lte: {
    id: "lte",
    label: "≤",
    inputs: [
      { id: "a", dtype: "number", label: "A" },
      { id: "b", dtype: "number", label: "B" },
    ],
    output: { id: "out", dtype: "boolean" },
    eval: ({ a, b }) => Number(a ?? 0) <= Number(b ?? 0),
    toPy: ({ a, b }) => `(${a} <= ${b})`,
  },
  gte: {
    id: "gte",
    label: "≥",
    inputs: [
      { id: "a", dtype: "number", label: "A" },
      { id: "b", dtype: "number", label: "B" },
    ],
    output: { id: "out", dtype: "boolean" },
    eval: ({ a, b }) => Number(a ?? 0) >= Number(b ?? 0),
    toPy: ({ a, b }) => `(${a} >= ${b})`,
  },
  
  // Loop/List ops
  
  
  
}

const CONTROL_OPERATORS = {
// if: {
//     id: "if",
//     label: "If",
//     inputs: [
//       { id: "cond", dtype: "boolean", label: "Cond" },
//       { id: "t", dtype: "any", label: "Then" },
//       { id: "f", dtype: "any", label: "Else" },
//     ],
//     output: { id: "out", dtype: "any" },
//     // output: [
//     //   { id: "t", dtype: "any", label: "Then" },
//     //   { id: "f", dtype: "any", label: "Else" },
//     // ],
//     eval: ({ cond, t, f }) => (cond ? t : f),
//     toPy: ({ cond, t, f }) => `(${t} if ${cond} else ${f})`,
//   },
if: {
  id: "if",
  label: "If",
  inputs: [
    { id: "cond", dtype: "boolean", label: "Cond" },
    // { id: "t", dtype: "any", label: "Then" },
    // { id: "f", dtype: "any", label: "Else" },
  ],
  output: [
    { id: "then", dtype: "any", label: "Then" },
    { id: "else", dtype: "any", label: "Else" },
  ],
  eval: ({ cond, t, f }) => ({
    then: cond ? t : undefined,
    else: !cond ? f : undefined,
  }),
  toPy: ({ cond, t, f }) => ({
    then: `(${t} if ${cond} else None)`,
    else: `(None if ${cond} else ${f})`,
  }),
}

}

const LOOP_OPERATORS = {
range: {
    id: "range",
    label: "Range",
    inputs: [
      { id: "start", dtype: "number", label: "Start" },
      { id: "stop", dtype: "number", label: "Stop" },
      { id: "step", dtype: "number", label: "Step" },
    ],
    output: { id: "out", dtype: "list" },
    eval: ({ start, stop, step }) => {
      const s = Number(start ?? 0), e = Number(stop ?? 0), st = Number(step ?? 1);
      if (!Number.isFinite(s) || !Number.isFinite(e) || !Number.isFinite(st) || st === 0) return [];
      const dir = st > 0 ? 1 : -1;
      const arr = [];
      for (let i = s; dir > 0 ? i < e : i > e; i += st) arr.push(i);
      return arr;
    },
    toPy: ({ start, stop, step }) => `list(range(${start}, ${stop}, ${step}))`,
  },
}


const BOOLEAN_OPERATORS = {
  and: {
    id: "and",
    label: "AND",
    inputs: [
      { id: "a", dtype: "boolean", label: "A" },
      { id: "b", dtype: "boolean", label: "B" },
    ],
    output: { id: "out", dtype: "boolean" },
    eval: ({ a, b }) => Boolean(a) && Boolean(b),
    toPy: ({ a, b }) => `(${a} and ${b})`,
  },
  or: {
    id: "or",
    label: "OR",
    inputs: [
      { id: "a", dtype: "boolean", label: "A" },
      { id: "b", dtype: "boolean", label: "B" },
    ],
    output: { id: "out", dtype: "boolean" },
    eval: ({ a, b }) => Boolean(a) || Boolean(b),
    toPy: ({ a, b }) => `(${a} or ${b})`,
  },
  not: {
    id: "not",
    label: "NOT",
    inputs: [ { id: "a", dtype: "boolean", label: "A" } ],
    output: { id: "out", dtype: "boolean" },
    eval: ({ a }) => !Boolean(a),
    toPy: ({ a }) => `(not ${a})`,
  },
  // xor: {
  //   id: "xor",
  //   label: "XOR",
  //   inputs: [
  //     { id: "a", dtype: "boolean", label: "A" },
  //     { id: "b", dtype: "boolean", label: "B" },
  //   ],
  //   output: { id: "out", dtype: "boolean" },
  //   eval: ({ a, b }) => Boolean(a) !== Boolean(b),
  //   toPy: ({ a, b }) => `(bool(${a}) ^ bool(${b}))`,
  // },
  // coalesce: {
  //   id: "coalesce",
  //   label: "Coalesce",
  //   inputs: [
  //     { id: "a", dtype: "any", label: "A" },
  //     { id: "b", dtype: "any", label: "B" },
  //   ],
  //   output: { id: "out", dtype: "any" },
  //   eval: ({ a, b }) => (a !== undefined && a !== null ? a : b),
  //   toPy: ({ a, b }) => `(${a} if ${a} is not None else ${b})`,
  // },
}

const OTHER_OPERATORS = {
length: {
    id: "length",
    label: "Length",
    inputs: [{ id: "list", dtype: "list", label: "List" }],
    output: { id: "out", dtype: "number" },
    eval: ({ list }) => (Array.isArray(list) ? list.length : 0),
    toPy: ({ list }) => `len(${list})`,
  },
}

const LIST_OPERATORS = {
sum_list: {
    id: "sum_list",
    label: "Sum",
    inputs: [{ id: "list", dtype: "list", label: "List" }],
    output: { id: "out", dtype: "number" },
    eval: ({ list }) => (Array.isArray(list) ? list.reduce((a, v) => a + Number(v ?? 0), 0) : 0),
    toPy: ({ list }) => `sum(${list})`,
  },
  map_add: {
    id: "map_add",
    label: "Map +",
    inputs: [
      { id: "list", dtype: "list", label: "List" },
      { id: "add", dtype: "number", label: "+" },
    ],
    output: { id: "out", dtype: "list" },
    eval: ({ list, add }) => (Array.isArray(list) ? list.map((x) => Number(x ?? 0) + Number(add ?? 0)) : []),
    toPy: ({ list, add }) => `[ (x + ${add}) for x in ${list} ]`,
  },
  map_mul: {
    id: "map_mul",
    label: "Map ×",
    inputs: [
      { id: "list", dtype: "list", label: "List" },
      { id: "mul", dtype: "number", label: "×" },
    ],
    output: { id: "out", dtype: "list" },
    eval: ({ list, mul }) => (Array.isArray(list) ? list.map((x) => Number(x ?? 0) * Number(mul ?? 1)) : []),
    toPy: ({ list, mul }) => `[ (x * ${mul}) for x in ${list} ]`,
  },
}




// Help text per operator (for the info popover)
const OP_HELP = {
  add: "Add A + B (numbers).",
  subtract: "Subtract A − B.",
  multiply: "Multiply A × B.",
  divide: "Divide A ÷ B. Returns null when B is 0.",
  concat: "Concatenate strings A and B.",
  eq: "True if A equals B (strict equality).",
  gt: "True if A > B.",
  if: "If Cond then Then else Else.",
  range: "List of numbers from Start to Stop (exclusive) stepping by Step.",
  sum_list: "Sum of all numbers in List.",
  map_add: "Add constant (+) to each element of List.",
  map_mul: "Multiply each element of List by ×.",
  length: "Number of elements in List.",
};

// Node UI
const handleDot = {
  width: 16,
  height: 16,
  borderRadius: 9999,
  border: "3px solid white",
  background: "#0ea5e9",
  boxShadow: "0 0 0 2px #0ea5e966",
};



// Handler all operators
const ALL_OPERATORS = {
  ...OPS,
  ...LOGICAL_OPERATORS,
  ...CONTROL_OPERATORS,
  ...LOOP_OPERATORS,
  ...OTHER_OPERATORS,
  ...LIST_OPERATORS,
  ...BOOLEAN_OPERATORS
}


export {
  OPS,
  LOGICAL_OPERATORS,
  CONTROL_OPERATORS,
  LOOP_OPERATORS,
  OTHER_OPERATORS,
  LIST_OPERATORS,
  BOOLEAN_OPERATORS,
  ALL_OPERATORS,
  OP_HELP,
  handleDot
}