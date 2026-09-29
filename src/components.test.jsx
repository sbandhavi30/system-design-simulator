import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { act } from 'react'

// Mock sub-components imported by SystemDesignSimulator.jsx so they don't
// pull in heavy deps (mermaid, @xyflow/react) during these logic-focused tests
vi.mock('./MermaidDiagram.jsx', () => ({ default: () => null }))
vi.mock('./ReactFlowDiagram.jsx', () => ({ default: () => <div data-testid="rf-diagram" /> }))
vi.mock('./TradeoffCorrelations.jsx', () => ({ default: () => null }))

import {
  RequirementsChat,
  ScaleMetricsPanel,
  KVCacheCalc,
  TopologyCalc,
} from '../SystemDesignSimulator.jsx'

// ── Test helpers ──────────────────────────────────────────────────────────────

const QUESTIONS = [
  { id: 'q1', label: 'Scale & Traffic', text: 'What is the DAU?', hint: 'e.g. 500M DAU' },
  { id: 'q2', label: 'Consistency', text: 'What latency SLA?', hint: 'e.g. p99 < 200ms' },
  { id: 'q3', label: 'Storage', text: 'Max video size?', hint: 'e.g. 2GB max' },
]

const ESTIMATES = {
  qps: '~12K QPS\n500M users × 2 views/day ÷ 86400s',
  storage: '~58 TB/day\n1M uploads/day × 50 MB',
  cache: '~200 GB RAM\ntop 1% metadata',
  bandwidth: '~580 GB/s egress\n12K QPS × avg 4 MB/s',
}

// ── RequirementsChat ──────────────────────────────────────────────────────────

