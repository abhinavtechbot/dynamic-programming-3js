/**
 * Dynamic Programming Step-by-Step Trace & 3D Layout Generator
 * Produces deterministic, scrubber-friendly snapshots for all 6 chapters.
 */

export const CHAPTERS = [
  {
    id: 'naive',
    eyebrow: 'CHAPTER 1 OF 6 • OVERLAPPING SUBPROBLEMS',
    title: 'The Trap of Naive Recursion',
    concept:
      'To understand Dynamic Programming, first see what goes wrong without it. Computing <code>fib(n)</code> recursively branches into two calls each time, solving the <strong>exact same subproblems</strong> (coral red) exponentially many times.',
    complexity: 'Time: O(2ⁿ) • Space: O(n)',
    paramLabel: 'Target <code>n</code>:',
    paramMin: 4,
    paramMax: 6,
    paramDefault: 5,
    metricsLabels: ['Total Calls', 'Unique States', 'Wasted Duplicate Calls'],
    code: [
      'function fib(n):',
      '  if n <= 1:',
      '    return n              // Base case',
      '  left  = fib(n - 1)      // Branch left',
      '  right = fib(n - 2)      // Branch right',
      '  return left + right     // Combine',
    ],
  },
  {
    id: 'memo',
    eyebrow: 'CHAPTER 2 OF 6 • TOP-DOWN DYNAMIC PROGRAMMING',
    title: 'Top-Down Memoization (Caching)',
    concept:
      '<strong>Memoization</strong> adds a lookup vault (<code>memo[]</code> in the front row). Before recursing, check if <code>memo[n]</code> already exists. One golden <strong>Cache Hit</strong> prunes an entire exponential subtree!',
    complexity: 'Time: O(n) • Space: O(n)',
    paramLabel: 'Target <code>n</code>:',
    paramMin: 4,
    paramMax: 7,
    paramDefault: 5,
    metricsLabels: ['Total Calls', 'Cached States', 'Subtrees Pruned (Hits)'],
    code: [
      'function fibMemo(n, memo):',
      '  if n in memo:',
      '    return memo[n]        // ⚡ Instant Cache Hit!',
      '  if n <= 1: res = n',
      '  else: res = fibMemo(n-1) + fibMemo(n-2)',
      '  memo[n] = res           // Save in vault',
      '  return res',
    ],
  },
  {
    id: 'tabulation',
    eyebrow: 'CHAPTER 3 OF 6 • BOTTOM-UP DYNAMIC PROGRAMMING',
    title: 'Bottom-Up Tabulation (1D Table)',
    concept:
      'Why use recursion at all? <strong>Tabulation</strong> flips the direction: start from known base cases <code>dp[0]=0, dp[1]=1</code> and fill the table iteratively so every subproblem is ready <em>before</em> you need it.',
    complexity: 'Time: O(n) • Space: O(n)',
    paramLabel: 'Target <code>n</code>:',
    paramMin: 4,
    paramMax: 8,
    paramDefault: 6,
    metricsLabels: ['Steps Executed', 'Cells Computed', 'Call Stack Depth'],
    code: [
      'function fibTab(n):',
      '  dp[0] = 0; dp[1] = 1    // Seed base cases',
      '  for i from 2 to n:',
      '    dp[i] = dp[i-1] + dp[i-2]',
      '  return dp[n]            // Final answer',
    ],
  },
  {
    id: 'spaceOpt',
    eyebrow: 'CHAPTER 4 OF 6 • STATE SPACE REDUCTION',
    title: 'O(1) Space Sliding Window',
    concept:
      'Watch the glowing 3D window: computing <code>curr</code> only ever reads the <strong>previous two values</strong> (<code>prev1</code> and <code>prev2</code>). Older pillars fade out—we only need 2 variables in memory!',
    complexity: 'Time: O(n) • Space: O(1)',
    paramLabel: 'Target <code>n</code>:',
    paramMin: 4,
    paramMax: 9,
    paramDefault: 7,
    metricsLabels: ['Current Index i', 'Variables in RAM', 'Evicted Old Cells'],
    code: [
      'function fibOptimal(n):',
      '  prev2 = 0, prev1 = 1    // Only 2 variables!',
      '  for i from 2 to n:',
      '    curr = prev1 + prev2',
      '    prev2 = prev1; prev1 = curr',
      '  return prev1',
    ],
  },
  {
    id: 'knapsack2d',
    eyebrow: 'CHAPTER 5 OF 6 • 2D OPTIMAL SUBSTRUCTURE',
    title: '2D DP: The 0/1 Knapsack Terrain',
    concept:
      'When choices depend on <strong>two changing parameters</strong> (items <code>1..i</code> and capacity <code>0..W</code>), DP becomes a 2D heightfield. Each cell compares <strong>Skip</strong> (blue arc) vs <strong>Take</strong> (gold arc) and rises to <code>max()</code>.',
    complexity: 'Time: O(N·W) • Space: O(N·W)',
    paramLabel: 'Bag Capacity <code>W</code>:',
    paramMin: 5,
    paramMax: 7,
    paramDefault: 6,
    metricsLabels: ['Cells Evaluated', 'Best Value Found', 'Take Transitions'],
    code: [
      'for i = 1..N (each item wt, val):',
      '  for w = 0..W (capacity):',
      '    skip = dp[i-1][w]',
      '    if w < wt: dp[i][w] = skip',
      '    else: take = val + dp[i-1][w - wt]',
      '          dp[i][w] = max(skip, take)',
    ],
  },
  {
    id: 'backtrack',
    eyebrow: 'CHAPTER 6 OF 6 • DECISION RECONSTRUCTION',
    title: 'Backtracking the Optimal Choices',
    concept:
      'The table gives max value <code>dp[N][W]</code>, but <em>which items</em> produced it? Walk backward from <code>(N, W)</code>: whenever <code>dp[i][w] &gt; dp[i-1][w]</code>, item <code>i</code> was taken—follow the golden bridge to <code>w - wt[i]</code>!',
    complexity: 'Backtrack Time: O(N) • Optimal Set',
    paramLabel: 'Bag Capacity <code>W</code>:',
    paramMin: 5,
    paramMax: 7,
    paramDefault: 6,
    metricsLabels: ['Items Inspected', 'Selected Value', 'Remaining Cap w'],
    code: [
      'w = W; chosen = []',
      'for i from N down to 1:',
      '  if dp[i][w] != dp[i-1][w]:',
      '    chosen.add(item[i])   // ✅ Item Taken!',
      '    w = w - weight[i]     // Jump diagonally',
      '  else:                   // ⏭️ Item Skipped',
      '    continue to (i-1, w)',
    ],
  },
];

