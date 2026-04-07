import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import "./App.css";

const DEFAULT_CELL_SIZE = 18;
const MIN_CELL_SIZE = 10;
const MAX_CELL_SIZE = 34;
const COLS = 40;
const ROWS = 30;

const EMPTY = 0;
const ALIVE = 1;
const WALL = 2;
const RULE_COUNTS = Array.from({ length: 9 }, (_, i) => i);
const DEFAULT_BIRTH_RULES = [3];
const DEFAULT_SURVIVAL_RULES = [2, 3];

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

function step(grid, birthRules, survivalRules) {
  const next = grid.map(row => [...row]);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] === WALL) continue;
      const n = countNeighbors(grid, r, c);
      if (grid[r][c] === ALIVE) {
        next[r][c] = survivalRules.includes(n) ? ALIVE : EMPTY;
      } else {
        next[r][c] = birthRules.includes(n) ? ALIVE : EMPTY;
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
  const [cellSize, setCellSize] = useState(DEFAULT_CELL_SIZE);
  const [birthRules, setBirthRules] = useState(DEFAULT_BIRTH_RULES);
  const [survivalRules, setSurvivalRules] = useState(DEFAULT_SURVIVAL_RULES);
  const population = useMemo(() => grid.flat().filter(c => c === ALIVE).length, [grid]);
  const runningRef = useRef(running);
  const speedRef = useRef(speed);
  const birthRulesRef = useRef(birthRules);
  const survivalRulesRef = useRef(survivalRules);
  const simulateRef = useRef(null);
  const isPainting = useRef(false);

  useEffect(() => { runningRef.current = running; }, [running]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { birthRulesRef.current = birthRules; }, [birthRules]);
  useEffect(() => { survivalRulesRef.current = survivalRules; }, [survivalRules]);

  const simulate = useCallback(() => {
    if (!runningRef.current) return;
    setGrid(g => step(g, birthRulesRef.current, survivalRulesRef.current));
    setGeneration(g => g + 1);
    setTimeout(() => simulateRef.current?.(), speedRef.current);
  }, []);

  useEffect(() => {
    simulateRef.current = simulate;
  }, [simulate]);

  const toggleRunning = () => {
    if (!running) {
      runningRef.current = true;
      setRunning(true);
      setTimeout(() => simulateRef.current?.(), speedRef.current);
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
    setGrid(g => step(g, birthRules, survivalRules));
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

  const getCellClass = (val) => {
    if (val === ALIVE) return "cell cell--alive";
    if (val === WALL) return "cell cell--wall";
    return "cell cell--empty";
  };

  const toolsList = [
    { id: "cell", label: "Cell", icon: "●" },
    { id: "wall", label: "Wall", icon: "▣" },
    { id: "erase", label: "Erase", icon: "✕" },
  ];

  const toggleRule = (type, count) => {
    const setRules = type === "birth" ? setBirthRules : setSurvivalRules;
    setRules(rules => (
      rules.includes(count)
        ? rules.filter(rule => rule !== count)
        : [...rules, count].sort((a, b) => a - b)
    ));
  };

  const resetRules = () => {
    setBirthRules(DEFAULT_BIRTH_RULES);
    setSurvivalRules(DEFAULT_SURVIVAL_RULES);
  };

  const rulesLabel = `B${birthRules.join("") || "-"}/S${survivalRules.join("") || "-"}`;

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Interactive cellular automaton</p>
          <h1>Game of Life</h1>
        </div>
        <div className="stats">
          <span>Generation <b>{generation}</b></span>
          <span>Population <b>{population}</b></span>
        </div>
      </section>

      <section className="workspace">
        <aside className="control-panel" aria-label="Game controls">
          <div className="panel-group">
            <p className="panel-label">Draw Mode</p>
            <div className="button-grid">
              {toolsList.map(t => (
                <button
                  key={t.id}
                  className={`button button--tool ${tool === t.id ? "button--active" : ""}`}
                  onClick={() => setTool(t.id)}
                >
                  <span>{t.icon}</span> {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="panel-group">
            <p className="panel-label">Presets</p>
            <div className="button-grid">
              {Object.entries(PRESETS).map(([key, val]) => (
                <button key={key} className="button" onClick={() => loadPreset(key)}>
                  {val.name}
                </button>
              ))}
            </div>
          </div>

          <div className="panel-group">
            <p className="panel-label">Simulation</p>
            <div className="button-grid">
              <button className={`button button--primary ${running ? "button--danger" : ""}`} onClick={toggleRunning}>
                {running ? "Pause" : "Play"}
              </button>
              <button className="button" onClick={stepOnce} disabled={running}>
                Step
              </button>
              <button className="button" onClick={randomize}>
                Random
              </button>
              <button className="button" onClick={clearCells}>
                Clear Cells
              </button>
              <button className="button button--danger-text" onClick={clearAll}>
                Reset All
              </button>
            </div>
          </div>

          <div className="panel-group">
            <label className="range-label" htmlFor="speed">
              <span>Speed</span>
              <strong>{Math.round(((530 - speed) / 500) * 100)}%</strong>
            </label>
            <input
              id="speed"
              className="range"
              type="range"
              min={30}
              max={500}
              value={530 - speed}
              onChange={e => setSpeed(530 - Number(e.target.value))}
            />
          </div>

          <div className="panel-group">
            <label className="range-label" htmlFor="zoom">
              <span>Zoom</span>
              <strong>{cellSize}px</strong>
            </label>
            <input
              id="zoom"
              className="range"
              type="range"
              min={MIN_CELL_SIZE}
              max={MAX_CELL_SIZE}
              value={cellSize}
              onChange={e => setCellSize(Number(e.target.value))}
            />
            <div className="zoom-actions">
              <button className="button button--compact" onClick={() => setCellSize(size => Math.max(MIN_CELL_SIZE, size - 2))}>
                -
              </button>
              <button className="button button--compact" onClick={() => setCellSize(DEFAULT_CELL_SIZE)}>
                Reset
              </button>
              <button className="button button--compact" onClick={() => setCellSize(size => Math.min(MAX_CELL_SIZE, size + 2))}>
                +
              </button>
            </div>
          </div>

          <div className="panel-group">
            <div className="rule-heading">
              <p className="panel-label">Rules</p>
              <strong>{rulesLabel}</strong>
            </div>
            <p className="rule-help">Birth applies to empty cells. Survival applies to living cells.</p>
            <div className="rule-row">
              <span>Birth</span>
              <div className="rule-options">
                {RULE_COUNTS.map(count => (
                  <button
                    key={`birth-${count}`}
                    className={`rule-toggle ${birthRules.includes(count) ? "rule-toggle--active" : ""}`}
                    onClick={() => toggleRule("birth", count)}
                    aria-pressed={birthRules.includes(count)}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>
            <div className="rule-row">
              <span>Survive</span>
              <div className="rule-options">
                {RULE_COUNTS.map(count => (
                  <button
                    key={`survival-${count}`}
                    className={`rule-toggle ${survivalRules.includes(count) ? "rule-toggle--active" : ""}`}
                    onClick={() => toggleRule("survival", count)}
                    aria-pressed={survivalRules.includes(count)}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>
            <button className="button button--compact" onClick={resetRules}>
              Reset to Conway
            </button>
          </div>

          <p className="hint">
            Cell draws living cells. Wall places barriers that block life. Erase removes anything. Walls survive Clear Cells.
          </p>
        </aside>

        <section className="board-panel" aria-label="Game board">
          <div className="board-frame">
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${COLS}, ${cellSize}px)`,
                gridTemplateRows: `repeat(${ROWS}, ${cellSize}px)`,
              }}
            >
              {grid.map((row, r) =>
                row.map((cell, c) => (
                  <div
                    key={`${r}-${c}`}
                    className={getCellClass(cell)}
                    onMouseDown={() => handleMouseDown(r, c)}
                    onMouseEnter={() => handleMouseEnter(r, c)}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      cursor: running ? "default" : "pointer",
                    }}
                  />
                ))
              )}
            </div>
          </div>
          <div className="board-footer">
            <span>{ROWS} x {COLS} grid</span>
            <span>Zoom {cellSize}px cells</span>
          </div>
        </section>
      </section>
    </main>
  );
}
