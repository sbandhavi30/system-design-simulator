import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'
import 'dotenv/config'
import { stripFences } from './utils.js'

const app = express()
app.use(cors())
app.use(express.json())

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = 'claude-sonnet-4-5'

function sanitizeMermaid(raw) {
  // ── Step 1: collapse multi-line node labels into single lines ───────────────
  const collapsed = []
  let buf = null
  for (const line of raw.split('\n')) {
    if (buf !== null) {
      const extraQuotes = (line.match(/"/g) ?? []).length
      buf += '<br/>' + line.trimEnd()
      if (extraQuotes % 2 === 1) {
        collapsed.push(buf)
        buf = null
      }
    } else {
      const quotes = (line.match(/"/g) ?? []).length
      if (quotes % 2 === 1) {
        buf = line.trimEnd()
      } else {
        collapsed.push(line)
      }
    }
  }
  if (buf !== null) collapsed.push(buf)

  // ── Step 2: token-level fixes ───────────────────────────────────────────────
  const fixed = collapsed.map(line => {
    return line
      .replace(/(\w+)>\["/g, '$1["')
      .replace(/(\w+)>([^\["][^\]]*)\]/g, '$1["$2"]')
      .replace(/\(UP\)/g, 'UP')
      .replace(/\(DOWN\)/g, 'DN')
      .replace(/"([^"]*)"/g, (_, inner) => `"${inner.replace(/\\n/g, '<br/>')}"`)
  })

  // ── Step 3: inject placeholder nodes into empty subgraphs ───────────────────
  const result = []
  const subgraphStack = []
  const subgraphContent = {}

  for (const line of fixed) {
    const trimmed = line.trim()

    if (/^subgraph\s/.test(trimmed)) {
      const id = trimmed.split(/[\s["]/)[1] ?? `sg${subgraphStack.length}`
      subgraphStack.push(id)
      subgraphContent[id] = false
      result.push(line)
      continue
    }

    if (trimmed === 'end') {
      const id = subgraphStack.pop()
      if (id && !subgraphContent[id]) {
        result.push(`    ${id}_node["${id}"]`)
        if (subgraphStack.length) subgraphContent[subgraphStack.at(-1)] = true
      }
      result.push(line)
      continue
    }

    const isReal = trimmed.length > 0
      && !trimmed.startsWith('%%')
      && !trimmed.startsWith('direction ')
      && !trimmed.startsWith('classDef ')
      && !trimmed.startsWith('class ')
    if (isReal && subgraphStack.length) {
      subgraphContent[subgraphStack.at(-1)] = true
    }

    result.push(line)
  }

  return result.join('\n')
}

// ── Phase 1: Requirements Gathering ─────────────────────────────────────────
app.post('/api/requirements', async (req, res) => {
  const { scenario } = req.body
  if (!scenario?.trim()) return res.status(400).json({ error: 'scenario required' })

  const prompt = `You are a Principal ML Infrastructure Architect and System Design Interviewer.

First, classify the scenario into one of these domains:
- AI_SERVING     — LLM/model inference, online serving, embedding APIs
- AI_TRAINING    — distributed training, fine-tuning, experiment pipelines
- RAG_SEARCH     — retrieval-augmented generation, vector search, semantic search
- DATA_PIPELINE  — streaming/batch ETL, feature stores, event processing
- DISTRIBUTED_SYS — general distributed systems, databases, messaging

Then generate EXACTLY 5 deep technical questions covering these 5 dimensions.
Adapt each question's specifics to the classified domain — reference real production technologies.

DIMENSION MAP (pick the most relevant branch per domain):

1. SCALE & SLA
   - AI_SERVING/RAG: peak request/s, p50/p99 TTFT and TBT latency SLOs, concurrent sessions, burst multiplier
   - TRAINING: dataset size, training time budget, checkpoint frequency, spot-instance tolerance
   - DATA_PIPELINE: event/s ingest rate, end-to-end latency SLA, replay window, exactly-once vs at-least-once
   - DISTRIBUTED_SYS: read/write ratio, consistency level, replication factor, geo-distribution

2. COMPUTE & INFERENCE ENGINE
   - AI_SERVING: vLLM (PagedAttention, continuous batching, TP), Triton Inference Server (static/dynamic batching, multi-framework, ensemble), Ray Serve (Python-native actors, fractional GPU), SageMaker Real-Time Inference (managed, BYO container), TensorRT-LLM (NVIDIA-optimized)
   - AI_TRAINING: Ray Train + FSDP/DeepSpeed ZeRO, Megatron-LM (3D parallel), SageMaker Training Jobs, Kubeflow MPI operator
   - RAG_SEARCH: embedding model (OpenAI, BGE, Cohere), reranking (cross-encoder), hybrid search
   - DATA_PIPELINE: Spark/Flink (batch vs streaming), Kafka Streams, Kinesis Data Analytics
   - DISTRIBUTED_SYS: compute tier, instance family, auto-scaling strategy

3. ROUTING & LOAD BALANCING STRATEGY
   - AI_SERVING: prefix-hash routing (route req to replica with matching KV prefix → maximize cache reuse), composite queue-depth + context-backlog routing (route to replica with lowest token-backlog), model-capability routing (router selects model by query complexity via small classifier), session-affinity routing (keep multi-turn context on same replica), disaggregated prefill/decode routing (separate prefill-heavy vs decode-heavy replicas)
   - RAG_SEARCH: query router (dense vs sparse vs hybrid), multi-index routing, fallback chains
   - DATA_PIPELINE: partitioning strategy (key-hash, range, round-robin), consumer group rebalancing
   - DISTRIBUTED_SYS: consistent hashing, service mesh (Istio/Envoy), L7 routing rules

4. SCHEDULING & AUTOSCALING
   - AI/K8S workloads: KEDA (event-driven HPA — scale on GPU util, queue depth, custom Prometheus metrics), kAI Scheduler (gang scheduling for multi-GPU jobs, fair-share queues, preemption, bin-packing), Kubernetes default scheduler (basic), custom priority queue (SLA-tiered dispatch — premium vs batch), Volcano (batch/HPC jobs), Argo Workflows (DAG pipelines)
   - TRAINING: spot-instance preemption handling, checkpoint-resume, job priority
   - DATA_PIPELINE: Airflow/Prefect/Dagster DAG scheduling, backfill strategy, SLA-based retries

5. STORAGE & CACHING ARCHITECTURE
   - AI_SERVING: KV cache placement — HBM-only (lowest latency, most expensive), HBM+DRAM tiering (PagedAttention eviction policy), disaggregated KV on SSD via LMCache/InfiniStore (cost-efficient, adds ~5ms), cross-node KV transfer (P2P NVLink for disaggregated prefill/decode); model weights — S3 + EFS mount (shared, slow cold start), NVMe local (fast, per-node), model registry (MLflow/Hugging Face Hub)
   - RAG_SEARCH: vector DB — Pinecone (managed), Weaviate (self-hosted + hybrid), pgvector (Postgres-native), Qdrant (Rust, high perf); index type — HNSW, IVF-PQ, scalar quantization
   - TRAINING: distributed checkpoint — FSSpec + S3, NFS, Lustre/GPFS; dataset — Parquet on S3, HuggingFace datasets, tfrecord
   - DATA_PIPELINE: hot/warm/cold — Redis/Dragonfly (hot), Cassandra/DynamoDB (warm), S3/Iceberg (cold); CDC strategy

RULES:
- Each question must be answerable in 1-2 sentences but unlock a major architectural branch
- Hints must reference at least 3 specific real technologies with their key trade-off
- Do NOT ask about budget, team size, or timelines
- Questions must be ordered: scale → compute → routing → scheduling → storage

Output ONLY valid JSON — no markdown, no fences, no commentary:
{
  "scenarioName": "string",
  "technicalDomain": "string",
  "domain": "AI_SERVING | AI_TRAINING | RAG_SEARCH | DATA_PIPELINE | DISTRIBUTED_SYS",
  "emoji": "string (single emoji)",
  "questions": [
    {
      "id": "q1",
      "category": "scale",
      "label": "Scale & SLA",
      "text": "precise technical question",
      "hint": "e.g. 50k req/s peak, p99 TTFT <200ms, 10× burst, 3 regions"
    },
    {
      "id": "q2",
      "category": "compute",
      "label": "Compute & Inference Engine",
      "text": "precise technical question",
      "hint": "e.g. vLLM (PagedAttention, continuous batching) vs Triton (static batching, multi-framework ensemble) vs Ray Serve (actor model, fractional GPU)"
    },
    {
      "id": "q3",
      "category": "routing",
      "label": "Routing Strategy",
      "text": "precise technical question",
      "hint": "e.g. prefix-hash (maximize KV reuse) vs composite queue-depth+context-backlog (load balance) vs model-capability router (classifier-based dispatch)"
    },
    {
      "id": "q4",
      "category": "scheduling",
      "label": "Scheduling & Autoscaling",
      "text": "precise technical question",
      "hint": "e.g. KEDA on GPU-util + queue-depth metrics vs kAI gang-scheduler (fair-share + preemption) vs custom SLA-tiered priority queue"
    },
    {
      "id": "q5",
      "category": "storage",
      "label": "Storage & Caching",
      "text": "precise technical question",
      "hint": "e.g. HBM-only KV cache vs HBM+DRAM tiering vs LMCache disaggregated SSD; model weights on EFS vs NVMe local"
    }
  ],
  "calculatorConfig": {
    "type": "kv_cache_calc | throughput_calc | storage_calc | bandwidth_calc",
    "metricsToTrack": ["string"]
  }
}

SCENARIO: "${scenario}"`

  try {
    const msg = await client.messages.create({
      model: MODEL,
      temperature: 0,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }]
    })
    const raw = stripFences(msg.content[0].text, 'json')
    res.json(JSON.parse(raw))
  } catch (err) {
    console.error('Phase 1 error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ── Phase 2: Architecture + Mermaid Generation ───────────────────────────────
app.post('/api/architecture', async (req, res) => {
  const { scenario, questions, answers } = req.body
  if (!scenario || !answers) return res.status(400).json({ error: 'scenario and answers required' })

  const answersText = Object.entries(answers)
    .map(([id, val]) => {
      const q = questions?.find(q => q.id === id)
      const dim = q?.category ? `[${q.category.toUpperCase()}] ` : ''
      return `- ${dim}${q?.label ?? id}: ${val}`
    })
    .join('\n')

  const prompt = `You are a Principal ML Infrastructure Architect.
The requirements below came from 5 deep technical dimensions (scale, compute/inference engine, routing, scheduling, storage).
Use the EXACT technologies the user named — do not substitute generic names.
Output EXACTLY two tagged sections — nothing else outside the tags.

<SYSTEM_CONFIG>
{
  "summary": "2-sentence architectural overview naming the specific chosen technologies",
  "bottlenecksIdentified": [
    "specific bottleneck with numbers, e.g. KV cache eviction pressure at >70% HBM fill"
  ],
  "recommendedTechStack": {
    "inferenceEngine": "exact choice + key config, e.g. vLLM v0.4 TP=4 continuous batching",
    "routing": "exact routing algo + trigger, e.g. prefix-hash router (>40% cache-hit threshold)",
    "scheduler": "exact scheduler + config, e.g. KEDA on prometheus/gpu_util >80% + kAI gang-sched",
    "kvCache": "exact tiering, e.g. HBM 80GB + DRAM 256GB via LMCache disaggregated",
    "modelStorage": "exact store, e.g. S3 + EFS mount cold / NVMe local hot",
    "vectorDb": "if applicable"
  },
  "scaleEstimates": {
    "qps": "Xk req/s\\nderivation: N replicas × throughput per replica",
    "kvCacheGB": "X GB\\nderivation: 2×L×H×D×S×B×P / 1e9",
    "modelWeightsGB": "X GB\\nderivation: params × precision bytes",
    "bandwidth": "X GB/s\\nderivation: tokens/s × bytes/token"
  },
  "tradeoffs": [
    {
      "dimension": "routing",
      "choice": "prefix-hash vs queue-depth",
      "tradeoff": "prefix-hash raises KV hit rate 40%→75% but creates hotspot on popular prefixes; queue-depth balances load but wastes cache",
      "winner": "prefix-hash + fallback to queue-depth on hotspot"
    }
  ]
}
</SYSTEM_CONFIG>

<ARCHITECTURE_DIAGRAM>
[valid Mermaid flowchart — rules below]
</ARCHITECTURE_DIAGRAM>

════════════════════════════
MERMAID DIAGRAM RULES — MANDATORY
════════════════════════════

STRUCTURE: graph TD with 4 named subgraphs top-to-bottom using the ACTUAL chosen technologies:
  T1 ["Client & Routing Layer"]    — ingress, load balancer, routing algorithm node
  T2 ["Serving / Compute Layer"]   — inference engine replicas (fast-path + slow-path pools)
  T3 ["State & Cache Layer"]       — KV cache tiers, model weight store, vector DB if applicable
  T4 ["Control & Telemetry"]       — scheduler, autoscaler, metrics, model registry

PARALLEL POOLS in T2: nested subgraphs FP (fast-path, latency-sensitive) and SP (slow-path, batch/async).
Each MUST have ≥1 real node. Name nodes after the actual technology: e.g. fp1["vLLM Replica-0\\n..."]

CORRELATION LABELS: embed (UP)/(DOWN) trade-off arrows inside every primary node label.
Use only plain ASCII. No Unicode. Example:
  rtr["Prefix-Hash Router\\n---\\n(UP) Prefix Match\\n  -> (UP) KV Hit Rate\\n  -> (DN) Hotspot Risk"]

CONNECTIONS:
  Critical data path (<SLA ms):   A ==> B
  Async/control:                  A -.-> B
  Trade-off correlation:          n1 -.->|"(UP) Batch = (DN) TTFT"| n2

NODE SHAPES:
  Clients/users: ([label])    Databases/stores: [(label)]
  Services:      [label]      Caches:           [[label]]
  Queues:        >label]      Schedulers:       {label}

LAYOUT INIT (first line):
%%{init: {"flowchart": {"nodeSpacing": 80, "rankSpacing": 65, "curve": "linear"}}}%%

IDs: short alphanumeric. Labels: always double-quoted. No bare parentheses outside quotes.

════════════════════════════
INPUTS
════════════════════════════
Scenario: ${scenario}
Requirements (5 dimensions):
${answersText}`

  try {
    const msg = await client.messages.create({
      model: MODEL,
      temperature: 0,
      max_tokens: 6000,
      messages: [{ role: 'user', content: prompt }]
    })

    const text = msg.content[0].text
    console.log('Phase 2 raw response length:', text.length)

    const configMatch = text.match(/<SYSTEM_CONFIG>([\s\S]*?)<\/SYSTEM_CONFIG>/)
    const diagramMatch = text.match(/<ARCHITECTURE_DIAGRAM>([\s\S]*?)<\/ARCHITECTURE_DIAGRAM>/)

    if (!configMatch || !diagramMatch) {
      console.error('Missing tags. Raw:\n', text.slice(0, 800))
      return res.status(500).json({ error: 'LLM response missing required tags', raw: text.slice(0, 1200) })
    }

    let systemConfig
    try {
      systemConfig = JSON.parse(stripFences(configMatch[1], 'json'))
    } catch (e) {
      console.error('Config JSON parse failed:', e.message)
      systemConfig = {
        summary: 'Architecture generated.',
        bottlenecksIdentified: [],
        recommendedTechStack: {},
        scaleEstimates: {},
        tradeoffs: [],
      }
    }

    const rawMermaid = stripFences(diagramMatch[1], 'mermaid')
    const mermaidCode = sanitizeMermaid(rawMermaid)

    res.json({ systemConfig, mermaidCode })
  } catch (err) {
    console.error('Phase 2 error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

export { app }

if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3001
  app.listen(PORT, () => console.log(`API server → http://localhost:${PORT}`))
}
