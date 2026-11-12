# Dynamic Programming in 3D (Three.js + Custom WebGL Shaders)

An interactive, step-by-step 3D visual guide to **Dynamic Programming** built with **Three.js**, custom **GLSL WebGL shaders**, post-processing bloom, and a deterministic step-by-step execution engine.

## Quick Start

Serve the directory over HTTP (required for ES Modules):

```bash
python3 -m http.server 8765
```

Then open **http://127.0.0.1:8765** in your browser.

## 6 Interactive Chapters

1. **01 Naive Recursion (`O(2ⁿ)`)** — Watch `fib(n)` branch into a 3D tree where duplicate overlapping subproblems light up in coral red.
2. **02 Top-Down Memoization (`O(n)`)** — Adds a 3D `memo[0..n]` crystal vault; golden WebGL energy beams deliver `O(1)` cache hits and prune exponential subtrees.
3. **03 Bottom-Up Tabulation (`O(n)`)** — Eliminates recursion by filling rising 3D pillars iteratively from `dp[0]` and `dp[1]` upward.
4. **04 `O(1)` Space Sliding Window** — Wraps `[prev2, prev1, curr]` in a gliding 3D glass window while older unused states fade into wireframes.
5. **05 2D DP: 0/1 Knapsack Terrain (`O(N·W)`)** — Visualizes 2D optimal substructure as a rising 3D heightfield comparing **Skip** (blue arc) vs **Take** (gold arc).
6. **06 Backtracking the Optimal Solution (`O(N)`)** — Walks backward from `dp[N][W]` to `(0, 0)` along golden 3D bridges to reconstruct the exact items chosen.

## Keyboard Shortcuts

- `Space` — Play / Pause step execution
- `←` / `→` — Step backward / forward
- `Home` / `End` — Jump to start / final result
- `1`–`6` — Switch chapters
- `R` — Reset 3D camera
- **Mouse Drag / Scroll / Hover** — Orbit, zoom, and inspect any 3D subproblem state