export const KNAPSACK_ITEMS = [
  { id: 1, name: 'Ring', weight: 1, value: 6 },
  { id: 2, name: 'Idol', weight: 3, value: 16 },
  { id: 3, name: 'Chest', weight: 3, value: 15 },
  { id: 4, name: 'Crown', weight: 4, value: 20 },
];

export function buildChapterTrace(chapterIndex, paramVal) {
  switch (chapterIndex) {
    case 0:
      return buildNaiveRecursionTrace(paramVal);
    case 1:
      return buildMemoizationTrace(paramVal);
    case 2:
      return buildTabulationTrace(paramVal);
    case 3:
      return buildSpaceOptTrace(paramVal);
    case 4:
      return buildKnapsackTrace(paramVal);
    case 5:
      return buildBacktrackTrace(paramVal);
    default:
      return buildNaiveRecursionTrace(5);
  }
}

/* ============================================================================
 * CHAPTER 1: NAIVE RECURSION (3D Call Tree)
 * ============================================================================ */
function buildNaiveRecursionTrace(n) {
  const nodes = [];
  const edges = [];
  let nextId = 0;

  // Build full binary recursion tree structure first to assign clean 3D coordinates
  function createTree(val, depth, parentId) {
    const id = nextId++;
    const node = {
      id,
      val,
      depth,
      parentId,
      leftId: null,
      rightId: null,
      result: val <= 1 ? val : 0,
      leafIndex: 0,
      x: 0,
      y: 0,
      z: 0,
    };
    nodes.push(node);
    if (parentId !== null) {
      edges.push({ id: `e_${parentId}_${id}`, from: parentId, to: id });
    }
    if (val > 1) {
      node.leftId = createTree(val - 1, depth + 1, id);
      node.rightId = createTree(val - 2, depth + 1, id);
      node.result = nodes[node.leftId].result + nodes[node.rightId].result;
    }
    return id;
  }

  createTree(n, 0, null);

  // Assign X positions using in-order / leaf spacing so zero nodes overlap
  let leafCounter = 0;
  function layoutTree(id) {
    const node = nodes[id];
    if (node.leftId === null && node.rightId === null) {
      node.x = leafCounter++;
    } else {
      layoutTree(node.leftId);
      layoutTree(node.rightId);
      node.x = (nodes[node.leftId].x + nodes[node.rightId].x) * 0.5;
    }
  }
  layoutTree(0);

  const maxDepth = Math.max(...nodes.map((nd) => nd.depth));
  const spacingX = n >= 6 ? 1.15 : 1.55;
  const centerX = ((leafCounter - 1) * spacingX) / 2;
  const topY = maxDepth * 1.15 + 1.2;

  for (const nd of nodes) {
    nd.x = nd.x * spacingX - centerX;
    nd.y = topY - nd.depth * 1.65;
    // Subtle 3D Z-arc by depth so rotating reveals spatial hierarchy
    nd.z = (nd.depth - maxDepth * 0.45) * 0.65;
  }

  // Simulate execution step-by-step
  const steps = [];
  const nodeStatus = new Array(nodes.length).fill('hidden'); // hidden | active | waiting | done | redundant
  const nodeDisplayVal = new Array(nodes.length).fill(null);
  const computedSubproblems = new Set();
  let totalCalls = 0;
  let redundantCalls = 0;

  function snapshot(meta) {
    steps.push({
      ...meta,
      nodeStates: nodes.map((nd, i) => ({
        id: nd.id,
        status: nodeStatus[i],
        displayVal: nodeDisplayVal[i],
      })),
      metrics: [totalCalls, computedSubproblems.size, redundantCalls],
    });
  }

  snapshot({
    tag: 'READY',
    tagType: 'normal',
    codeLine: 0,
    formula: `Target: compute fib(${n})`,
    explanation: `Click Step → or Play to watch fib(${n}) expand into a 3D recursion tree. Notice how identical subproblems appear in multiple branches.`,
    activeNodeId: 0,
    activeBeams: [],
  });

  function sim(id) {
    const nd = nodes[id];
    const isDuplicate = computedSubproblems.has(nd.val);
    totalCalls++;
    if (isDuplicate) redundantCalls++;

    nodeStatus[id] = isDuplicate ? 'redundant' : 'active';
    snapshot({
      tag: isDuplicate ? 'REDUNDANT CALL' : 'CALL',
      tagType: isDuplicate ? 'redundant' : 'normal',
      codeLine: 0,
      formula: `Call fib(${nd.val})${isDuplicate ? '  [Already solved earlier!]' : ''}`,
      explanation: isDuplicate
        ? `We already solved fib(${nd.val}) = ${nd.result} in an earlier branch, yet naive recursion has no memory and recomputes it from scratch!`
        : `Entering fib(${nd.val}) at depth ${nd.depth}.`,
      activeNodeId: id,
      activeBeams: nd.parentId !== null ? [{ from: nd.parentId, to: id, color: isDuplicate ? 0xfb7185 : 0x22d3ee }] : [],
    });

    if (nd.val <= 1) {
      nodeDisplayVal[id] = nd.result;
      const wasDup = isDuplicate;
      computedSubproblems.add(nd.val);
      nodeStatus[id] = wasDup ? 'redundant' : 'done';
      snapshot({
        tag: wasDup ? 'REDUNDANT BASE' : 'BASE CASE',
        tagType: wasDup ? 'redundant' : 'done',
        codeLine: 2,
        formula: `fib(${nd.val}) = ${nd.result}`,
        explanation: `Base case reached: n = ${nd.val} returns ${nd.result} immediately.`,
        activeNodeId: id,
        activeBeams: [],
      });
      return;
    }

    nodeStatus[id] = isDuplicate ? 'redundant' : 'waiting';
    sim(nd.leftId);
    sim(nd.rightId);

    nodeDisplayVal[id] = nd.result;
    const wasDup = isDuplicate || computedSubproblems.has(nd.val);
    computedSubproblems.add(nd.val);
    nodeStatus[id] = isDuplicate ? 'redundant' : 'done';

    snapshot({
      tag: isDuplicate ? 'WASTED SUM' : 'COMBINE',
      tagType: isDuplicate ? 'redundant' : 'done',
      codeLine: 5,
      formula: `fib(${nd.val}) = fib(${nd.val - 1}) + fib(${nd.val - 2}) = ${nodes[nd.leftId].result} + ${nodes[nd.rightId].result} = ${nd.result}`,
      explanation: isDuplicate
        ? `Finished recomputing fib(${nd.val}) = ${nd.result}—pure duplicate work (coral red).`
        : `Combined child subproblems: ${nodes[nd.leftId].result} + ${nodes[nd.rightId].result} = ${nd.result}.`,
      activeNodeId: id,
      activeBeams: [
        { from: nd.leftId, to: id, color: isDuplicate ? 0xfb7185 : 0x34d399 },
        { from: nd.rightId, to: id, color: isDuplicate ? 0xfb7185 : 0x34d399 },
      ],
    });
  }

  sim(0);

  return {
    type: 'tree',
    nodes,
    edges,
    memoSlots: [],
    steps,
    camera: { pos: [0, topY * 0.55 + 2.2, 14.5 + n * 1.4], target: [0, topY * 0.42, 0] },
  };
}

