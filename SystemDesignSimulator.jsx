import React, { useState, useMemo, useEffect } from "react"
import { Zap, HardDrive, Activity, Network, Cpu, BarChart3, GitBranch, Sparkles, Loader2 } from "lucide-react"
import { NODE_CONFIG, SCENARIOS } from "./scenarios/index.js"
import MermaidDiagram from "./src/MermaidDiagram.jsx"
import TradeoffCorrelations from "./src/TradeoffCorrelations.jsx"

// ── NODE_W / NODE_H constants ──────────────────────────────────────────────────

const NODE_W = 108
const NODE_H = 46

// ── ArchDiagram ────────────────────────────────────────────────────────────────

const FALLBACK_CONFIG = {
  bg: "bg-slate-800",
  border: "border-slate-600",
  text: "text-slate-300",
}

const DOT_COLOR_MAP = {
  "border-emerald-500":   "bg-emerald-400",
  "border-emerald-500/50":"bg-emerald-400",
  "border-blue-500":      "bg-blue-400",
  "border-blue-500/50":   "bg-blue-400",
  "border-violet-500":    "bg-violet-400",
  "border-violet-500/50": "bg-violet-400",
  "border-amber-500":     "bg-amber-400",
  "border-amber-500/50":  "bg-amber-400",
  "border-rose-500":      "bg-rose-400",
  "border-rose-500/50":   "bg-rose-400",
  "border-cyan-500":      "bg-cyan-400",
  "border-cyan-500/50":   "bg-cyan-400",
  "border-orange-500":    "bg-orange-400",
  "border-orange-500/50": "bg-orange-400",
  "border-pink-500":      "bg-pink-400",
  "border-pink-500/50":   "bg-pink-400",
  "border-slate-600":     "bg-slate-400",
  "border-slate-700":     "bg-slate-500",
}

function resolveDotColor(borderClass) {
  if (!borderClass) return "bg-slate-400"
  // Try exact match first
  if (DOT_COLOR_MAP[borderClass]) return DOT_COLOR_MAP[borderClass]
  // Try prefix match for compound classes
  for (const key of Object.keys(DOT_COLOR_MAP)) {
    if (borderClass.includes(key.replace("border-", ""))) {
      return DOT_COLOR_MAP[key]
    }
  }
  return "bg-slate-400"
}

