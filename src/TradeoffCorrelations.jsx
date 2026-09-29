import MermaidDiagram from './MermaidDiagram.jsx'

const ARCH_TRADEOFF = `%%{init: {"flowchart": {"nodeSpacing": 65, "rankSpacing": 60, "curve": "linear"}}}%%
graph TB
    classDef client  fill:#0c2340,stroke:#0284c7,stroke-width:2px,color:#bae6fd
    classDef router  fill:#0f2d1a,stroke:#059669,stroke-width:2px,color:#6ee7b7
    classDef fast    fill:#1a1a0a,stroke:#d97706,stroke-width:2px,color:#fde68a
    classDef slow    fill:#1a0a0a,stroke:#dc2626,stroke-width:2px,color:#fca5a5
    classDef cache   fill:#0d1a2e,stroke:#7c3aed,stroke-width:2px,color:#c4b5fd
    classDef db      fill:#0a1a0a,stroke:#16a34a,stroke-width:1px,color:#86efac
    classDef ctrl    fill:#1a1a1a,stroke:#6b7280,stroke-width:1px,color:#d1d5db
    classDef tier    fill:#0a0a12,stroke:#334155,stroke-width:2px,color:#94a3b8

    subgraph T1["Tier 1 - Client and Routing"]
      direction LR
      mob1(["Mobile Client"])
      api1(["API Client"])
      web1(["Web Client"])
      rtr1["Latency-Aware Router<br/>---<br/>DN Chunk Window<br/>-> DN Inter-token Latency<br/>-> UP gRPC Overhead"]
      mob1 ==> rtr1
      api1 ==> rtr1
      web1 ==> rtr1
    end

    subgraph T2["Tier 2 - Disaggregated Serving"]
      direction LR
      subgraph FP["Fast-Path  Context less than 4K"]
        direction TB
        fp1["vLLM Fast-Path Engine<br/>---<br/>UP Batch Size<br/>-> UP Throughput<br/>-> DN TTFT Latency<br/>-> UP GPU SRAM Frag"]
      end
      subgraph SP["Slow-Path  Context greater than 4K"]
        direction TB
        sp1["vLLM Slow-Path Engine<br/>---<br/>UP Context Window<br/>-> UP KV-Cache O N-squared<br/>-> DN Concurrency Pool"]
      end
    end

    subgraph T3["Tier 3 - State and Cache"]
      direction LR
      kv1[["Redis Prefix KV Cache<br/>---<br/>UP TTL Window<br/>-> UP Hit Rate<br/>-> DN Cold Latency<br/>-> DN Cluster Memory"]]
      pg1[("PostgreSQL Metadata DB")]
    end

    subgraph T4["Tier 4 - Control and Telemetry"]
      direction LR
      sched1["Preemptive Scheduler"]
      prom1["Prometheus Metrics"]
      jaeger1[("Jaeger Trace Store")]
    end

    rtr1 ==>|"Short Context"| FP
    rtr1 ==>|"Long Context"| SP
    FP ==> kv1
    SP ==> kv1
    FP -.-> pg1
    fp1 -.->|"UP Batch = UP Cache Contention"| kv1
    sched1 -.-> FP
    sched1 -.-> SP
    prom1 -.-> FP
    prom1 -.-> SP
    FP -.-> jaeger1
    SP -.-> jaeger1

    class mob1,api1,web1 client
    class rtr1 router
    class fp1 fast
    class sp1 slow
    class kv1 cache
    class pg1,jaeger1 db
    class sched1,prom1 ctrl
    class T1,T2,T3,T4 tier`

const PARAM_CORRELATION = `%%{init: {"flowchart": {"nodeSpacing": 70, "rankSpacing": 60, "curve": "linear"}}}%%
graph LR
    classDef batchKnob   fill:#0c2340,stroke:#0284c7,stroke-width:2px,color:#bae6fd
    classDef cacheKnob   fill:#0d1a2e,stroke:#7c3aed,stroke-width:2px,color:#c4b5fd
    classDef ctxKnob     fill:#1a0a0a,stroke:#dc2626,stroke-width:2px,color:#fca5a5
    classDef upMetric    fill:#0f2d1a,stroke:#059669,stroke-width:2px,color:#6ee7b7
    classDef downMetric  fill:#2d1a0a,stroke:#d97706,stroke-width:2px,color:#fde68a
    classDef memMetric   fill:#1a0a1a,stroke:#9333ea,stroke-width:2px,color:#e9d5ff

    subgraph Knobs["Input Knobs  increase = UP"]
      direction TB
      bs["UP Max Batch Size"]
      ws["UP Cache Window Time"]
      cl["UP Context Length"]
    end

    subgraph Impacts["System Metrics Impacted"]
      direction TB
      tp["UP Throughput and TPS"]
      lat["DN Latency P99 TTFT"]
      frag["UP GPU SRAM Fragmentation"]
      kvmem["UP Quadratic KV Memory"]
    end

    bs ==>|"Hardware Saturation"| tp
    bs -.->|"Delays Initial Loop"| lat
    ws ==>|"Packs More Tokens"| tp
    ws -.->|"Inactive Slots Linger"| frag
    cl ==>|"O N-squared Compute"| kvmem
    cl -.->|"Shrinks Active Slot Pool"| tp

    class bs batchKnob
    class ws cacheKnob
    class cl ctxKnob
    class tp,kvmem upMetric
    class lat downMetric
    class frag memMetric`

export default function TradeoffCorrelations() {
  return (
    <div className="flex flex-col gap-8 p-4 overflow-y-auto">
      <div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-500 mb-1">
          Architecture · Component Trade-off Correlations
        </div>
        <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">
          Each box annotates what goes UP and DN when that component's key parameter is tuned.
          Thick arrows = gRPC data path. Dashed = async control and telemetry.
        </p>
        <MermaidDiagram code={ARCH_TRADEOFF} className="bg-slate-900/60 border border-slate-700/60 p-3 rounded-lg" />
      </div>

      <div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-blue-400 mb-1">
          Dual-Cluster · Parameter to Metric Correlation Map
        </div>
        <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">
          Mirrors the right-panel sliders. Trace any knob left-to-right to see which downstream metrics respond.
        </p>
        <MermaidDiagram code={PARAM_CORRELATION} className="bg-slate-900/60 border border-slate-700/60 p-3 rounded-lg" />
      </div>
    </div>
  )
}