/* ============================================================================
 * CHAPTER 2: TOP-DOWN MEMOIZATION (Pruned Tree + 3D Memo Vault)
 * ============================================================================ */
function buildMemoizationTrace(n) {
  const nodes = [];
  const edges = [];
  let nextId = 0;
  const buildMemoSet = new Set();

  // Build only the nodes actually visited with memoization!
  function buildPrunedTree(val, depth, parentId) {
    const id = nextId++;
    const willHitCache = buildMemoSet.has(val);
    const node = {
      id,
      val,
      depth,
      parentId,
      leftId: null,
      rightId: null,
      willHitCache,
      result: fibVal(val),
      x: 0,
      y: 0,
      z: 0,
    };
    nodes.push(node);
    if (parentId !== null) {
      edges.push({ id: `e_${parentId}_${id}`, from: parentId, to: id });
    }
    if (!willHitCache) {
      if (val > 1) {
        node.leftId = buildPrunedTree(val - 1, depth + 1, id);
        node.rightId = buildPrunedTree(val - 2, depth + 1, id);
      }
      buildMemoSet.add(val);
    }
    return id;
  }

  buildPrunedTree(n, 0, null);

  let leafCounter = 0;
  function layout(id) {
    const nd = nodes[id];
    if (nd.leftId === null && nd.rightId === null) {
      nd.x = leafCounter++;
    } else {
      layout(nd.leftId);
      layout(nd.rightId);
      nd.x = (nodes[nd.leftId].x + nodes[nd.rightId].x) * 0.5;
    }
  }
  layout(0);

  const maxDepth = Math.max(...nodes.map((nd) => nd.depth));
  const spacingX = 2.05;
  const centerX = ((leafCounter - 1) * spacingX) / 2;
  const topY = maxDepth * 1.35 + 2.4;

  for (const nd of nodes) {
    nd.x = nd.x * spacingX - centerX;
    nd.y = topY - nd.depth * 1.45;
    nd.z = -1.6;
  }

  // Front-row 3D Memo Cache Vault
  const memoSlots = [];
  const memoSpacing = 1.85;
  const memoStartX = -((n) * memoSpacing) / 2;
  for (let k = 0; k <= n; k++) {
    memoSlots.push({
      k,
      x: memoStartX + k * memoSpacing,
      y: 0.45,
      z: 3.4,
    });
  }

  const steps = [];
  const nodeStatus = new Array(nodes.length).fill('hidden');
  const nodeDisplayVal = new Array(nodes.length).fill(null);
  const memoValues = new Array(n + 1).fill(null);
  let totalCalls = 0;
  let cacheHits = 0;
  let cachedCount = 0;

  function snapshot(meta) {
    steps.push({
      ...meta,
      nodeStates: nodes.map((nd, i) => ({
        id: nd.id,
        status: nodeStatus[i],
        displayVal: nodeDisplayVal[i],
      })),
      memoStates: memoValues.slice(),
      metrics: [totalCalls, cachedCount, cacheHits],
    });
  }

  snapshot({
    tag: 'READY',
    tagType: 'normal',
    codeLine: 0,
    formula: `memo = [ ?, ?, ... ]  (Empty Vault)`,
    explanation: `Notice the empty memo[0..${n}] vault in the foreground. Every computed subproblem will be stored once and reused via golden WebGL beams!`,
    activeNodeId: 0,
    activeMemoIdx: null,
    activeBeams: [],
  });

  function sim(id) {
    const nd = nodes[id];
    totalCalls++;
    nodeStatus[id] = 'active';

    if (memoValues[nd.val] !== null) {
      // CACHE HIT!
      cacheHits++;
      nodeStatus[id] = 'cacheHit';
      nodeDisplayVal[id] = nd.result;
      snapshot({
        tag: '⚡ CACHE HIT',
        tagType: 'cache',
        codeLine: 2,
        formula: `memo[${nd.val}] == ${nd.result}  →  Return ${nd.result} in O(1)!`,
        explanation: `memo[${nd.val}] is already in the vault! A golden beam delivers ${nd.result} immediately—pruning the entire fib(${nd.val}) subtree!`,
        activeNodeId: id,
        activeMemoIdx: nd.val,
        activeBeams: [{ fromMemo: nd.val, toNode: id, color: 0xfbbf24 }],
      });
      return;
    }

    snapshot({
      tag: 'CALL',
      tagType: 'normal',
      codeLine: 1,
      formula: `fibMemo(${nd.val}): memo[${nd.val}] is empty`,
      explanation: `memo[${nd.val}] has not been solved yet, so we compute it once.`,
      activeNodeId: id,
      activeMemoIdx: nd.val,
      activeBeams: nd.parentId !== null ? [{ fromNode: nd.parentId, toNode: id, color: 0x22d3ee }] : [],
    });

    if (nd.val <= 1) {
      memoValues[nd.val] = nd.result;
      cachedCount++;
      nodeDisplayVal[id] = nd.result;
      nodeStatus[id] = 'done';
      snapshot({
        tag: 'MEMOIZE BASE',
        tagType: 'done',
        codeLine: 5,
        formula: `memo[${nd.val}] = ${nd.result}`,
        explanation: `Base case fib(${nd.val}) = ${nd.result}. Stored into vault slot memo[${nd.val}].`,
        activeNodeId: id,
        activeMemoIdx: nd.val,
        activeBeams: [{ fromNode: id, toMemo: nd.val, color: 0x34d399 }],
      });
      return;
    }

    nodeStatus[id] = 'waiting';
    sim(nd.leftId);
    sim(nd.rightId);

    memoValues[nd.val] = nd.result;
    cachedCount++;
    nodeDisplayVal[id] = nd.result;
    nodeStatus[id] = 'done';

    snapshot({
      tag: 'SAVE TO VAULT',
      tagType: 'done',
      codeLine: 5,
      formula: `memo[${nd.val}] = ${nodes[nd.leftId].result} + ${nodes[nd.rightId].result} = ${nd.result}`,
      explanation: `Solved fib(${nd.val}) = ${nd.result} and saved it into memo[${nd.val}] so it never has to be recomputed again!`,
      activeNodeId: id,
      activeMemoIdx: nd.val,
      activeBeams: [
        { fromNode: nd.leftId, toNode: id, color: 0x34d399 },
        { fromNode: nd.rightId, toNode: id, color: 0xfbbf24 },
        { fromNode: id, toMemo: nd.val, color: 0x22d3ee },
      ],
    });
  }

  sim(0);

  return {
    type: 'memoTree',
    nodes,
    edges,
    memoSlots,
    steps,
    camera: { pos: [0, topY * 0.52 + 2.4, 18.2], target: [0, topY * 0.45, 0.6] },
  };
}

