import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { act } from 'react'
import ReactFlowDiagram from './ReactFlowDiagram'

// Mock @xyflow/react — renders node/edge components via passed nodeTypes/edgeTypes props
// so we can test InteractiveAssetNode expand behavior without real React Flow canvas
vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ children, nodes, edges, nodeTypes, edgeTypes }) => (
    <div data-testid="react-flow" data-node-count={nodes?.length ?? 0}>
      {nodes?.map(n => {
        const Comp = nodeTypes?.[n.type] ?? nodeTypes?.['interactiveAsset']
        return Comp ? <Comp key={n.id} data={n.data} selected={false} id={n.id} /> : null
      })}
      {edges?.map(e => {
        const EdgeComp = edgeTypes?.['labeled']
        return EdgeComp
          ? <EdgeComp key={e.id} id={e.id} label={e.label} style={e.style}
              sourceX={0} sourceY={0} targetX={100} targetY={100} />
          : null
      })}
      {children}
    </div>
  ),
  Background: () => null,
  Controls: () => null,
  MiniMap: () => null,
  Panel: ({ children }) => <div>{children}</div>,
  Handle: () => null,
  Position: { Top: 'top', Bottom: 'bottom' },
  BaseEdge: () => null,
  getStraightPath: () => ['M0,0 L100,100', 50, 50],
  EdgeLabelRenderer: ({ children }) => <div>{children}</div>,
  useNodesState: (init) => [init ?? [], vi.fn(), vi.fn()],
  useEdgesState: (init) => [init ?? [], vi.fn(), vi.fn()],
}))

const makeNode = (id, type = 'interactiveAsset', overrideData = {}) => ({
  id,
  type,
  position: { x: 0, y: 0 },
  style: { width: 180, height: 60 },
  data: {
    label: `Node ${id}`,
    techOptions: ['Redis', 'Memcached'],
    scaleMetrics: { throughput: '10k req/s', latency: '<20ms' },
    tradeOffs: { pros: ['fast writes'], cons: ['memory cost'] },
    deepDiveExplanation: 'Deep explanation for this node.',
    ...overrideData,
  },
})

const makeEdge = (id, source, target, label = 'HTTP') => ({
  id, source, target, label,
  animated: false,
  style: { stroke: '#059669' },
  type: 'labeled',
})

// ── Null / no-data cases ──────────────────────────────────────────────────────

describe('ReactFlowDiagram — no data', () => {
  it('renders "No graph data" when graphData is null', () => {
    render(<ReactFlowDiagram graphData={null} />)
    expect(screen.getByText('No graph data')).toBeInTheDocument()
  })

  it('renders "No graph data" when graphData is undefined', () => {
    render(<ReactFlowDiagram graphData={undefined} />)
    expect(screen.getByText('No graph data')).toBeInTheDocument()
  })
})

// ── Valid graph ───────────────────────────────────────────────────────────────

describe('ReactFlowDiagram — valid graph', () => {
  it('renders ReactFlow container for valid graphData', () => {
    const graphData = {
      nodes: [makeNode('a'), makeNode('b')],
      edges: [makeEdge('e1', 'a', 'b')],
    }
    render(<ReactFlowDiagram graphData={graphData} />)
    expect(screen.getByTestId('react-flow')).toBeInTheDocument()
  })

  it('does not render "No graph data" for valid graphData', () => {
    const graphData = { nodes: [], edges: [] }
    render(<ReactFlowDiagram graphData={graphData} />)
    expect(screen.queryByText('No graph data')).not.toBeInTheDocument()
  })

  it('renders with empty nodes and edges without crash', () => {
    const graphData = { nodes: [], edges: [] }
    render(<ReactFlowDiagram graphData={graphData} />)
    expect(screen.getByTestId('react-flow')).toBeInTheDocument()
  })

  it('renders "Click any node to expand" hint panel', () => {
    const graphData = { nodes: [makeNode('a')], edges: [] }
    render(<ReactFlowDiagram graphData={graphData} />)
    expect(screen.getByText('Click any node to expand')).toBeInTheDocument()
  })

  it('renders with viewportDefaults present', () => {
    const graphData = {
      viewportDefaults: { initialZoom: 0.7, focusNodeId: 'a' },
      nodes: [makeNode('a')],
      edges: [],
    }
    render(<ReactFlowDiagram graphData={graphData} />)
    expect(screen.getByTestId('react-flow')).toBeInTheDocument()
  })

  it('renders group-type nodes without crash', () => {
    const graphData = {
      nodes: [
        {
          id: 'g1', type: 'group',
          position: { x: 0, y: 0 },
          style: { width: 400, height: 200 },
          data: { label: 'Backend Tier' },
        },
        makeNode('s1'),
      ],
      edges: [],
    }
    render(<ReactFlowDiagram graphData={graphData} />)
    expect(screen.getByTestId('react-flow')).toBeInTheDocument()
  })

  it('accepts optional className prop', () => {
    const graphData = { nodes: [makeNode('a')], edges: [] }
    const { container } = render(<ReactFlowDiagram graphData={graphData} className="h-96" />)
    expect(container.firstChild).toHaveClass('h-96')
  })
})

