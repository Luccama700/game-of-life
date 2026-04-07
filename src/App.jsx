import { useState, useCallback, useRef, useEffect } from "react";

const CELL_SIZE = 18;
const COLS = 40;
const ROWS = 30;

const EMPTY = 0;
const ALIVE = 1;
const WALL = 2;

const createGrid = () => Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));

const NEIGHBORS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];

function countNeighbors(grid, r, c) {
  let count = 0;
  for (const [dr, dc] of NEIGHBORS) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && grid[nr][nc] === ALIVE) count++;
  }
  return count;
}

function step(grid) {
  const next = grid.map(row => [...row]);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] === WALL) continue;
      const n = countNeighbors(grid, r, c);
      if (grid[r][c] === ALIVE) {
        next[r][c] = (n === 2 || n === 3) ? ALIVE : EMPTY;
      } else {
        next[r][c] = n === 3 ? ALIVE : EMPTY;
      }
    }
  }
  return next;
}

const PRESETS = {
  glider: { name: "Glider", cells: [[0,1],[1,2],[2,0],[2,1],[2,2]] },
  blinker: { name: "Blinker", cells: [[1,0],[1,1],[1,2]] },
  pulsar: { name: "Pulsar", cells: (() => {
    const pts = [];
    const offsets = [
      [0,2],[0,3],[0,4],[0,8],[0,9],[0,10],
      [2,0],[3,0],[4,0],[2,5],[3,5],[4,5],
      [2,7],[3,7],[4,7],[2,12],[3,12],[4,12],
      [5,2],[5,3],[5,4],[5,8],[5,9],[5,10],
      [7,2],[7,3],[7,4],[7,8],[7,9],[7,10],
      [8,0],[9,0],[10,0],[8,5],[9,5],[10,5],
      [8,7],[9,7],[10,7],[8,12],[9,12],[10,12],
      [12,2],[12,3],[12,4],[12,8],[12,9],[12,10],
    ];
    offsets.forEach(([r,c]) => pts.push([r,c]));
    return pts;
  })() },
  gliderGun: { name: "Gosper Gun", cells: [
    [0,24],[1,22],[1,24],[2,12],[2,13],[2,20],[2,21],[2,34],[2,35],
    [3,11],[3,15],[3,20],[3,21],[3,34],[3,35],[4,0],[4,1],[4,10],
    [4,16],[4,20],[4,21],[5,0],[5,1],[5,10],[5,14],[5,16],[5,17],
    [5,22],[5,24],[6,10],[6,16],[6,24],[7,11],[7,15],[8,12],[8,13]
  ]}
};