describe('RequirementsChat', () => {
  it('shows first question on mount', () => {
    render(<RequirementsChat questions={QUESTIONS} onComplete={vi.fn()} />)
    expect(screen.getByText('What is the DAU?')).toBeInTheDocument()
  })

  it('submit button is disabled when input is empty', () => {
    render(<RequirementsChat questions={QUESTIONS} onComplete={vi.fn()} />)
    expect(screen.getByRole('button', { name: /submit answer/i })).toBeDisabled()
  })

  it('submit button is enabled when input has text', async () => {
    render(<RequirementsChat questions={QUESTIONS} onComplete={vi.fn()} />)
    const textarea = screen.getByRole('textbox')
    await act(async () => {
      fireEvent.change(textarea, { target: { value: '500M DAU' } })
    })
    expect(screen.getByRole('button', { name: /submit answer/i })).not.toBeDisabled()
  })

  it('Tab key fills hint text when input is empty', async () => {
    render(<RequirementsChat questions={QUESTIONS} onComplete={vi.fn()} />)
    const textarea = screen.getByRole('textbox')
    await act(async () => {
      fireEvent.keyDown(textarea, { key: 'Tab' })
    })
    expect(textarea.value).toBe('e.g. 500M DAU')
  })

  it('Tab key does nothing when input already has text', async () => {
    render(<RequirementsChat questions={QUESTIONS} onComplete={vi.fn()} />)
    const textarea = screen.getByRole('textbox')
    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'my answer' } })
      fireEvent.keyDown(textarea, { key: 'Tab' })
    })
    expect(textarea.value).toBe('my answer')
  })

  it('Cmd+Enter submits answer', async () => {
    render(<RequirementsChat questions={QUESTIONS} onComplete={vi.fn()} />)
    const textarea = screen.getByRole('textbox')
    await act(async () => {
      fireEvent.change(textarea, { target: { value: '500M DAU' } })
      fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true })
    })
    // Should advance to question 2
    expect(screen.getByText('What latency SLA?')).toBeInTheDocument()
  })

  it('Ctrl+Enter also submits answer', async () => {
    render(<RequirementsChat questions={QUESTIONS} onComplete={vi.fn()} />)
    const textarea = screen.getByRole('textbox')
    await act(async () => {
      fireEvent.change(textarea, { target: { value: '500M DAU' } })
      fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true })
    })
    expect(screen.getByText('What latency SLA?')).toBeInTheDocument()
  })

  it('shows answered questions in chat history', async () => {
    render(<RequirementsChat questions={QUESTIONS} onComplete={vi.fn()} />)
    const textarea = screen.getByRole('textbox')
    await act(async () => {
      fireEvent.change(textarea, { target: { value: '500M DAU' } })
      fireEvent.click(screen.getByRole('button', { name: /submit answer/i }))
    })
    // Answer is displayed in chat history
    expect(screen.getByText('500M DAU')).toBeInTheDocument()
  })

  it('progress bar starts at 0%', () => {
    const { container } = render(<RequirementsChat questions={QUESTIONS} onComplete={vi.fn()} />)
    const progressBar = container.querySelector('.bg-emerald-500')
    expect(progressBar).toHaveStyle('width: 0%')
  })

  it('progress bar updates after first answer (width > 0)', async () => {
    const { container } = render(<RequirementsChat questions={QUESTIONS} onComplete={vi.fn()} />)
    const textarea = screen.getByRole('textbox')
    await act(async () => {
      fireEvent.change(textarea, { target: { value: '500M DAU' } })
      fireEvent.click(screen.getByRole('button', { name: /submit answer/i }))
    })
    const progressBar = container.querySelector('.bg-emerald-500')
    expect(parseFloat(progressBar.style.width)).toBeCloseTo(33.33, 1)
  })

  it('shows "Unlock Architecture" button when all questions answered', async () => {
    render(<RequirementsChat questions={QUESTIONS} onComplete={vi.fn()} />)
    for (const answer of ['500M DAU', 'p99 < 200ms', '2GB max']) {
      const textarea = screen.getByRole('textbox')
      await act(async () => {
        fireEvent.change(textarea, { target: { value: answer } })
        fireEvent.click(screen.getByRole('button', { name: /submit answer/i }))
      })
    }
    expect(screen.getByRole('button', { name: /unlock architecture/i })).toBeInTheDocument()
  })

  it('calls onComplete with answers when Unlock Architecture clicked', async () => {
    const onComplete = vi.fn()
    render(<RequirementsChat questions={QUESTIONS} onComplete={onComplete} />)
    for (const answer of ['500M DAU', 'p99 < 200ms', '2GB max']) {
      const textarea = screen.getByRole('textbox')
      await act(async () => {
        fireEvent.change(textarea, { target: { value: answer } })
        fireEvent.click(screen.getByRole('button', { name: /submit answer/i }))
      })
    }
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /unlock architecture/i }))
    })
    expect(onComplete).toHaveBeenCalledOnce()
    expect(onComplete).toHaveBeenCalledWith({ q1: '500M DAU', q2: 'p99 < 200ms', q3: '2GB max' })
  })

  it('does not submit when input is empty on button click', async () => {
    render(<RequirementsChat questions={[QUESTIONS[0]]} onComplete={vi.fn()} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /submit answer/i }))
    })
    // Still on question 1
    expect(screen.getByText('What is the DAU?')).toBeInTheDocument()
  })

  it('handles empty questions array gracefully', () => {
    render(<RequirementsChat questions={[]} onComplete={vi.fn()} />)
    // No questions means allAnswered is true immediately (0/0)
    expect(screen.getByRole('button', { name: /unlock architecture/i })).toBeInTheDocument()
  })
})

// ── ScaleMetricsPanel ─────────────────────────────────────────────────────────