/* ============================================================================
 * CHAPTER 3: BOTTOM-UP TABULATION (1D Rising Pillars)
 * ============================================================================ */
function buildTabulationTrace(n) {
  const maxVal = Math.max(1, fibVal(n));
  const spacing = 2.0;
  const startX = -(n * spacing) / 2;

  const cells = [];
  for (let i = 0; i <= n; i++) {
    const val = fibVal(i);
    cells.push({
      i,
      val,
      maxHeight: i === 0 ? 0.35 : 0.6 + (val / maxVal) * 4.8,
      x: startX + i * spacing,
      z: 0,
    });
  }

  const steps = [];
  const statuses = new Array(n + 1).fill('empty'); // empty | active | source | done | final
  const values = new Array(n + 1).fill(null);

  function snapshot(meta, opsCount, filledCount) {
    steps.push({
      ...meta,
      cellStates: cells.map((c, idx) => ({
        i: idx,
        status: statuses[idx],
        val: values[idx],
      })),
      windowRange: null,
      metrics: [opsCount, filledCount, 0],
    });
  }

  snapshot(
    {
      tag: 'READY',
      tagType: 'normal',
      codeLine: 0,
      formula: `Allocate dp[0..${n}]`,
      explanation: `Bottom-up tabulation allocates an array of ${n + 1} states and fills them from smallest index (0) to largest (${n})—zero recursion stack!`,
      activeIdx: 0,
      activeBeams: [],
    },
    0,
    0
  );

  // Seed base cases
  values[0] = 0;
  values[1] = 1;
  statuses[0] = 'done';
  statuses[1] = 'done';
  snapshot(
    {
      tag: 'BASE CASES',
      tagType: 'done',
      codeLine: 1,
      formula: `dp[0] = 0,  dp[1] = 1`,
      explanation: `Initialize the smallest subproblems directly: dp[0] = 0 and dp[1] = 1.`,
      activeIdx: 1,
      activeBeams: [],
    },
    1,
    2
  );

  for (let i = 2; i <= n; i++) {
    for (let k = 0; k < i; k++) statuses[k] = 'done';
    statuses[i - 1] = 'source';
    statuses[i - 2] = 'source';
    statuses[i] = 'active';
    values[i] = cells[i].val;

    snapshot(
      {
        tag: `COMPUTE i=${i}`,
        tagType: 'normal',
        codeLine: 3,
        formula: `dp[${i}] = dp[${i - 1}] + dp[${i - 2}] = ${cells[i - 1].val} + ${cells[i - 2].val} = ${cells[i].val}`,
        explanation: `Because we work bottom-up, both dependencies dp[${i - 1}]=${cells[i - 1].val} (cyan arc) and dp[${i - 2}]=${cells[i - 2].val} (gold arc) are guaranteed ready!`,
        activeIdx: i,
        activeBeams: [
          { fromIdx: i - 1, toIdx: i, color: 0x22d3ee, arcHeight: 1.5 },
          { fromIdx: i - 2, toIdx: i, color: 0xfbbf24, arcHeight: 2.3 },
        ],
      },
      i,
      i + 1
    );
  }

  for (let k = 0; k < n; k++) statuses[k] = 'done';
  statuses[n] = 'final';
  snapshot(
    {
      tag: 'COMPLETE',
      tagType: 'done',
      codeLine: 4,
      formula: `Return dp[${n}] = ${cells[n].val}`,
      explanation: `All ${n + 1} states solved in one clean linear pass: O(n) time, 0 recursion overhead! Next question: did we even need the whole array?`,
      activeIdx: n,
      activeBeams: [],
    },
    n,
    n + 1
  );

  return {
    type: 'bars1d',
    cells,
    steps,
    camera: { pos: [0, 5.2, 12.5 + n * 0.55], target: [0, 1.8, 0] },
  };
}