function ArchDiagram({ scaleData, nodeConfig }) {
  const { title, nodes = [], edges = [] } = scaleData || {}
  const config = nodeConfig || {}

  const nodeMap = useMemo(() => {
    const map = {}
    for (const node of nodes) {
      map[node.id] = node
    }
    return map
  }, [nodes])

  const uniqueTypes = useMemo(() => {
    const seen = new Set()
    const types = []
    for (const node of nodes) {
      if (!seen.has(node.type)) {
        seen.add(node.type)
        types.push(node.type)
      }
    }
    return types
  }, [nodes])

  return (
    <div className="overflow-auto">
      {/* Canvas */}
      <div className="relative" style={{ width: 740, height: 480 }}>

        {/* SVG overlay for edges */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={740}
          height={480}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth={6}
              markerHeight={4}
              refX={6}
              refY={2}
              orient="auto"
            >
              <polygon points="0 0, 6 2, 0 4" fill="#475569" />
            </marker>
          </defs>

          {edges.map(([srcId, dstId], i) => {
            const src = nodeMap[srcId]
            const dst = nodeMap[dstId]
            if (!src || !dst) return null

            const x1 = src.x + NODE_W / 2
            const y1 = src.y + NODE_H / 2
            const x2 = dst.x + NODE_W / 2
            const y2 = dst.y + NODE_H / 2
            const midX = (x1 + x2) / 2

            const d =
              "M " + x1 + "," + y1 +
              " C " + midX + "," + y1 +
              " " + midX + "," + y2 +
              " " + x2 + "," + y2

            return (
              <path
                key={i}
                d={d}
                stroke="#334155"
                strokeWidth={1.5}
                strokeDasharray="5 3"
                fill="none"
                markerEnd="url(#arrowhead)"
                opacity={0.7}
              />
            )
          })}
        </svg>

        {/* Nodes */}
        {nodes.map((node) => {
          const cfg = config[node.type] || FALLBACK_CONFIG
          const dotColor = resolveDotColor(cfg.border)
          const nodeClasses =
            "absolute border rounded-lg flex flex-col items-center justify-center px-2 py-1.5 " +
            (cfg.bg || FALLBACK_CONFIG.bg) + " " +
            (cfg.border || FALLBACK_CONFIG.border) + " " +
            (cfg.text || FALLBACK_CONFIG.text)

          return (
            <div
              key={node.id}
              className={nodeClasses}
              style={{
                left: node.x,
                top: node.y,
                width: NODE_W,
                minHeight: NODE_H,
              }}
              title={node.label}
            >
              <span className={"w-1.5 h-1.5 rounded-full mb-0.5 " + dotColor} />
              <span className="text-[10px] font-mono font-semibold text-center leading-tight whitespace-pre-line">
                {node.label}
              </span>
            </div>
          )
        })}

        {/* Node / edge count badge */}
        <div className="absolute top-2 right-2 text-[9px] font-mono text-slate-600 bg-slate-900/80 px-2 py-1 rounded border border-slate-800">
          {nodes.length} nodes / {edges.length} edges
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-2 py-2 border-t border-slate-800">
        {uniqueTypes.map((type) => {
          const cfg = config[type] || FALLBACK_CONFIG
          const dotColor = resolveDotColor(cfg.border)
          return (
            <span key={type} className="flex items-center gap-1">
              <span className={"w-1.5 h-1.5 rounded-full " + dotColor} />
              <span className="text-[10px] text-slate-500 font-mono">{type}</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}

// ── ScenarioSelector ───────────────────────────────────────────────────────────

function ScenarioSelector({ scenarios, selectedId, onSelect }) {
  const customSelected = selectedId === "custom"
  return (
    <div>
      <div className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-2">
        Scenario
      </div>
      <div className="flex flex-col gap-1">
        {scenarios.map((scenario) => {
          const isSelected = scenario.id === selectedId
          return (
            <div
              key={scenario.id}
              onClick={() => onSelect(scenario.id)}
              className={
                "flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-colors " +
                (isSelected
                  ? "bg-emerald-950/40 border border-emerald-800/60 text-slate-100"
                  : "text-slate-400 hover:bg-slate-800")
              }
            >
              <span className="text-lg">{scenario.emoji}</span>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{scenario.name}</div>
                <div className="text-xs text-slate-500 truncate">{scenario.tag}</div>
              </div>
            </div>
          )
        })}
        {/* Custom / AI-generated scenario */}
        <div
          onClick={() => onSelect("custom")}
          className={
            "flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-colors border border-dashed " +
            (customSelected
              ? "bg-purple-950/30 border-purple-700/60 text-slate-100"
              : "border-slate-700 text-slate-500 hover:bg-slate-800 hover:text-slate-300")
          }
        >
          <Sparkles className="w-4 h-4 shrink-0 text-purple-400" />
          <div className="min-w-0">
            <div className="text-sm font-medium">Custom Scenario</div>
            <div className="text-xs text-slate-600">AI-generated questions</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── FlowTracker ────────────────────────────────────────────────────────────────

const STAGES = [
  { id: 0, label: "Requirements Gathering" },
  { id: 1, label: "Scale Analysis" },
  { id: 2, label: "Visual Architecture" },
  { id: 3, label: "Trade-off Engine" },
]

function CheckIcon() {
  return (
    <svg
      className="w-3 h-3 text-emerald-400 shrink-0"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2 6l3 3 5-5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function FlowTracker({ currentStage, completedStages, onStageClick }) {
  function isAccessible(id) {
    if (completedStages.has(id)) return true
    if (id <= currentStage) return true
    if (id > 0 && completedStages.has(id - 1)) return true
    return false
  }

  return (
    <div>
      <div className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-2">
        Interview Flow
      </div>
      <div className="flex flex-col gap-1">
        {STAGES.map(({ id, label }) => {
          const isActive = id === currentStage
          const isCompleted = completedStages.has(id)
          const accessible = isAccessible(id)

          let rowClass =
            "flex items-center gap-3 px-3 py-2.5 rounded transition-colors "
          if (isActive) {
            rowClass +=
              "bg-emerald-950/40 border-l-2 border-emerald-500 text-emerald-300 cursor-pointer"
          } else if (!accessible) {
            rowClass += "text-slate-600 cursor-not-allowed opacity-50"
          } else {
            rowClass += "text-slate-400 hover:bg-slate-800 cursor-pointer"
          }

          let badgeClass =
            "w-6 h-6 rounded-full text-xs font-mono flex items-center justify-center shrink-0 "
          if (isActive) {
            badgeClass += "bg-emerald-500 text-zinc-950"
          } else if (!accessible) {
            badgeClass += "bg-slate-800 text-slate-600"
          } else {
            badgeClass += "bg-slate-700 text-slate-400"
          }

          return (
            <div
              key={id}
              className={rowClass}
              onClick={() => {
                if (accessible && onStageClick) {
                  onStageClick(id)
                }
              }}
            >
              <div className={badgeClass}>
                {isCompleted && !isActive ? <CheckIcon /> : id + 1}
              </div>
              <span className="text-sm">{label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── RequirementsChat ───────────────────────────────────────────────────────────

function RequirementsChat({ questions, onComplete }) {
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState({})
  const [currentInput, setCurrentInput] = useState("")

  const answeredCount = Object.keys(answers).length
  const allAnswered = answeredCount === questions.length
  const progressPercent =
    questions.length > 0 ? (answeredCount / questions.length) * 100 : 0

  function handleSubmit() {
    if (!currentInput.trim()) return
    const q = questions[currentQ]
    setAnswers((prev) => ({ ...prev, [q.id]: currentInput.trim() }))
    setCurrentInput("")
    setCurrentQ((prev) => prev + 1)
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSubmit()
    }
    if (e.key === "Tab") {
      e.preventDefault()
      const hint = questions[currentQ]?.hint
      if (hint && !currentInput) setCurrentInput(hint)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Progress bar */}
      <div className="h-1 w-full bg-slate-800 rounded overflow-hidden">
        <div
          className="h-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Question counter */}
      <div className="text-xs font-mono text-slate-500">
        Question {Math.min(currentQ + 1, questions.length)} of {questions.length}
      </div>

      {/* Chat history: answered questions */}
      <div className="flex flex-col">
        {questions.slice(0, answeredCount).map((q) => (
          <div key={q.id} className="mb-3">
            {/* Interviewer bubble */}
            <div className="flex gap-2 mb-1">
              <span className="text-[9px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded shrink-0 mt-0.5 h-fit">
                SDE-V
              </span>
              <span className="text-xs text-slate-400 leading-relaxed">{q.text}</span>
            </div>
            {/* Answer bubble */}
            {answers[q.id] && (
              <div className="text-xs text-slate-300 bg-slate-800 rounded px-2.5 py-2 ml-8 mb-1 italic">
                {answers[q.id]}
              </div>
            )}
          </div>
        ))}

        {/* Current question */}
        {!allAnswered && questions[currentQ] && (
          <div className="mb-2">
            <div className="text-[10px] font-mono text-emerald-500 mb-1">
              {questions[currentQ].label}
            </div>
            <div className="flex gap-2">
              <span className="text-[9px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded shrink-0 mt-0.5 h-fit">
                SDE-V
              </span>
              <span className="text-xs text-slate-200 leading-relaxed">
                {questions[currentQ].text}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      {!allAnswered && questions[currentQ] && (
        <div>
          <div className="relative">
            <textarea
              className="w-full bg-slate-900 border border-slate-700 rounded text-xs text-slate-200 p-2.5 resize-none focus:outline-none focus:border-emerald-700 transition-colors"
              rows={3}
              placeholder={questions[currentQ].hint}
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {!currentInput && (
              <span className="absolute bottom-2 right-2 text-[9px] font-mono text-slate-600 pointer-events-none select-none">
                Tab to fill example
              </span>
            )}
          </div>
          <button
            className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 text-xs font-semibold py-2 rounded transition-colors"
            onClick={handleSubmit}
            disabled={!currentInput.trim()}
          >
            Submit Answer
          </button>
        </div>
      )}

      {/* Unlock Architecture button */}
      {allAnswered && (
        <button
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold py-2.5 rounded flex items-center justify-center gap-2 transition-colors"
          onClick={() => onComplete && onComplete(answers)}
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="3" y="7" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M5.5 7V5a2.5 2.5 0 015 0v2"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          Unlock Architecture
        </button>
      )}
    </div>
  )
}

// ── ScaleMetricsPanel ──────────────────────────────────────────────────────────

function ScaleMetricsPanel({ estimates }) {
  const cards = [
    {
      icon: <Zap className="w-4 h-4 text-emerald-400" />,
      label: "Peak QPS",
      value: estimates.qps,
    },
    {
      icon: <HardDrive className="w-4 h-4 text-emerald-400" />,
      label: "Storage / Day",
      value: estimates.storage,
    },
    {
      icon: <Activity className="w-4 h-4 text-emerald-400" />,
      label: "Cache RAM",
      value: estimates.cache,
    },
    {
      icon: <Network className="w-4 h-4 text-emerald-400" />,
      label: "Bandwidth",
      value: estimates.bandwidth,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-slate-800 rounded border border-slate-700 p-3 flex flex-col gap-1"
        >
          {card.icon}
          <span className="text-[10px] uppercase tracking-wide text-slate-500">
            {card.label}
          </span>
          <span className="font-mono text-sm text-emerald-400 font-semibold">
            {card.value.split("\n")[0]}
          </span>
          {card.value.includes("\n") && (
            <span className="font-mono text-[9px] text-slate-500 leading-relaxed">
              {card.value.split("\n").slice(1).join(" ")}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

// ── KVCacheCalc ────────────────────────────────────────────────────────────────

function KVCacheCalc({ onMemoryChange }) {
  const [L, setL] = useState(32)
  const [H, setH] = useState(32)
  const [D, setD] = useState(128)
  const [B, setB] = useState(8)
  const [S, setS] = useState(4096)
  const [P, setP] = useState(2)
  const [prefixReuse, setPrefixReuse] = useState(0)
  const [specEnabled, setSpecEnabled] = useState(false)

  const rawKVBytes = 2 * L * H * D * S * B * P
  const kvBytes = rawKVBytes * ((100 - prefixReuse) / 100)
  const kvGB = kvBytes / 1073741824
  const specFactor = specEnabled ? 1.15 : 1.0
  const effectiveBytes = kvBytes * specFactor

  useEffect(() => {
    onMemoryChange(effectiveBytes)
  }, [effectiveBytes, onMemoryChange])

  const precisionLabel =
    P === 1 ? "INT8" : P === 2 ? "BF16/FP16" : P === 4 ? "FP32" : "FP8"

  const baseSliders = [
    { label: `Layers: ${L}`,   value: L, set: setL, min: 1,   max: 128,   step: 1   },
    { label: `Heads: ${H}`,    value: H, set: setH, min: 1,   max: 128,   step: 1   },
    { label: `Head Dim: ${D}`, value: D, set: setD, min: 32,  max: 256,   step: 32  },
    { label: `Batch: ${B}`,    value: B, set: setB, min: 1,   max: 64,    step: 1   },
    { label: `Seq Len: ${S}`,  value: S, set: setS, min: 128, max: 32768, step: 128 },
    {
      label: `Precision: ${precisionLabel} (${P}B)`,
      value: P, set: setP, min: 1, max: 4, step: 1,
    },
  ]

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Cpu className="w-4 h-4 text-emerald-400" />
        <span className="text-sm font-semibold text-slate-200">KV Cache Calculator</span>
      </div>

      {baseSliders.map((s) => (
        <div key={s.label.split(":")[0]} className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-mono text-slate-400 w-32 shrink-0">{s.label}</span>
          <input
            type="range"
            className="flex-1 accent-emerald-500 cursor-pointer h-1"
            min={s.min} max={s.max} step={s.step} value={s.value}
            onChange={(e) => s.set(Number(e.target.value))}
          />
        </div>
      ))}

      {/* Divider */}
      <div className="border-t border-slate-800 my-3" />

      {/* RadixTree Prefix Reuse */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-mono text-slate-400 w-32 shrink-0">
          Prefix Reuse: {prefixReuse}%
        </span>
        <input
          type="range"
          className="flex-1 accent-teal-500 cursor-pointer h-1"
          min={0} max={100} step={5} value={prefixReuse}
          onChange={(e) => setPrefixReuse(Number(e.target.value))}
        />
      </div>
      <div className="text-[9px] font-mono text-teal-600 mb-3 ml-0">
        RadixTree cache reuse — reduces active KV by {prefixReuse}%
      </div>

      {/* Speculative Decoding Toggle */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-[10px] font-mono text-slate-400">Speculative Decoding</span>
        <button
          onClick={() => setSpecEnabled(!specEnabled)}
          className={
            "relative inline-flex h-5 w-9 items-center rounded-full transition-colors " +
            (specEnabled ? "bg-emerald-600" : "bg-slate-700")
          }
        >
          <span
            className={
              "inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform " +
              (specEnabled ? "translate-x-4" : "translate-x-1")
            }
          />
        </button>
        {specEnabled && (
          <span className="text-[9px] font-mono text-emerald-500">+15% overhead</span>
        )}
      </div>

      {/* Result box */}
      <div className="bg-slate-900 rounded border border-emerald-900/50 p-3">
        <div className="text-[10px] font-mono uppercase tracking-wide text-slate-500 mb-1">
          Effective KV Cache Memory
        </div>
        <div className="text-2xl font-mono font-bold text-emerald-400">
          {(effectiveBytes / 1073741824).toFixed(2)} GB
        </div>
        <div className="text-[9px] font-mono text-slate-600 mt-1">
          raw: 2×{L}×{H}×{D}×{S}×{B}×{P} / 1G = {(rawKVBytes / 1073741824).toFixed(2)} GB
        </div>
        {prefixReuse > 0 && (
          <div className="text-[9px] font-mono text-teal-600 mt-0.5">
            after {prefixReuse}% prefix reuse: {kvGB.toFixed(2)} GB
          </div>
        )}
        {specEnabled && (
          <div className="text-[9px] font-mono text-emerald-600 mt-0.5">
            ×1.15 speculative overhead → {(effectiveBytes / 1073741824).toFixed(2)} GB
          </div>
        )}
      </div>
    </div>
  )
}

// ── TopologyCalc ───────────────────────────────────────────────────────────────

function TopologyCalc({ kvMemoryBytes }) {
  const [wB, setWB] = useState(70)
  const [precisionB, setPrecisionB] = useState(2)
  const [vramGB, setVramGB] = useState(80)
  const [tp, setTp] = useState(4)
  const [pp, setPp] = useState(2)
  const [interconnect, setInterconnect] = useState("infiniband")

  const weightBytes = wB * 1e9 * precisionB
  const totalBytes = weightBytes + kvMemoryBytes
  const totalGB = totalBytes / 1073741824
  const requiredGPUs = Math.ceil(totalGB / (vramGB * 0.8))
  const allocatedGPUs = tp * pp
  const perGPUGB = allocatedGPUs > 0 ? totalGB / allocatedGPUs : Infinity

  const isOOM = perGPUGB > vramGB
  const isSufficient = allocatedGPUs >= requiredGPUs
  const isPCIeWarning = pp > 1 && interconnect === "pcie"

  const modelOptions = [7, 13, 34, 70, 140, 405]
  const precisionOptions = [
    { label: "FP32", value: 4 },
    { label: "BF16/FP16", value: 2 },
    { label: "INT8", value: 1 },
    { label: "INT4", value: 0.5 },
  ]
  const vramOptions = [
    { label: "24 GB (A10G)", value: 24 },
    { label: "40 GB (A100 PCIe)", value: 40 },
    { label: "80 GB (H100 SXM)", value: 80 },
    { label: "141 GB (H200)", value: 141 },
  ]
  const interconnectOptions = [
    { label: "NVLink / InfiniBand (RoCE v2)", value: "infiniband" },
    { label: "Standard PCIe", value: "pcie" },
  ]

  const selectClass =
    "w-full bg-slate-800 border border-slate-700 rounded text-xs text-slate-200 px-2 py-1.5 font-mono"

  const miniCards = [
    { label: "Required GPUs",  value: requiredGPUs,                                    color: "text-emerald-400" },
    { label: "Total VRAM",     value: (requiredGPUs * vramGB) + " GB",                 color: "text-blue-400"   },
    { label: "Weight Mem",     value: (weightBytes / 1073741824).toFixed(1) + " GB",   color: "text-purple-400" },
    { label: "KV Cache",       value: (kvMemoryBytes / 1073741824).toFixed(2) + " GB", color: "text-amber-400"  },
  ]

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <GitBranch className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-semibold text-slate-200">Distributed Topology</span>
      </div>

      {[
        { label: "Model Params (B)", value: wB,          set: setWB,          options: modelOptions.map(v => ({ label: v + "B", value: v })) },
        { label: "Precision",        value: precisionB,  set: setPrecisionB,  options: precisionOptions },
        { label: "GPU VRAM",         value: vramGB,       set: setVramGB,      options: vramOptions },
        { label: "Interconnect",     value: interconnect, set: setInterconnect, options: interconnectOptions, isStr: true },
      ].map((sel) => (
        <div key={sel.label} className="mb-2">
          <label className="text-[10px] font-mono text-slate-400 block mb-1">{sel.label}</label>
          <select
            className={selectClass}
            value={sel.value}
            onChange={(e) => sel.set(sel.isStr ? e.target.value : Number(e.target.value))}
          >
            {sel.options.map((opt) => (
              <option key={opt.label} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      ))}

      {/* TP Slider */}
      <div className="flex items-center gap-2 mb-2 mt-3">
        <span className="text-[10px] font-mono text-slate-400 w-32 shrink-0">
          Tensor Parallel (TP): {tp}
        </span>
        <input type="range" className="flex-1 accent-emerald-500 cursor-pointer h-1"
          min={1} max={8} step={1} value={tp} onChange={(e) => setTp(Number(e.target.value))} />
      </div>

      {/* PP Slider */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[10px] font-mono text-slate-400 w-32 shrink-0">
          Pipeline Parallel (PP): {pp}
        </span>
        <input type="range" className="flex-1 accent-blue-500 cursor-pointer h-1"
          min={1} max={16} step={1} value={pp} onChange={(e) => setPp(Number(e.target.value))} />
      </div>

      {/* Mini metric cards */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {miniCards.map((card) => (
          <div key={card.label} className="bg-slate-800 rounded p-2 border border-slate-700">
            <div className="text-[10px] font-mono text-slate-500 mb-0.5">{card.label}</div>
            <div className={"text-sm font-mono font-semibold " + card.color}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Per-GPU allocation line */}
      <div className={"text-[9px] font-mono mb-2 " + (isOOM ? "text-red-400" : "text-slate-600")}>
        Per-GPU alloc: {perGPUGB.toFixed(1)} GB / {vramGB} GB available
      </div>

      {/* Validation banners — stack vertically */}
      <div className="flex flex-col gap-1.5">
        {isOOM && (
          <div className="bg-red-950/60 border border-red-700/60 rounded px-3 py-2 text-[10px] font-mono text-red-400">
            OOM: {perGPUGB.toFixed(1)} GB per GPU exceeds {vramGB} GB VRAM. Increase TP×PP or reduce batch/precision.
          </div>
        )}
        {!isSufficient && !isOOM && (
          <div className="bg-amber-950/50 border border-amber-800/60 rounded px-3 py-2 text-[10px] font-mono text-amber-400">
            Warning: TP×PP = {tp}×{pp} = {allocatedGPUs} {"<"} required {requiredGPUs} GPUs. Insufficient compute width.
          </div>
        )}
        {isPCIeWarning && (
          <div className="bg-orange-950/50 border border-orange-800/60 rounded px-3 py-2 text-[10px] font-mono text-orange-400">
            PCIe Warning: PP={pp} over Standard PCIe introduces high bubble latency. Upgrade to InfiniBand/RoCE v2.
          </div>
        )}
        {isSufficient && !isOOM && !isPCIeWarning && (
          <div className="bg-emerald-950/50 border border-emerald-800/60 rounded px-3 py-2 text-[10px] font-mono text-emerald-400">
            Valid: {allocatedGPUs} GPU slots cover {requiredGPUs} required — {interconnect === "infiniband" ? "optimal fabric" : "PCIe (PP=1 only)"}
          </div>
        )}
      </div>
    </div>
  )
}

// ── RightPanel ─────────────────────────────────────────────────────────────────

function RightPanel({ isAI, estimates }) {
  const [kvMemoryBytes, setKvMemoryBytes] = useState(0)

  return (
    <div className="h-full overflow-y-auto bg-slate-900 border-l border-slate-800 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800">
        <BarChart3 className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-semibold text-slate-200">
          Hardware &amp; Metrics
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-6 px-4 py-4">
        {isAI ? (
          <>
            <KVCacheCalc onMemoryChange={setKvMemoryBytes} />
            <hr className="border-slate-700" />
            <TopologyCalc kvMemoryBytes={kvMemoryBytes} />
          </>
        ) : (
          <ScaleMetricsPanel estimates={estimates} />
        )}
      </div>
    </div>
  )
}

// ── DynArchPanel ────────────────────────────────────────────────────────────────

function DynArchPanel({ mermaidCode, systemConfig }) {
  if (!systemConfig) return null
  const { summary, bottlenecksIdentified = [], recommendedTechStack = {}, scaleEstimates = {}, tradeoffs = [] } = systemConfig

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Summary */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
        <div className="text-[10px] font-mono uppercase tracking-widest text-purple-400 mb-2">AI Architecture Summary</div>
        <p className="text-sm text-slate-200 leading-relaxed">{summary}</p>
      </div>

      {/* Mermaid diagram */}
      {mermaidCode && (
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">Architecture Diagram</div>
          <MermaidDiagram code={mermaidCode} />
        </div>
      )}

      {/* Bottlenecks */}
      {bottlenecksIdentified.length > 0 && (
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-amber-500 mb-2">Bottlenecks Identified</div>
          <ul className="space-y-1">
            {bottlenecksIdentified.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                <span className="text-amber-500 mt-0.5">▸</span>{b}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tech stack */}
      {Object.keys(recommendedTechStack).length > 0 && (
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">Recommended Stack</div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(recommendedTechStack).map(([k, v]) => (
              <div key={k} className="bg-slate-800 rounded border border-slate-700 p-2">
                <div className="text-[10px] font-mono text-slate-500 capitalize mb-0.5">{k}</div>
                <div className="text-xs font-mono text-emerald-300">{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scale estimates */}
      {Object.keys(scaleEstimates).length > 0 && (
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">Scale Estimates</div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(scaleEstimates).map(([k, v]) => {
              const [val, ...rest] = String(v).split("\n")
              return (
                <div key={k} className="bg-slate-800 rounded border border-slate-700 p-2">
                  <div className="text-[10px] font-mono text-slate-500 capitalize mb-0.5">{k}</div>
                  <div className="text-xs font-mono text-blue-300 font-semibold">{val}</div>
                  {rest.length > 0 && <div className="text-[9px] font-mono text-slate-500 mt-0.5 leading-relaxed">{rest.join(" ")}</div>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Trade-offs — shallow fallback (always shown) */}
      {tradeoffs.length > 0 && (
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">Trade-off Analysis</div>
          {tradeoffs.map((t, i) => (
            <div key={i} className="bg-slate-800 border border-slate-700 rounded-lg p-3 mb-2">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="text-[10px] font-mono text-slate-500">{t.dimension}</div>
                <span className="shrink-0 bg-purple-950 text-purple-400 border border-purple-800 text-[9px] font-mono px-1.5 py-0.5 rounded">{t.winner}</span>
              </div>
              <div className="text-xs font-semibold text-slate-200 mb-1">{t.choice}</div>
              <p className="text-xs text-slate-400 leading-relaxed">{t.tradeoff}</p>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}

// ── SystemDesignSimulator (main) ───────────────────────────────────────────────

function SystemDesignSimulator() {
  // Static scenario state
  const [selectedId, setSelectedId] = useState("tiktok")
  const [stage, setStage] = useState(0)
  const [completedStages, setCompletedStages] = useState(new Set())
  const [activeScale, setActiveScale] = useState("low")
  const [answers, setAnswers] = useState(null)

  // Dynamic (AI) mode state
  const [customInput, setCustomInput] = useState("")
  const [dynPhase, setDynPhase] = useState("idle") // idle | p1loading | questions | p2loading | done
  const [dynMeta, setDynMeta] = useState(null)     // Phase 1 result
  const [dynAnswers, setDynAnswers] = useState(null)
  const [dynResult, setDynResult] = useState(null) // Phase 2 result: { systemConfig, mermaidCode }
  const [dynError, setDynError] = useState(null)

  const isCustom = selectedId === "custom"
  const scenario = isCustom ? null : SCENARIOS[selectedId]
  const scenarioList = Object.values(SCENARIOS).map(s => ({ id: s.id, name: s.name, tag: s.tag, emoji: s.emoji }))

  function resetAll() {
    setStage(0); setCompletedStages(new Set()); setActiveScale("low"); setAnswers(null)
  }

  function resetDyn() {
    setDynPhase("idle"); setDynMeta(null); setDynAnswers(null); setDynResult(null); setDynError(null); setCustomInput("")
  }

  function handleScenarioChange(id) {
    setSelectedId(id)
    resetAll()
    if (id === "custom") resetDyn()
  }

  // Static flow
  function handleRequirementsComplete(ans) {
    setAnswers(ans)
    setCompletedStages(prev => { const next = new Set(prev); next.add(0); return next })
    setStage(2)
  }
  function handleStageClick(stageId) {
    const accessible = stageId <= stage || completedStages.has(stageId) || completedStages.has(stageId - 1)
    if (accessible) setStage(stageId)
  }

  // Dynamic Phase 1
  async function handleCustomSubmit() {
    if (!customInput.trim()) return
    setDynPhase("p1loading")
    setDynError(null)
    try {
      const res = await fetch("/api/requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: customInput.trim() }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setDynMeta(data)
      setDynPhase("questions")
    } catch (e) {
      setDynError("Phase 1 failed: " + e.message)
      setDynPhase("idle")
    }
  }

  // Dynamic Phase 2
  async function handleDynAnswersComplete(ans) {
    setDynAnswers(ans)
    setDynPhase("p2loading")
    setDynError(null)
    try {
      const res = await fetch("/api/architecture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario: customInput.trim(),
          questions: dynMeta?.questions ?? [],
          answers: ans,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setDynResult(data)
      setDynPhase("done")
    } catch (e) {
      setDynError("Phase 2 failed: " + e.message)
      setDynPhase("questions")
    }
  }



  // ── Custom mode center rendering ─────────────────────────────────────────────
  function renderCustomCenter() {
    if (dynPhase === "idle") {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 gap-5">
          <div className="w-full max-w-lg">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <span className="text-sm font-semibold text-slate-200">Describe your system</span>
            </div>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Enter any system design scenario. Claude will generate tailored technical
              requirements questions and then produce a full architecture with Mermaid diagram.
            </p>
            <textarea
              className="w-full bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 p-3 resize-none focus:outline-none focus:border-purple-600 transition-colors"
              rows={5}
              placeholder="e.g. Design a real-time collaborative document editing system like Google Docs, handling 1M concurrent users..."
              value={customInput}
              onChange={e => setCustomInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleCustomSubmit() }}
            />
            <button
              className="mt-3 w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors"
              onClick={handleCustomSubmit}
              disabled={!customInput.trim()}
            >
              <Sparkles className="w-4 h-4" />
              Generate Interview Questions
            </button>
            {dynError && <div className="mt-3 text-xs text-red-400 bg-red-950/30 border border-red-800/40 rounded p-2">{dynError}</div>}
          </div>
        </div>
      )
    }

    if (dynPhase === "p1loading") {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
          <span className="text-sm text-slate-400">Generating requirements questions…</span>
        </div>
      )
    }

    if (dynPhase === "questions" && dynMeta) {
      return (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{dynMeta.emoji ?? "✨"}</span>
            <span className="text-sm font-semibold text-slate-200">{dynMeta.scenarioName}</span>
            <span className="text-[10px] font-mono text-purple-400 bg-purple-950/30 border border-purple-800/40 px-1.5 py-0.5 rounded">{dynMeta.technicalDomain}</span>
          </div>
          <div className="text-xs text-slate-500 mb-4">AI-generated requirements interview</div>
          {dynError && <div className="mb-3 text-xs text-red-400 bg-red-950/30 border border-red-800/40 rounded p-2">{dynError}</div>}
          <RequirementsChat questions={dynMeta.questions} onComplete={handleDynAnswersComplete} />
        </div>
      )
    }

    if (dynPhase === "p2loading") {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
          <span className="text-sm text-slate-400">Synthesizing architecture + diagram…</span>
          <span className="text-xs text-slate-600 max-w-xs text-center">Claude is designing your system, this takes ~10-15 seconds</span>
        </div>
      )
    }

    if (dynPhase === "done" && dynResult) {
      return (
        <>
          <DynArchPanel
            mermaidCode={dynResult.mermaidCode}
            systemConfig={dynResult.systemConfig}
          />
          <div className="shrink-0 border-t border-slate-800 bg-slate-950 px-4 py-2">
            <button
              onClick={resetDyn}
              className="text-xs text-slate-500 hover:text-slate-300 font-mono transition-colors"
            >
              ← Design another scenario
            </button>
          </div>
        </>
      )
    }

    return null
  }

  // ── Static mode center rendering ─────────────────────────────────────────────
  function renderStaticCenter() {
    if (stage === 0) {
      return <div className="flex-1 overflow-y-auto p-4"><RequirementsChat questions={scenario.questions} onComplete={handleRequirementsComplete} /></div>
    }
    if (stage === 1) {
      return (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4"><span className="text-xs font-mono uppercase tracking-widest text-slate-500">Scale Estimation</span></div>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(scenario.scaleEstimates).map(([k,v]) => {
              const [val, ...rest] = String(v).split("\n")
              return (
                <div key={k} className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                  <div className="text-[10px] font-mono uppercase tracking-wide text-slate-500 mb-1">{k}</div>
                  <div className="text-sm font-mono text-emerald-400 font-semibold">{val}</div>
                  {rest.length > 0 && <div className="text-[9px] font-mono text-slate-500 mt-1 leading-relaxed">{rest.join(" ")}</div>}
                </div>
              )
            })}
          </div>
        </div>
      )
    }
    if (stage === 2) {
      const scaleKeys = ["low","medium","massive"]
      const scaleLabels = { low:"Low Scale", medium:"Medium Scale", massive:"Massive Scale" }
      const showCorrelations = activeScale === "tradeoffs"
      const scaleData = showCorrelations ? null : scenario.scales[activeScale]
      return (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex border-b border-slate-800 px-4 pt-3 gap-1">
            {scaleKeys.map(k => (
              <button key={k} onClick={() => setActiveScale(k)}
                className={"px-4 py-2 text-xs font-mono rounded-t border-b-2 " + (activeScale===k ? "border-emerald-500 text-emerald-400 bg-emerald-950/20" : "border-transparent text-slate-500 hover:text-slate-300")}>
                {scaleLabels[k]}
              </button>
            ))}
            {scenario.isAI && (
              <button onClick={() => setActiveScale("tradeoffs")}
                className={"px-4 py-2 text-xs font-mono rounded-t border-b-2 " + (showCorrelations ? "border-blue-500 text-blue-400 bg-blue-950/20" : "border-transparent text-slate-500 hover:text-slate-300")}>
                Trade-off Map
              </button>
            )}
          </div>
          {showCorrelations ? (
            <TradeoffCorrelations />
          ) : (
            <>
              <div className="px-4 py-2 text-xs font-mono text-slate-500 border-b border-slate-800">{scaleData.title}</div>
              <div className="flex-1 overflow-auto p-4">
                <ArchDiagram scaleData={scaleData} nodeConfig={NODE_CONFIG} />
              </div>
            </>
          )}
        </div>
      )
    }
    if (stage === 3) {
      return (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4"><span className="text-xs font-mono uppercase tracking-widest text-slate-500">Architectural Trade-off Matrix</span></div>
          {scenario.tradeoffs.map((t,i) => (
            <div key={i} className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-3">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wide text-slate-500 mb-0.5">{t.dimension}</div>
                  <div className="text-sm font-semibold text-slate-200">{t.choice}</div>
                </div>
                <span className="shrink-0 bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-mono px-2 py-1 rounded whitespace-nowrap">{t.winner}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{t.tradeoff}</p>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  const stageLabels = ["Requirements","Scale Analysis","Architecture","Trade-offs"]

  // Header info
  const headerEmoji  = isCustom ? (dynMeta?.emoji ?? "✨") : scenario.emoji
  const headerName   = isCustom ? (dynMeta?.scenarioName ?? "Custom Scenario") : scenario.name
  const headerTag    = isCustom ? (dynMeta?.technicalDomain ?? "AI-powered") : scenario.tag

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-slate-100 overflow-hidden">
      {/* Header */}
      <header className="h-12 shrink-0 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-4">
        <span className="font-mono text-sm font-semibold text-slate-100 tracking-tight">System Design Simulator</span>
        <div className="flex items-center gap-2">
          <span className="text-lg">{headerEmoji}</span>
          <span className="text-sm text-slate-300 font-medium">{headerName}</span>
          <span className="text-xs text-slate-500 font-mono">{headerTag}</span>
        </div>
      </header>
      {/* 3-column body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <aside className="w-72 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col gap-6 p-4 overflow-y-auto">
          <ScenarioSelector scenarios={scenarioList} selectedId={selectedId} onSelect={handleScenarioChange} />
          {!isCustom && (
            <FlowTracker currentStage={stage} completedStages={completedStages} onStageClick={handleStageClick} />
          )}
        </aside>
        {/* Center panel */}
        <main className="flex-1 flex flex-col overflow-hidden bg-zinc-950">
          {isCustom ? renderCustomCenter() : renderStaticCenter()}
          {/* Bottom stage nav — only for static scenarios */}
          {!isCustom && (
            <nav className="shrink-0 flex border-t border-slate-800 bg-slate-950">
              {stageLabels.map((label, i) => {
                const accessible = i <= stage || completedStages.has(i) || completedStages.has(i-1)
                return (
                  <button key={i} onClick={() => accessible && setStage(i)}
                    className={"flex-1 py-2.5 text-[11px] font-mono border-t-2 transition-colors " + (stage===i ? "border-emerald-500 text-emerald-400 bg-emerald-950/20" : accessible ? "border-transparent text-slate-500 hover:text-slate-300" : "border-transparent text-slate-700 cursor-not-allowed")}>
                    {label}
                  </button>
                )
              })}
            </nav>
          )}
        </main>
        {/* Right panel */}
        <aside className="w-80 shrink-0">
          {isCustom ? (
            <div className="h-full bg-slate-900 border-l border-slate-800 flex flex-col">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-semibold text-slate-200">AI Analysis</span>
              </div>
              {dynPhase === "done" && dynResult?.systemConfig ? (
                <div className="flex flex-col gap-3 px-4 py-4 overflow-y-auto">
                  {Object.keys(dynResult.systemConfig.scaleEstimates ?? {}).length > 0 && (
                    <>
                      <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">Scale Estimates</div>
                      {Object.entries(dynResult.systemConfig.scaleEstimates).map(([k,v]) => {
                        const [val, ...rest] = String(v).split("\n")
                        return (
                          <div key={k} className="bg-slate-800 rounded border border-slate-700 p-3">
                            <div className="text-[10px] font-mono text-slate-500 capitalize mb-0.5">{k}</div>
                            <div className="text-sm font-mono text-blue-300 font-semibold">{val}</div>
                            {rest.length > 0 && <div className="text-[9px] font-mono text-slate-500 mt-0.5 leading-relaxed">{rest.join(" ")}</div>}
                          </div>
                        )
                      })}
                    </>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center p-6">
                  <p className="text-xs text-slate-600 text-center leading-relaxed">
                    Scale estimates and tech stack will appear here after the AI generates your architecture.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <RightPanel isAI={scenario.isAI} estimates={scenario.scaleEstimates} />
          )}
        </aside>
      </div>
    </div>
  )
}

export default SystemDesignSimulator
export { RequirementsChat, ScaleMetricsPanel, KVCacheCalc, TopologyCalc }
