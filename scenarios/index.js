// ─────────────────────────────────────────────────────────────────────────────
// NODE TYPES  →  add new types here, they auto-appear in diagrams + legend
// ─────────────────────────────────────────────────────────────────────────────
export const NODE_CONFIG = {
  client:       { bg: "bg-blue-500/15",    border: "border-blue-500/50",    text: "text-blue-300"    },
  server:       { bg: "bg-emerald-500/15", border: "border-emerald-500/50", text: "text-emerald-300" },
  database:     { bg: "bg-purple-500/15",  border: "border-purple-500/50",  text: "text-purple-300"  },
  cache:        { bg: "bg-amber-500/15",   border: "border-amber-500/50",   text: "text-amber-300"   },
  storage:      { bg: "bg-slate-600/25",   border: "border-slate-500/50",   text: "text-slate-300"   },
  loadbalancer: { bg: "bg-yellow-500/15",  border: "border-yellow-500/50",  text: "text-yellow-300"  },
  network:      { bg: "bg-cyan-500/15",    border: "border-cyan-500/50",    text: "text-cyan-300"    },
  gateway:      { bg: "bg-cyan-500/15",    border: "border-cyan-500/50",    text: "text-cyan-300"    },
  queue:        { bg: "bg-red-500/15",     border: "border-red-500/50",     text: "text-red-300"     },
  worker:       { bg: "bg-orange-500/15",  border: "border-orange-500/50",  text: "text-orange-300"  },
  microservice: { bg: "bg-indigo-500/15",  border: "border-indigo-500/50",  text: "text-indigo-300"  },
  gpu:          { bg: "bg-green-500/15",   border: "border-green-500/50",   text: "text-green-300"   },
  cdn:          { bg: "bg-teal-500/15",    border: "border-teal-500/50",    text: "text-teal-300"    },
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO SCHEMA
// Each scenario: { id, name, tag, emoji, isAI, questions[3], scaleEstimates,
//                  scales: { low, medium, massive }, tradeoffs[4] }
// scales.*.nodes: [{ id, label, x, y, type }]  — canvas 740×480px
// scales.*.edges: [[srcId, dstId], ...]
// ─────────────────────────────────────────────────────────────────────────────

// ── 1. Video Streaming ───────────────────────────────────────────────────────
const tiktok = {
  id: "tiktok",
  name: "Video Streaming Platform",
  tag: "TikTok / Netflix",
  emoji: "🎬",
  isAI: false,
  questions: [
    { id: "q1", label: "Scale & Traffic",       text: "What is the expected DAU count and read-to-write ratio for video consumption vs. uploads?", hint: "e.g. 500M DAU, 100:1 read/write ratio" },
    { id: "q2", label: "Consistency & Latency", text: "What are the latency SLAs? Is strict consistency required for view counts and feed freshness?", hint: "e.g. p99 < 200ms for feed load, eventual consistency OK for view counts" },
    { id: "q3", label: "Media Constraints",     text: "What are the max video file size and format requirements? Real-time or async transcoding?", hint: "e.g. max 2GB, H.264/H.265/AV1, async transcoding pipeline" },
  ],
  scaleEstimates: {
    qps:       "~12K QPS\n500M users × 2 views/day ÷ 86,400s",
    storage:   "~58 TB/day\n1M uploads/day × avg 50 MB/video",
    cache:     "~200 GB RAM\ntop 1% of 20M videos × 1 MB metadata",
    bandwidth: "~580 GB/s egress\n12K QPS × avg 4 MB/s stream per user",
  },
  scales: {
    low: {
      title: "MVP — 0-10K users",
      nodes: [
        { id: "client",   label: "Client",              x: 30,  y: 200, type: "client"   },
        { id: "server",   label: "Monolithic\nApp Server", x: 230, y: 200, type: "server"   },
        { id: "postgres", label: "PostgreSQL\n(Metadata)", x: 450, y: 115, type: "database" },
        { id: "storage",  label: "Local\nDisk Storage",  x: 450, y: 285, type: "storage"  },
      ],
      edges: [["client","server"],["server","postgres"],["server","storage"]],
    },
    medium: {
      title: "Scaling — 10K-100K QPS",
      nodes: [
        { id: "client", label: "Client",                     x: 20,  y: 200, type: "client"       },
        { id: "geodns", label: "GeoDNS",                     x: 133, y: 200, type: "network"      },
        { id: "lb",     label: "Load Balancer\n(Nginx/ALB)", x: 250, y: 200, type: "loadbalancer" },
        { id: "app1",   label: "App Server",                 x: 385, y: 90,  type: "server"       },
        { id: "app2",   label: "App Server",                 x: 385, y: 200, type: "server"       },
        { id: "app3",   label: "App Server",                 x: 385, y: 310, type: "server"       },
        { id: "redis",  label: "Redis\n(Feed Cache)",        x: 515, y: 90,  type: "cache"        },
        { id: "pg",     label: "PostgreSQL\n+ Read Replicas",x: 515, y: 200, type: "database"     },
        { id: "s3",     label: "AWS S3\n(Raw Video)",        x: 515, y: 310, type: "storage"      },
        { id: "ffmpeg", label: "FFmpeg\nWorker Pool",        x: 515, y: 390, type: "worker"       },
      ],
      edges: [["client","geodns"],["geodns","lb"],["lb","app1"],["lb","app2"],["lb","app3"],["app1","redis"],["app2","pg"],["app3","s3"],["s3","ffmpeg"]],
    },
    massive: {
      title: "Massive Scale — Millions of Users",
      nodes: [
        { id: "client",     label: "Client",                    x: 20,  y: 200, type: "client"      },
        { id: "anycast",    label: "Anycast\nRouting",          x: 132, y: 200, type: "network"     },
        { id: "gateway",    label: "Multi-Region\nAPI Gateway", x: 248, y: 200, type: "gateway"     },
        { id: "auth",       label: "Auth\nService",             x: 380, y: 60,  type: "microservice"},
        { id: "feed",       label: "Feed\nService",             x: 380, y: 170, type: "microservice"},
        { id: "video",      label: "Video Meta\nService",       x: 380, y: 280, type: "microservice"},
        { id: "cockroach",  label: "CockroachDB\n(Global ACID)",x: 515, y: 60,  type: "database"   },
        { id: "redisclust", label: "Redis Cluster\n(Distributed)", x: 515, y: 170, type: "cache"   },
        { id: "cdn",        label: "CDN Edge\n(Video Cache)",   x: 515, y: 280, type: "cdn"        },
        { id: "kafka",      label: "Kafka\n(Event Bus)",        x: 380, y: 385, type: "queue"      },
        { id: "transcode",  label: "Transcoding\nCluster",      x: 515, y: 385, type: "worker"     },
        { id: "glacier",    label: "S3 Glacier\n(Cold Tier)",   x: 630, y: 385, type: "storage"    },
      ],
      edges: [["client","anycast"],["anycast","gateway"],["gateway","auth"],["gateway","feed"],["gateway","video"],["auth","cockroach"],["feed","redisclust"],["video","cdn"],["video","kafka"],["kafka","transcode"],["transcode","glacier"]],
    },
  },
  tradeoffs: [
    { dimension: "Consistency",   choice: "Eventual vs Strong for view counts",  tradeoff: "Strong = every write waits for all nodes to agree → +50–200ms. Eventual = counts can be 1–2s stale, but you handle 10M writes/sec easily. For likes and views, stale is fine.", winner: "Eventual Consistency" },
    { dimension: "Database",      choice: "CockroachDB vs plain PostgreSQL",      tradeoff: "Postgres is great up to ~50M rows, then you manually shard. CockroachDB splits data across nodes automatically. Trade-off: CockroachDB costs ~3× more to operate.", winner: "CockroachDB at scale" },
    { dimension: "Cache Pattern", choice: "Cache-Aside TTL vs Write-Through",     tradeoff: "Write-Through: every upload updates cache immediately — safe but slow. Cache-Aside: serve from cache, let it expire after 60s — faster, accepts brief staleness.", winner: "Cache-Aside + 60s TTL" },
    { dimension: "Storage Cost",  choice: "Hot S3 + Cold Glacier vs single tier", tradeoff: "Videos older than 90 days get < 1% views. Glacier costs $0.004/GB vs S3's $0.023/GB — 80% cheaper. Just add a 90-day lifecycle rule.", winner: "S3 + Glacier Tiering" },
  ],
}

// ── 2. Rate Limiter ──────────────────────────────────────────────────────────
const ratelimiter = {
  id: "ratelimiter",
  name: "Distributed Rate Limiter",
  tag: "API Gateway / Edge",
  emoji: "🔒",
  isAI: false,
  questions: [
    { id: "q1", label: "Throughput & Granularity", text: "What is the target throughput in req/s, and at what granularity — per IP, per API key, per user?", hint: "e.g. 5M req/s, per API key with IP fallback for unauthenticated" },
    { id: "q2", label: "Algorithm Choice",          text: "Is burstiness acceptable? Strict sliding window vs. token bucket vs. fixed window?", hint: "e.g. token bucket for data APIs, sliding window for auth endpoints" },
    { id: "q3", label: "Enforcement Scope",         text: "Is global synchronization required or is per-region approximate enforcement acceptable?", hint: "e.g. global sync required for billing and auth, per-region OK for general API" },
  ],
  scaleEstimates: {
    qps:       "~5M req/s\n50K servers × 100 req/s each at peak",
    storage:   "~5 GB state\n100M active API keys × 50 bytes per token-bucket entry",
    cache:     "~5 GB Redis\n100M keys × 50 bytes = 5 GB, fits one Redis node",
    bandwidth: "< 1ms local check\n5–15ms if you go to central Redis over network",
  },
  scales: {
    low: {
      title: "MVP — Single Server",
      nodes: [
        { id: "client",  label: "Client",                      x: 80,  y: 200, type: "client" },
        { id: "server",  label: "Monolithic\nApp Server",       x: 270, y: 200, type: "server" },
        { id: "hashmap", label: "In-Memory\nConcurrentHashMap", x: 460, y: 200, type: "cache"  },
      ],
      edges: [["client","server"],["server","hashmap"]],
    },
    medium: {
      title: "Scaling — 10K-100K QPS",
      nodes: [
        { id: "client", label: "Client",                            x: 40,  y: 200, type: "client"       },
        { id: "lb",     label: "Load Balancer",                     x: 180, y: 200, type: "loadbalancer" },
        { id: "web1",   label: "Web Server 1",                      x: 330, y: 120, type: "server"       },
        { id: "web2",   label: "Web Server 2",                      x: 330, y: 280, type: "server"       },
        { id: "redis",  label: "Redis\n(Token Bucket /\nSliding Window)", x: 490, y: 200, type: "cache"  },
      ],
      edges: [["client","lb"],["lb","web1"],["lb","web2"],["web1","redis"],["web2","redis"]],
    },
    massive: {
      title: "Massive Scale — Global Enforcement",
      nodes: [
        { id: "client",  label: "Client",                      x: 20,  y: 200, type: "client"  },
        { id: "envoyA",  label: "Envoy Gateway\nRegion A",     x: 145, y: 110, type: "gateway" },
        { id: "envoyB",  label: "Envoy Gateway\nRegion B",     x: 145, y: 290, type: "gateway" },
        { id: "bucketA", label: "Local Token\nBucket (Edge A)",x: 290, y: 110, type: "cache"   },
        { id: "bucketB", label: "Local Token\nBucket (Edge B)",x: 290, y: 290, type: "cache"   },
        { id: "redisA",  label: "Redis Cluster\nRegion A",     x: 435, y: 110, type: "cache"   },
        { id: "redisB",  label: "Redis Cluster\nRegion B",     x: 435, y: 290, type: "cache"   },
        { id: "kafka",   label: "Kafka\n(Global Usage Sync)",  x: 565, y: 200, type: "queue"   },
      ],
      edges: [["client","envoyA"],["client","envoyB"],["envoyA","bucketA"],["envoyB","bucketB"],["bucketA","redisA"],["bucketB","redisB"],["redisA","kafka"],["redisB","kafka"]],
    },
  },
  tradeoffs: [
    { dimension: "Algorithm",   choice: "Token Bucket vs Sliding Window Log",  tradeoff: "Token Bucket: 1 counter per key (50 bytes). Sliding Window Log: stores every request timestamp. At 100M keys, token bucket = 5 GB vs sliding window = 50–500 GB. Easy choice.", winner: "Token Bucket" },
    { dimension: "Locality",    choice: "Edge-local bucket vs Central Redis",   tradeoff: "Central Redis: perfectly accurate but adds 5–15ms per request. Edge-local: 0ms overhead but allows up to 5% overage (2 regions each think they have the full quota).", winner: "Edge-local + async sync" },
    { dimension: "Accuracy",    choice: "Exact limits vs Allow ±5% overage",    tradeoff: "Exact limits need a distributed lock on every request — kills throughput. Allowing ±5% overage is invisible to real users and blocks 99.9% of abuse patterns.", winner: "Approximate is fine" },
    { dimension: "Storage",     choice: "Redis vs Memcached",                   tradeoff: "Memcached is faster at raw GET/SET. Redis has INCR+EXPIRE as one atomic command — exactly what token buckets need. No atomic ops = race conditions.", winner: "Redis" },
  ],
}

// ── 3. LLM Inference Fleet ───────────────────────────────────────────────────
const llm = {
  id: "llm",
  name: "LLM Inference Fleet",
  tag: "vLLM / TensorRT-LLM",
  emoji: "🤖",
  isAI: true,
  questions: [
    { id: "q1", label: "Model & Precision",    text: "What is the target model size and serving precision? (e.g., 70B BF16, 405B INT8)", hint: "e.g. 70B params, BF16, target 1000 concurrent sessions" },
    { id: "q2", label: "Latency SLAs",         text: "What are your Time-to-First-Token (TTFT) and output length targets? Streaming or batch?", hint: "e.g. TTFT < 500ms, max 2048 output tokens, streaming required" },
    { id: "q3", label: "Concurrency & Context",text: "What is peak concurrent session count and average context window length?", hint: "e.g. 500 concurrent sessions, avg 4096 context tokens per session" },
  ],
  scaleEstimates: {
    qps:       "~1K concurrent sessions\n1,000 users each holding an open stream at p50",
    storage:   "~140 GB KV cache\n2 × 32 layers × 32 heads × 128 dim × 4096 tokens × 8 batch × 2B",
    cache:     "~160 GB VRAM needed\n70B params × 2B precision = 140 GB weights + 20 GB KV cache",
    bandwidth: "NVLink 600 GB/s intra-node\nInfiniBand 400 Gb/s inter-node for pipeline stages",
  },
  scales: {
    low: {
      title: "MVP — Single GPU Node",
      nodes: [
        { id: "client",  label: "Client",              x: 50,  y: 200, type: "client"  },
        { id: "fastapi", label: "FastAPI\nServer",      x: 200, y: 200, type: "server"  },
        { id: "h100",    label: "H100 80GB\n(NVLink)",  x: 385, y: 200, type: "gpu"     },
        { id: "weights", label: "Model Weights\n(NVMe)",x: 555, y: 200, type: "storage" },
      ],
      edges: [["client","fastapi"],["fastapi","h100"],["h100","weights"]],
    },
    medium: {
      title: "Scaling — Multi-GPU, Triton Pool",
      nodes: [
        { id: "client",    label: "Client",                        x: 20,  y: 200, type: "client"  },
        { id: "gateway",   label: "API Gateway\n(Session Affinity)",x: 148, y: 200, type: "gateway" },
        { id: "triton1",   label: "Triton Server\n(TP=2)",         x: 305, y: 90,  type: "server"  },
        { id: "triton2",   label: "Triton Server\n(TP=2)",         x: 305, y: 200, type: "server"  },
        { id: "triton3",   label: "Triton Server\n(TP=2)",         x: 305, y: 310, type: "server"  },
        { id: "nvme",      label: "NVMe\nCheckpoint Store",        x: 465, y: 200, type: "storage" },
        { id: "autoscale", label: "Load-based\nAutoscaler",        x: 465, y: 360, type: "worker"  },
      ],
      edges: [["client","gateway"],["gateway","triton1"],["gateway","triton2"],["gateway","triton3"],["triton1","nvme"],["triton2","nvme"],["triton3","nvme"],["triton2","autoscale"]],
    },
    massive: {
      title: "Hyper-Scale — Multi-Modal Production Fleet",
      nodes: [
        { id: "client",    label: "Client\nAPI Request",          x: 15,  y: 200, type: "client"       },
        { id: "router",    label: "Multi-Modal\nSemantic Router", x: 130, y: 200, type: "gateway"      },
        { id: "vit",       label: "Vision Encoder\n(ViT/SigLIP)", x: 255, y: 85,  type: "microservice" },
        { id: "whisper",   label: "Audio Tokenizer\n(Whisper)",   x: 255, y: 295, type: "microservice" },
        { id: "scheduler", label: "Continuous Batching\nScheduler",x: 378, y: 180, type: "worker"      },
        { id: "radix",     label: "RadixTree\nPrefix Cache",      x: 378, y: 358, type: "cache"        },
        { id: "tp1",       label: "TP Cluster\n(NVLink ×8)",      x: 508, y: 78,  type: "gpu"         },
        { id: "tp2",       label: "TP Cluster\n(NVLink ×8)",      x: 508, y: 195, type: "gpu"         },
        { id: "ib",        label: "InfiniBand\nSwitch (PP)",       x: 620, y: 136, type: "network"     },
        { id: "lmcache",   label: "LM Cache\n(DRAM Offload)",      x: 508, y: 358, type: "storage"     },
      ],
      edges: [["client","router"],["router","vit"],["router","whisper"],["vit","scheduler"],["whisper","scheduler"],["scheduler","tp1"],["scheduler","tp2"],["scheduler","radix"],["tp1","ib"],["tp2","ib"],["radix","lmcache"]],
    },
  },
  tradeoffs: [
    { dimension: "Prefill vs Decode",   choice: "Split them onto different GPUs",            tradeoff: "Prefill (processing your prompt) is heavy compute. Decode (generating tokens) is light compute but memory-hungry. Mixing them on the same GPU wastes both. Run them on separate node pools and scale each independently.", winner: "Disaggregate Prefill / Decode" },
    { dimension: "KV Cache Eviction",   choice: "RadixTree prefix reuse vs CPU swap",        tradeoff: "CPU swap: moves KV cache to RAM over PCIe — takes 20–100ms, blocks the GPU. RadixTree: if two requests share the same system prompt, reuse the KV cache instead of recomputing. Saves 40–80% memory on RAG workloads.", winner: "RadixTree prefix reuse" },
    { dimension: "Speculative Decoding",choice: "Run a small draft model to predict tokens", tradeoff: "Small model guesses the next 4–8 tokens, big model verifies in one pass. If acceptance rate > 70%, you get 2–3× faster generation. Below 70%, wasted verify passes cost more than you save.", winner: "Enable if draft model fits the domain" },
    { dimension: "GPU Interconnect",    choice: "NVLink for TP vs InfiniBand for PP",        tradeoff: "Tensor Parallelism splits one layer across GPUs — needs NVLink's 600 GB/s for fast all-reduce. Pipeline Parallelism passes activations between layers — tolerates InfiniBand's 400 Gb/s. PCIe for PP = too slow.", winner: "TP=8 on NVLink + PP over InfiniBand" },
  ],
}

// ── ADD NEW SCENARIOS HERE ───────────────────────────────────────────────────
// Example: import kafka from './kafka.js' and add it to the export below.
// The component reads Object.values(SCENARIOS) — no other change needed.
// ────────────────────────────────────────────────────────────────────────────

export const SCENARIOS = { tiktok, ratelimiter, llm }
