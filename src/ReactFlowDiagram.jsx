import { useState, useEffect } from 'react'
import {
  ReactFlow, Background, Controls, MiniMap,
  useNodesState, useEdgesState,
  Handle, Position, Panel,
  BaseEdge, getStraightPath, EdgeLabelRenderer,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

// ── Custom node: expandable asset ───────────────────────────────────────────
function InteractiveAssetNode({ data, selected }) {
  const [open, setOpen] = useState(false)

  return (
    <div
      onClick={() => setOpen(o => !o)}
      style={{
        width: open ? 280 : 180,
        transition: 'width 0.25s ease, box-shadow 0.2s ease',
        cursor: 'pointer',
      }}
      className={
        'rounded-lg border text-left select-none ' +
        (selected
          ? 'border-emerald-400 shadow-lg shadow-emerald-900/40'
          : 'border-slate-600 hover:border-slate-400')
      }
    >
      <Handle type="target" position={Position.Top}
        style={{ background: '#475569', width: 8, height: 8, border: 'none' }} />

      {/* Header */}
      <div className="px-3 py-2 bg-slate-800 rounded-t-lg">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-100 leading-tight">{data.label}</span>
          <span className="text-[9px] text-slate-500 shrink-0">{open ? '▲' : '▼'}</span>
        </div>
        {data.techOptions?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {data.techOptions.slice(0, open ? 99 : 2).map(t => (
              <span key={t} className="text-[8px] font-mono bg-slate-700 text-emerald-300 px-1.5 py-0.5 rounded">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Expanded content */}
      {open && (
        <div className="bg-slate-900 rounded-b-lg px-3 py-2 space-y-2">
          {/* Scale metrics */}
          {data.scaleMetrics && (
            <div>
              <div className="text-[8px] font-mono uppercase text-slate-500 mb-1">Scale</div>
              <div className="grid grid-cols-1 gap-0.5">
                {Object.entries(data.scaleMetrics).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-[8px] text-slate-500 capitalize">{k}</span>
                    <span className="text-[8px] font-mono text-blue-300">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trade-offs */}
          {(data.tradeOffs?.pros?.length || data.tradeOffs?.cons?.length) && (
            <div>
              <div className="text-[8px] font-mono uppercase text-slate-500 mb-1">Trade-offs</div>
              {data.tradeOffs.pros?.map((p, i) => (
                <div key={i} className="text-[8px] text-emerald-400 flex gap-1">
                  <span>+</span><span>{p}</span>
                </div>
              ))}
              {data.tradeOffs.cons?.map((c, i) => (
                <div key={i} className="text-[8px] text-red-400 flex gap-1">
                  <span>−</span><span>{c}</span>
                </div>
              ))}
            </div>
          )}

          {/* Deep dive */}
          {data.deepDiveExplanation && (
            <div>
              <div className="text-[8px] font-mono uppercase text-slate-500 mb-1">Deep Dive</div>
              <p className="text-[8px] text-slate-400 leading-relaxed">{data.deepDiveExplanation}</p>
            </div>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Bottom}
        style={{ background: '#475569', width: 8, height: 8, border: 'none' }} />
    </div>
  )
}

// ── Custom node: group boundary ──────────────────────────────────────────────
function GroupNode({ data }) {
  return (
    <div
      style={{ width: '100%', height: '100%' }}
      className="rounded-xl border border-dashed border-slate-600 bg-slate-900/30"
    >
      <div className="px-3 py-1.5 border-b border-dashed border-slate-700">
        <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500">
          {data.label}
        </span>
      </div>
    </div>
  )
}

// ── Custom edge with animated label ─────────────────────────────────────────
function LabeledEdge({ id, sourceX, sourceY, targetX, targetY, label, style, markerEnd, animated }) {
  const [edgePath, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY })
  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)` }}
            className="absolute pointer-events-none"
          >
            <span className="text-[8px] font-mono bg-slate-900 border border-slate-700 text-slate-400 px-1.5 py-0.5 rounded whitespace-nowrap">
              {label}
            </span>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

const NODE_TYPES = { interactiveAsset: InteractiveAssetNode, group: GroupNode }
const EDGE_TYPES = { labeled: LabeledEdge }

function toRawNodes(nodes) {
  return (nodes ?? []).map(n => ({ ...n, zIndex: n.type === 'group' ? 0 : 1 }))
}
function toRawEdges(edges) {
  return (edges ?? []).map(e => ({
    ...e,
    type: 'labeled',
    markerEnd: { type: 'arrowclosed', color: e.style?.stroke ?? '#475569', width: 12, height: 12 },
  }))
}

// ── Main component ───────────────────────────────────────────────────────────
export default function ReactFlowDiagram({ graphData, className = '' }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(toRawNodes(graphData?.nodes))
  const [edges, setEdges, onEdgesChange] = useEdgesState(toRawEdges(graphData?.edges))

  useEffect(() => {
    setNodes(toRawNodes(graphData?.nodes))
    setEdges(toRawEdges(graphData?.edges))
  }, [graphData])

  if (!graphData) {
    return (
      <div className={`flex items-center justify-center min-h-64 rounded-lg border border-slate-700 bg-slate-900/50 ${className}`}>
        <span className="text-sm text-slate-500">No graph data</span>
      </div>
    )
  }

  return (
    <div className={`rounded-lg overflow-hidden border border-slate-700 ${className}`}
         style={{ height: 560 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.3}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: graphData.viewportDefaults?.initialZoom ?? 0.85 }}
        style={{ background: '#09090b' }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#1e293b" gap={24} size={1} />
        <Controls
          style={{ background: '#1e293b', border: '1px solid #334155' }}
          showInteractive={false}
        />
        <MiniMap
          style={{ background: '#0f172a', border: '1px solid #334155' }}
          nodeColor={n => n.type === 'group' ? '#1e293b' : '#10b981'}
          maskColor="rgba(0,0,0,0.6)"
        />
        <Panel position="top-left">
          <span className="text-[9px] font-mono text-slate-600 bg-slate-900/80 px-2 py-1 rounded border border-slate-800">
            Click any node to expand
          </span>
        </Panel>
      </ReactFlow>
    </div>
  )
}