/* ============================================================================
 * CHAPTER 4: O(1) SPACE SLIDING WINDOW
 * ============================================================================ */
function buildSpaceOptTrace(n) {
  const maxVal = Math.max(1, fibVal(n));
  const spacing = 1.85;
  const startX = -(n * spacing) / 2;

  const cells = [];
  for (let i = 0; i <= n; i++) {
    const val = fibVal(i);
    cells.push({
      i,
      val,
      maxHeight: i === 0 ? 0.35 : 0.6 + (val / maxVal) * 4.8,
      x: startX + i * spacing,
      z: 0,
    });
  }

  const steps = [];
  const statuses = new Array(n + 1).fill('empty'); // empty | active | source | evicted | final
  const values = new Array(n + 1).fill(null);

  function snapshot(meta, curI, varsHeld, evictedCount, windowRange) {
    steps.push({
      ...meta,
      cellStates: cells.map((c, idx) => ({
        i: idx,
        status: statuses[idx],
        val: values[idx],
      })),
      windowRange,
      metrics: [curI, varsHeld, evictedCount],
    });
  }

  values[0] = 0;
  values[1] = 1;
  statuses[0] = 'source';
  statuses[1] = 'source';

  snapshot(
    {
      tag: 'INIT O(1) WINDOW',
      tagType: 'normal',
      codeLine: 1,
      formula: `prev2 = 0,  prev1 = 1`,
      explanation: `Notice the glowing 3D glass window: it holds ONLY two variables (prev2 and prev1). Let's slide it across 0..${n}!`,
      activeIdx: 1,
      activeBeams: [],
    },
    1,
    2,
    0,
    [0, 1]
  );

  for (let i = 2; i <= n; i++) {
    for (let k = 0; k < i - 2; k++) statuses[k] = 'evicted';
    statuses[i - 2] = 'source';
    statuses[i - 1] = 'source';
    statuses[i] = 'active';
    values[i] = cells[i].val;

    snapshot(
      {
        tag: `SLIDE i=${i}`,
        tagType: 'cache',
        codeLine: 3,
        formula: `curr = prev1 (${cells[i - 1].val}) + prev2 (${cells[i - 2].val}) = ${cells[i].val}`,
        explanation:
          i === 2
            ? `Compute curr = ${cells[i].val} from prev1 and prev2.`
            : `State ${i - 3} falls outside the window and fades into a wireframe—its memory is freed! Only 2 previous values are ever kept.`,
        activeIdx: i,
        activeBeams: [
          { fromIdx: i - 1, toIdx: i, color: 0x22d3ee, arcHeight: 1.45 },
          { fromIdx: i - 2, toIdx: i, color: 0xfbbf24, arcHeight: 2.2 },
        ],
      },
      i,
      2,
      Math.max(0, i - 2),
      [i - 2, i]
    );
  }

  for (let k = 0; k < n - 1; k++) statuses[k] = 'evicted';
  statuses[n - 1] = 'source';
  statuses[n] = 'final';

  snapshot(
    {
      tag: 'O(1) SPACE DONE',
      tagType: 'done',
      codeLine: 5,
      formula: `Answer = prev1 = ${cells[n].val}  (using only O(1) RAM!)`,
      explanation: `Even if n = 1,000,000, this sliding window uses just 2 integer slots instead of an array of a million elements!`,
      activeIdx: n,
      activeBeams: [],
    },
    n,
    2,
    Math.max(0, n - 1),
    [n - 1, n]
  );

  return {
    type: 'bars1d',
    cells,
    steps,
    camera: { pos: [0, 5.2, 13.0 + n * 0.5], target: [0, 1.8, 0] },
  };
}