describe('ScaleMetricsPanel', () => {
  it('renders all 4 metric cards', () => {
    render(<ScaleMetricsPanel estimates={ESTIMATES} />)
    expect(screen.getByText('Peak QPS')).toBeInTheDocument()
    expect(screen.getByText('Storage / Day')).toBeInTheDocument()
    expect(screen.getByText('Cache RAM')).toBeInTheDocument()
    expect(screen.getByText('Bandwidth')).toBeInTheDocument()
  })

  it('shows first line of multi-line value as primary metric', () => {
    render(<ScaleMetricsPanel estimates={ESTIMATES} />)
    expect(screen.getByText('~12K QPS')).toBeInTheDocument()
    expect(screen.getByText('~58 TB/day')).toBeInTheDocument()
    expect(screen.getByText('~200 GB RAM')).toBeInTheDocument()
    expect(screen.getByText('~580 GB/s egress')).toBeInTheDocument()
  })

  it('shows derivation text as secondary line', () => {
    render(<ScaleMetricsPanel estimates={ESTIMATES} />)
    expect(screen.getByText(/500M users × 2 views/)).toBeInTheDocument()
  })

  it('renders single-line values without derivation', () => {
    render(<ScaleMetricsPanel estimates={{ qps: '5M req/s', storage: '10TB', cache: '500GB', bandwidth: '1GB/s' }} />)
    expect(screen.getByText('5M req/s')).toBeInTheDocument()
  })
})

// ── KVCacheCalc ───────────────────────────────────────────────────────────────

describe('KVCacheCalc', () => {
  it('renders with default parameters (16.00 GB)', async () => {
    // Default: L=32, H=32, D=128, B=8, S=4096, P=2, prefixReuse=0, spec=false
    // = 2*32*32*128*4096*8*2 / 1073741824 = 16.00 GB
    const onMemoryChange = vi.fn()
    await act(async () => { render(<KVCacheCalc onMemoryChange={onMemoryChange} />) })
    expect(screen.getByText('16.00 GB')).toBeInTheDocument()
  })

  it('calls onMemoryChange with computed bytes on mount', async () => {
    const onMemoryChange = vi.fn()
    await act(async () => { render(<KVCacheCalc onMemoryChange={onMemoryChange} />) })
    // Default effectiveBytes = 2*32*32*128*4096*8*2 = 17179869184
    expect(onMemoryChange).toHaveBeenCalledWith(17179869184)
  })

  it('prefix reuse 50% halves the displayed GB', async () => {
    const onMemoryChange = vi.fn()
    await act(async () => { render(<KVCacheCalc onMemoryChange={onMemoryChange} />) })
    // Prefix reuse slider is the 7th range input (index 6)
    const sliders = screen.getAllByRole('slider')
    await act(async () => {
      fireEvent.change(sliders[6], { target: { value: '50' } })
    })
    // After 50% prefix reuse: 16 * 0.5 = 8.00 GB
    expect(screen.getByText('8.00 GB')).toBeInTheDocument()
  })

  it('speculative decoding toggle adds 15% overhead', async () => {
    const onMemoryChange = vi.fn()
    await act(async () => { render(<KVCacheCalc onMemoryChange={onMemoryChange} />) })
    const toggle = screen.getByRole('button')
    await act(async () => { fireEvent.click(toggle) })
    // 16 * 1.15 = 18.40 GB
    expect(screen.getByText('18.40 GB')).toBeInTheDocument()
    expect(screen.getByText('+15% overhead')).toBeInTheDocument()
  })

  it('shows raw KV bytes formula in derivation line', async () => {
    const onMemoryChange = vi.fn()
    await act(async () => { render(<KVCacheCalc onMemoryChange={onMemoryChange} />) })
    // Formula text: "raw: 2×32×32×128×4096×8×2 / 1G = 16.00 GB"
    expect(screen.getByText(/raw: 2×32×32×128×4096×8×2/)).toBeInTheDocument()
  })

  it('shows RadixTree prefix reuse annotation when reuse > 0', async () => {
    const onMemoryChange = vi.fn()
    await act(async () => { render(<KVCacheCalc onMemoryChange={onMemoryChange} />) })
    const sliders = screen.getAllByRole('slider')
    await act(async () => {
      fireEvent.change(sliders[6], { target: { value: '25' } })
    })
    expect(screen.getByText(/after 25% prefix reuse/)).toBeInTheDocument()
  })
})