// ── InteractiveAssetNode expand behavior ──────────────────────────────────────

describe('ReactFlowDiagram — InteractiveAssetNode', () => {
  it('renders node labels in header', () => {
    const graphData = {
      nodes: [makeNode('client')],
      edges: [],
    }
    render(<ReactFlowDiagram graphData={graphData} />)
    expect(screen.getByText('Node client')).toBeInTheDocument()
  })

  it('shows techOptions chips in collapsed header', () => {
    const graphData = { nodes: [makeNode('db')], edges: [] }
    render(<ReactFlowDiagram graphData={graphData} />)
    expect(screen.getByText('Redis')).toBeInTheDocument()
    expect(screen.getByText('Memcached')).toBeInTheDocument()
  })

  it('does NOT show deepDiveExplanation before click', () => {
    const graphData = { nodes: [makeNode('api')], edges: [] }
    render(<ReactFlowDiagram graphData={graphData} />)
    expect(screen.queryByText('Deep explanation for this node.')).not.toBeInTheDocument()
  })

  it('expands to show deepDiveExplanation on click', async () => {
    const graphData = { nodes: [makeNode('api')], edges: [] }
    render(<ReactFlowDiagram graphData={graphData} />)
    const nodeEl = screen.getByText('Node api').closest('[style]')
    await act(async () => { fireEvent.click(nodeEl) })
    expect(screen.getByText('Deep explanation for this node.')).toBeInTheDocument()
  })

  it('expands to show scale metrics', async () => {
    const graphData = { nodes: [makeNode('cache')], edges: [] }
    render(<ReactFlowDiagram graphData={graphData} />)
    const nodeEl = screen.getByText('Node cache').closest('[style]')
    await act(async () => { fireEvent.click(nodeEl) })
    expect(screen.getByText('10k req/s')).toBeInTheDocument()
    expect(screen.getByText('<20ms')).toBeInTheDocument()
  })

  it('expands to show tradeoffs (pros/cons)', async () => {
    const graphData = { nodes: [makeNode('queue')], edges: [] }
    render(<ReactFlowDiagram graphData={graphData} />)
    const nodeEl = screen.getByText('Node queue').closest('[style]')
    await act(async () => { fireEvent.click(nodeEl) })
    expect(screen.getByText('fast writes')).toBeInTheDocument()
    expect(screen.getByText('memory cost')).toBeInTheDocument()
  })

  it('collapses on second click (toggle)', async () => {
    const graphData = { nodes: [makeNode('api')], edges: [] }
    render(<ReactFlowDiagram graphData={graphData} />)
    const nodeEl = screen.getByText('Node api').closest('[style]')
    await act(async () => { fireEvent.click(nodeEl) })
    expect(screen.getByText('Deep explanation for this node.')).toBeInTheDocument()
    await act(async () => { fireEvent.click(nodeEl) })
    expect(screen.queryByText('Deep explanation for this node.')).not.toBeInTheDocument()
  })

  it('renders node without optional fields (graceful degradation)', () => {
    const graphData = {
      nodes: [{
        id: 'bare',
        type: 'interactiveAsset',
        position: { x: 0, y: 0 },
        style: { width: 180, height: 60 },
        data: { label: 'Bare Node' },
      }],
      edges: [],
    }
    render(<ReactFlowDiagram graphData={graphData} />)
    expect(screen.getByText('Bare Node')).toBeInTheDocument()
  })
})

// ── LabeledEdge ───────────────────────────────────────────────────────────────

describe('ReactFlowDiagram — LabeledEdge', () => {
  it('renders edge label when provided', () => {
    const graphData = {
      nodes: [makeNode('a'), makeNode('b')],
      edges: [makeEdge('e1', 'a', 'b', 'gRPC')],
    }
    render(<ReactFlowDiagram graphData={graphData} />)
    expect(screen.getByText('gRPC')).toBeInTheDocument()
  })

  it('renders multiple edge labels', () => {
    const graphData = {
      nodes: [makeNode('a'), makeNode('b'), makeNode('c')],
      edges: [
        makeEdge('e1', 'a', 'b', 'HTTP/2'),
        makeEdge('e2', 'b', 'c', 'Kafka'),
      ],
    }
    render(<ReactFlowDiagram graphData={graphData} />)
    expect(screen.getByText('HTTP/2')).toBeInTheDocument()
    expect(screen.getByText('Kafka')).toBeInTheDocument()
  })
})