/* ============================================================================
 * CHAPTER 5: 2D DP — 0/1 KNAPSACK TERRAIN
 * ============================================================================ */
function computeKnapsackTable(W) {
  const N = KNAPSACK_ITEMS.length;
  const dp = Array.from({ length: N + 1 }, () => new Array(W + 1).fill(0));
  for (let i = 1; i <= N; i++) {
    const { weight, value } = KNAPSACK_ITEMS[i - 1];
    for (let w = 0; w <= W; w++) {
      const skip = dp[i - 1][w];
      const take = w >= weight ? value + dp[i - 1][w - weight] : -1;
      dp[i][w] = Math.max(skip, take);
    }
  }
  return dp;
}

function buildKnapsackTrace(W) {
  const N = KNAPSACK_ITEMS.length;
  const dp = computeKnapsackTable(W);
  const maxVal = Math.max(1, dp[N][W]);

  const spacingX = 1.65;
  const spacingZ = 1.75;
  const startX = -(W * spacingX) / 2;
  const startZ = -(N * spacingZ) / 2;

  const gridCells = [];
  for (let i = 0; i <= N; i++) {
    for (let w = 0; w <= W; w++) {
      const val = dp[i][w];
      gridCells.push({
        i,
        w,
        val,
        targetHeight: 0.3 + (val / maxVal) * 4.2,
        x: startX + w * spacingX,
        z: startZ + i * spacingZ,
      });
    }
  }

  const steps = [];
  // Status matrix: hidden | base | done | active | skipSrc | takeSrc | optimal
  const statusGrid = Array.from({ length: N + 1 }, () => new Array(W + 1).fill('hidden'));
  const valGrid = Array.from({ length: N + 1 }, () => new Array(W + 1).fill(null));

  let evaluated = 0;
  let bestSoFar = 0;
  let takeWins = 0;

  function snapshot(meta) {
    const flat = [];
    for (let i = 0; i <= N; i++) {
      for (let w = 0; w <= W; w++) {
        flat.push({
          status: statusGrid[i][w],
          val: valGrid[i][w],
        });
      }
    }
    steps.push({
      ...meta,
      gridStates: flat,
      selectedItems: [],
      metrics: [evaluated, bestSoFar, takeWins],
    });
  }

  // Row 0 base case: 0 items -> value 0 for all capacities
  for (let w = 0; w <= W; w++) {
    statusGrid[0][w] = 'base';
    valGrid[0][w] = 0;
  }
  evaluated = W + 1;

  snapshot({
    tag: 'ROW 0 BASE CASE',
    tagType: 'done',
    codeLine: 0,
    formula: `dp[0][0..${W}] = 0  (0 items → 0 value)`,
    explanation: `Items: Ring(1w,6v), Idol(3w,16v), Chest(3w,15v), Crown(4w,20v). Row 0 has 0 items available, so every capacity starts at height 0.`,
    activeCell: [0, 0],
    activeBeams: [],
  });

  for (let i = 1; i <= N; i++) {
    const item = KNAPSACK_ITEMS[i - 1];
    for (let w = 0; w <= W; w++) {
      // Reset prior row highlights
      for (let r = 0; r <= N; r++) {
        for (let c = 0; c <= W; c++) {
          if (valGrid[r][c] !== null) {
            statusGrid[r][c] = r === 0 ? 'base' : 'done';
          }
        }
      }

      const skip = dp[i - 1][w];
      const canTake = w >= item.weight;
      const take = canTake ? item.value + dp[i - 1][w - item.weight] : -1;
      const winner = dp[i][w];
      const tookItem = canTake && take > skip;

      statusGrid[i][w] = 'active';
      statusGrid[i - 1][w] = 'skipSrc';
      if (canTake) statusGrid[i - 1][w - item.weight] = 'takeSrc';

      valGrid[i][w] = winner;
      evaluated++;
      bestSoFar = Math.max(bestSoFar, winner);
      if (tookItem) takeWins++;

      const beams = [
        { from: [i - 1, w], to: [i, w], color: 0x38bdf8, arcHeight: 1.35 },
      ];
      if (canTake) {
        beams.push({
          from: [i - 1, w - item.weight],
          to: [i, w],
          color: 0xfbbf24,
          arcHeight: 2.15,
        });
      }

      snapshot({
        tag: !canTake ? 'TOO HEAVY (SKIP)' : tookItem ? `TAKE ${item.name.toUpperCase()}` : 'KEEP SKIP',
        tagType: tookItem ? 'cache' : 'normal',
        codeLine: !canTake ? 3 : 5,
        formula: !canTake
          ? `w=${w} < wt(${item.weight}) → dp[${i}][${w}] = dp[${i - 1}][${w}] = ${skip}`
          : `dp[${i}][${w}] = max(skip=${skip}, take=${item.value}+dp[${i - 1}][${w - item.weight}]=${take}) = ${winner}`,
        explanation: !canTake
          ? `${item.name} weighs ${item.weight}, which exceeds current capacity w=${w}. Inherit ${skip} from directly behind (blue arc).`
          : tookItem
          ? `Taking ${item.name} (+${item.value} value, gold arc from w=${w - item.weight}) yields ${take}, beating skip (${skip})!`
          : `Even though ${item.name} fits (take=${take}), skipping it (${skip}) is better or equal.`,
        activeCell: [i, w],
        activeBeams: beams,
      });
    }
  }

  for (let r = 0; r <= N; r++) {
    for (let c = 0; c <= W; c++) {
      statusGrid[r][c] = r === 0 ? 'base' : 'done';
    }
  }
  statusGrid[N][W] = 'optimal';

  snapshot({
    tag: 'OPTIMAL VALUE FOUND',
    tagType: 'done',
    codeLine: 5,
    formula: `Max Value dp[${N}][${W}] = ${dp[N][W]}`,
    explanation: `Notice how greedy heuristics fail on W=6 (ratio greedy gets 22; heaviest greedy gets 26), whereas 2D DP finds ${dp[N][W]}! Head to Chapter 6 to backtrack which items were chosen.`,
    activeCell: [N, W],
    activeBeams: [],
  });

  return {
    type: 'grid2d',
    N,
    W,
    items: KNAPSACK_ITEMS,
    gridCells,
    steps,
    camera: { pos: [1.4, 11.4, 16.2], target: [-0.5, 1.3, 0.2] },
  };
}