// ── TopologyCalc ──────────────────────────────────────────────────────────────

describe('TopologyCalc', () => {
  it('shows valid banner with default params (70B BF16, 80GB VRAM, TP=4 PP=2)', async () => {
    // Total: 70B*2B = 130.39GB, requiredGPUs=3, allocatedGPUs=8 → valid
    await act(async () => { render(<TopologyCalc kvMemoryBytes={0} />) })
    expect(screen.getByText(/Valid:/)).toBeInTheDocument()
    expect(screen.getByText(/optimal fabric/)).toBeInTheDocument()
  })

  it('shows OOM banner when per-GPU allocation exceeds VRAM', async () => {
    // 70B BF16 = 130.39GB, TP=1 PP=1 = 1 GPU, perGPUGB=130.39 > 80GB → OOM
    await act(async () => { render(<TopologyCalc kvMemoryBytes={0} />) })
    const sliders = screen.getAllByRole('slider')
    // TP slider index 0, PP slider index 1 (they appear after the 4 select dropdowns)
    await act(async () => {
      fireEvent.change(sliders[0], { target: { value: '1' } }) // TP = 1
      fireEvent.change(sliders[1], { target: { value: '1' } }) // PP = 1
    })
    // perGPUGB = 130.39 / 1 = 130.39 > 80 → OOM
    expect(screen.getByText(/OOM:/)).toBeInTheDocument()
  })

  it('shows insufficient GPU warning when allocatedGPUs < requiredGPUs and no OOM', async () => {
    // 70B BF16, vramGB=80, TP=1 PP=2 → alloc=2 < required=3, perGPU=65.2 ≤ 80 → warning
    await act(async () => { render(<TopologyCalc kvMemoryBytes={0} />) })
    const sliders = screen.getAllByRole('slider')
    await act(async () => {
      fireEvent.change(sliders[0], { target: { value: '1' } }) // TP = 1
      // PP stays at 2 (default)
    })
    expect(screen.getByText(/Warning:/)).toBeInTheDocument()
    expect(screen.getByText(/Insufficient compute width/)).toBeInTheDocument()
  })

  it('shows PCIe warning when PP > 1 and interconnect is pcie', async () => {
    await act(async () => { render(<TopologyCalc kvMemoryBytes={0} />) })
    const selects = screen.getAllByRole('combobox')
    // Interconnect is select index 3
    await act(async () => {
      fireEvent.change(selects[3], { target: { value: 'pcie' } })
    })
    // PP=2 (default) > 1 and now pcie → PCIe warning
    expect(screen.getByText(/PCIe Warning:/)).toBeInTheDocument()
    expect(screen.getByText(/high bubble latency/)).toBeInTheDocument()
  })

  it('shows required GPU count in metrics', async () => {
    await act(async () => { render(<TopologyCalc kvMemoryBytes={0} />) })
    // requiredGPUs = 3 with defaults
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('KV cache memory propagates from prop', async () => {
    // 8GB KV cache added to 70B model → more total memory
    const kvBytes = 8 * 1073741824 // 8 GB
    await act(async () => { render(<TopologyCalc kvMemoryBytes={kvBytes} />) })
    // KV Cache card should show 8.00 GB
    expect(screen.getByText('8.00 GB')).toBeInTheDocument()
  })

  it('shows per-GPU allocation line', async () => {
    await act(async () => { render(<TopologyCalc kvMemoryBytes={0} />) })
    expect(screen.getByText(/Per-GPU alloc:/)).toBeInTheDocument()
  })

  it('displays mini metric cards', async () => {
    await act(async () => { render(<TopologyCalc kvMemoryBytes={0} />) })
    expect(screen.getByText('Required GPUs')).toBeInTheDocument()
    expect(screen.getByText('Total VRAM')).toBeInTheDocument()
    expect(screen.getByText('Weight Mem')).toBeInTheDocument()
    expect(screen.getByText('KV Cache')).toBeInTheDocument()
  })
})