export default function GameOfLife() {
  const [grid, setGrid] = useState(createGrid);
  const [running, setRunning] = useState(false);
  const [tool, setTool] = useState("cell");
  const [generation, setGeneration] = useState(0);
  const [speed, setSpeed] = useState(120);
  const [population, setPopulation] = useState(0);
  const runningRef = useRef(running);
  const speedRef = useRef(speed);
  const isPainting = useRef(false);

  useEffect(() => { runningRef.current = running; }, [running]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => {
    setPopulation(grid.flat().filter(c => c === ALIVE).length);
  }, [grid]);

  const simulate = useCallback(() => {
    if (!runningRef.current) return;
    setGrid(g => step(g));
    setGeneration(g => g + 1);
    setTimeout(simulate, speedRef.current);
  }, []);

  const toggleRunning = () => {
    if (!running) {
      runningRef.current = true;
      setRunning(true);
      setTimeout(simulate, speedRef.current);
    } else {
      runningRef.current = false;
      setRunning(false);
    }
  };

  const handleCellAction = (r, c) => {
    if (running) return;
    setGrid(g => {
      const next = g.map(row => [...row]);
      if (tool === "cell") next[r][c] = next[r][c] === ALIVE ? EMPTY : ALIVE;
      else if (tool === "wall") next[r][c] = next[r][c] === WALL ? EMPTY : WALL;
      else if (tool === "erase") next[r][c] = EMPTY;
      return next;
    });
  };

  const handleMouseDown = (r, c) => {
    isPainting.current = true;
    handleCellAction(r, c);
  };

  const handleMouseEnter = (r, c) => {
    if (isPainting.current) handleCellAction(r, c);
  };

  const handleMouseUp = () => { isPainting.current = false; };

  useEffect(() => {
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  const clearAll = () => {
    setRunning(false);
    runningRef.current = false;
    setGrid(createGrid());
    setGeneration(0);
  };

  const clearCells = () => {
    setRunning(false);
    runningRef.current = false;
    setGrid(g => g.map(row => row.map(c => c === WALL ? WALL : EMPTY)));
    setGeneration(0);
  };

  const stepOnce = () => {
    setGrid(g => step(g));
    setGeneration(g => g + 1);
  };

  const randomize = () => {
    setGrid(g => g.map(row => row.map(c => c === WALL ? WALL : Math.random() > 0.7 ? ALIVE : EMPTY)));
    setGeneration(0);
  };

  const loadPreset = (key) => {
    const preset = PRESETS[key];
    const next = grid.map(row => row.map(c => c === WALL ? WALL : EMPTY));
    const offR = Math.floor(ROWS / 2) - Math.floor(Math.max(...preset.cells.map(p => p[0])) / 2);
    const offC = Math.floor(COLS / 2) - Math.floor(Math.max(...preset.cells.map(p => p[1])) / 2);
    preset.cells.forEach(([r, c]) => {
      const nr = r + offR, nc = c + offC;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && next[nr][nc] !== WALL) {
        next[nr][nc] = ALIVE;
      }
    });
    setGrid(next);
    setGeneration(0);
  };

  const getCellColor = (val) => {
    if (val === ALIVE) return "#c8f56e";
    if (val === WALL) return "#5a4a6a";
    return "#1e1830";
  };

  const toolsList = [
    { id: "cell", label: "Cell", icon: "●" },
    { id: "wall", label: "Wall", icon: "▣" },
    { id: "erase", label: "Erase", icon: "✕" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "#1a1425",
      color: "#e0d8ec",
      fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "20px 10px",
      userSelect: "none",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;600;700&family=Space+Grotesk:wght@400;600;700&display=swap');
        * { box-sizing: border-box; }
      `}</style>

      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 6 }}>
        <h1 style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 28,
          fontWeight: 700,
          color: "#c8f56e",
          margin: 0,
          letterSpacing: -1,
        }}>Game of Life</h1>
        <span style={{ fontSize: 11, color: "#7a6b8a", fontWeight: 300 }}>Conway's Cellular Automaton</span>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, fontSize: 11, color: "#9a8aaa" }}>
        <span>Gen <b style={{ color: "#c8f56e" }}>{generation}</b></span>
        <span style={{ color: "#3a2f45" }}>│</span>
        <span>Pop <b style={{ color: "#e8a4f5" }}>{population}</b></span>
      </div>

      {/* Tools */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap", justifyContent: "center" }}>
        {toolsList.map(t => (
          <button key={t.id} onClick={() => setTool(t.id)} style={{
            padding: "6px 14px",
            borderRadius: 6,
            border: tool === t.id ? "2px solid #c8f56e" : "2px solid #2e2540",
            background: tool === t.id ? "#2a2340" : "#1e1830",
            color: tool === t.id ? "#c8f56e" : "#7a6b8a",
            fontSize: 12,
            fontFamily: "inherit",
            cursor: "pointer",
            transition: "all 0.15s",
            fontWeight: tool === t.id ? 600 : 400,
          }}>
            {t.icon} {t.label}
          </button>
        ))}

        <div style={{ width: 1, background: "#2e2540", margin: "0 4px" }} />

        {Object.entries(PRESETS).map(([key, val]) => (
          <button key={key} onClick={() => loadPreset(key)} style={{
            padding: "6px 12px",
            borderRadius: 6,
            border: "2px solid #2e2540",
            background: "#1e1830",
            color: "#8a7b9a",
            fontSize: 11,
            fontFamily: "inherit",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={e => { e.target.style.borderColor = "#e8a4f5"; e.target.style.color = "#e8a4f5"; }}
          onMouseLeave={e => { e.target.style.borderColor = "#2e2540"; e.target.style.color = "#8a7b9a"; }}
          >
            {val.name}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div style={{
        display: "inline-grid",
        gridTemplateColumns: `repeat(${COLS}, ${CELL_SIZE}px)`,
        gridTemplateRows: `repeat(${ROWS}, ${CELL_SIZE}px)`,
        gap: 1,
        background: "#231d30",
        padding: 2,
        borderRadius: 8,
        border: "2px solid #2e2540",
        boxShadow: "0 0 40px rgba(200, 245, 110, 0.04), inset 0 0 60px rgba(0,0,0,0.3)",
        marginBottom: 14,
        overflow: "auto",
        maxWidth: "100%",
      }}>
        {grid.map((row, r) =>
          row.map((cell, c) => (
            <div
              key={`${r}-${c}`}
              onMouseDown={() => handleMouseDown(r, c)}
              onMouseEnter={() => handleMouseEnter(r, c)}
              style={{
                width: CELL_SIZE,
                height: CELL_SIZE,
                background: getCellColor(cell),
                borderRadius: cell === WALL ? 2 : 3,
                cursor: running ? "default" : "pointer",
                transition: "background 0.08s",
                boxShadow: cell === ALIVE
                  ? "0 0 6px rgba(200, 245, 110, 0.5), inset 0 0 3px rgba(255,255,255,0.2)"
                  : cell === WALL
                  ? "inset 0 0 4px rgba(0,0,0,0.5)"
                  : "none",
              }}
            />
          ))
        )}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <button onClick={toggleRunning} style={{
          padding: "8px 22px",
          borderRadius: 6,
          border: "none",
          background: running ? "#e85a6e" : "#c8f56e",
          color: "#1a1425",
          fontSize: 13,
          fontWeight: 700,
          fontFamily: "inherit",
          cursor: "pointer",
          letterSpacing: 0.5,
        }}>
          {running ? "⏸ Pause" : "▶ Play"}
        </button>
        <button onClick={stepOnce} disabled={running} style={{
          padding: "8px 16px",
          borderRadius: 6,
          border: "2px solid #2e2540",
          background: "#1e1830",
          color: running ? "#3a3050" : "#c8f56e",
          fontSize: 13,
          fontFamily: "inherit",
          cursor: running ? "not-allowed" : "pointer",
        }}>
          Step →
        </button>
        <button onClick={randomize} style={{
          padding: "8px 16px",
          borderRadius: 6,
          border: "2px solid #2e2540",
          background: "#1e1830",
          color: "#e8a4f5",
          fontSize: 12,
          fontFamily: "inherit",
          cursor: "pointer",
        }}>
          Random
        </button>
        <button onClick={clearCells} style={{
          padding: "8px 14px",
          borderRadius: 6,
          border: "2px solid #2e2540",
          background: "#1e1830",
          color: "#8a7b9a",
          fontSize: 12,
          fontFamily: "inherit",
          cursor: "pointer",
        }}>
          Clear Cells
        </button>
        <button onClick={clearAll} style={{
          padding: "8px 14px",
          borderRadius: 6,
          border: "2px solid #2e2540",
          background: "#1e1830",
          color: "#e85a6e",
          fontSize: 12,
          fontFamily: "inherit",
          cursor: "pointer",
        }}>
          Reset All
        </button>
      </div>

      {/* Speed */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: "#7a6b8a" }}>
        <span>Slow</span>
        <input
          type="range"
          min={30}
          max={500}
          value={530 - speed}
          onChange={e => setSpeed(530 - Number(e.target.value))}
          style={{ width: 140, accentColor: "#c8f56e" }}
        />
        <span>Fast</span>
      </div>

      <p style={{
        marginTop: 16,
        fontSize: 10,
        color: "#4a3f5a",
        textAlign: "center",
        maxWidth: 500,
        lineHeight: 1.6,
      }}>
        <b>Cell</b> draws living cells · <b>Wall</b> places barriers that block life · <b>Erase</b> removes anything · Walls survive "Clear Cells"
      </p>
    </div>
  );
}