/* ============================================================================
 * CHAPTER 6: BACKTRACKING THE OPTIMAL SOLUTION IN 3D
 * ============================================================================ */
function buildBacktrackTrace(W) {
  const N = KNAPSACK_ITEMS.length;
  const dp = computeKnapsackTable(W);
  const maxVal = Math.max(1, dp[N][W]);

  const spacingX = 1.65;
  const spacingZ = 1.75;
  const startX = -(W * spacingX) / 2;
  const startZ = -(N * spacingZ) / 2;

  const gridCells = [];
  for (let i = 0; i <= N; i++) {
    for (let w = 0; w <= W; w++) {
      const val = dp[i][w];
      gridCells.push({
        i,
        w,
        val,
        targetHeight: 0.3 + (val / maxVal) * 4.2,
        x: startX + w * spacingX,
        z: startZ + i * spacingZ,
      });
    }
  }

  const statusGrid = Array.from({ length: N + 1 }, (_, r) =>
    new Array(W + 1).fill(r === 0 ? 'base' : 'done')
  );
  const steps = [];
  const chosenItems = [];
  const pathBridges = [];
  let inspected = 0;
  let accValue = 0;

  function snapshot(meta, curW) {
    const flat = [];
    for (let i = 0; i <= N; i++) {
      for (let w = 0; w <= W; w++) {
        flat.push({
          status: statusGrid[i][w],
          val: dp[i][w],
        });
      }
    }
    steps.push({
      ...meta,
      gridStates: flat,
      selectedItems: chosenItems.slice(),
      metrics: [inspected, accValue, curW],
    });
  }

  statusGrid[N][W] = 'optimal';
  snapshot(
    {
      tag: 'START AT (N, W)',
      tagType: 'cache',
      codeLine: 0,
      formula: `Start cursor at dp[${N}][${W}] = ${dp[N][W]}`,
      explanation: `All table heights are already computed. Start at the peak corner (row ${N}, capacity ${W}) and trace our decisions backward to row 0!`,
      activeCell: [N, W],
      activeBeams: [],
    },
    W
  );

  let w = W;
  for (let i = N; i >= 1; i--) {
    const item = KNAPSACK_ITEMS[i - 1];
    inspected++;
    const aboveVal = dp[i - 1][w];
    const curVal = dp[i][w];

    if (curVal !== aboveVal) {
      // Item i was TAKEN!
      const nextW = w - item.weight;
      chosenItems.push(item.id);
      accValue += item.value;
      statusGrid[i][w] = 'optimal';
      statusGrid[i - 1][nextW] = 'optimal';
      pathBridges.push({
        from: [i, w],
        to: [i - 1, nextW],
        color: 0xfbbf24,
        arcHeight: 1.9,
      });

      snapshot(
        {
          tag: `✅ TOOK ${item.name.toUpperCase()}`,
          tagType: 'cache',
          codeLine: 3,
          formula: `dp[${i}][${w}] (${curVal}) != dp[${i - 1}][${w}] (${aboveVal}) → Select ${item.name}!`,
          explanation: `Because ${curVal} differs from the cell above (${aboveVal}), ${item.name} (wt=${item.weight}, val=${item.value}) MUST have been packed! Subtract weight: w = ${w} - ${item.weight} = ${nextW}.`,
          activeCell: [i - 1, nextW],
          activeBeams: pathBridges.slice(),
        },
        nextW
      );
      w = nextW;
    } else {
      // Item i was SKIPPED
      statusGrid[i][w] = 'pathSkip';
      statusGrid[i - 1][w] = 'optimal';
      pathBridges.push({
        from: [i, w],
        to: [i - 1, w],
        color: 0x38bdf8,
        arcHeight: 1.2,
      });

      snapshot(
        {
          tag: `⏭️ SKIPPED ${item.name.toUpperCase()}`,
          tagType: 'normal',
          codeLine: 6,
          formula: `dp[${i}][${w}] (${curVal}) == dp[${i - 1}][${w}] (${aboveVal}) → Skip ${item.name}`,
          explanation: `Value ${curVal} equals dp[${i - 1}][${w}] directly behind it, so ${item.name} was not needed. Capacity stays w = ${w}.`,
          activeCell: [i - 1, w],
          activeBeams: pathBridges.slice(),
        },
        w
      );
    }
  }

  const chosenNames = chosenItems
    .map((id) => {
      const it = KNAPSACK_ITEMS.find((x) => x.id === id);
      return `${it.name}(${it.weight}w,${it.value}v)`;
    })
    .reverse()
    .join(' + ');

  snapshot(
    {
      tag: 'SOLUTION RECONSTRUCTED',
      tagType: 'done',
      codeLine: 0,
      formula: `Optimal Pack: ${chosenNames} = ${accValue}`,
      explanation: `Backtracking reached row 0 in just ${N} steps! The golden 3D trail reveals the exact optimal subset of items.`,
      activeCell: [0, w],
      activeBeams: pathBridges.slice(),
    },
    w
  );

  return {
    type: 'grid2d',
    N,
    W,
    items: KNAPSACK_ITEMS,
    gridCells,
    steps,
    camera: { pos: [-1.8, 11.6, 16.2], target: [-0.4, 1.3, 0.2] },
  };
}

function fibVal(n) {
  if (n <= 1) return n;
  let a = 0;
  let b = 1;
  for (let i = 2; i <= n; i++) {
    const c = a + b;
    a = b;
    b = c;
  }
  return b;
}
