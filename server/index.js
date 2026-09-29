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

  const prompt = `You are an expert System Design Interviewer and Principal Architect.
Generate exactly 3 highly technical requirements-gathering questions for the scenario below.
Focus on: scale targets, read/write ratios, latency SLAs, protocol choices, consistency model.
Do NOT ask generic questions about budget, team size, or timelines.

Output ONLY a valid JSON object — no markdown, no code fences, no commentary:
{
  "scenarioName": "string",
  "technicalDomain": "string",
  "emoji": "string (single emoji)",
  "questions": [
    { "id": "q1", "label": "short label (2-4 words)", "text": "full question", "hint": "example answer" },
    { "id": "q2", "label": "...", "text": "...", "hint": "..." },
    { "id": "q3", "label": "...", "text": "...", "hint": "..." }
  ],
  "calculatorConfig": {
    "type": "storage_calc | bandwidth_calc | kv_cache_calc | throughput_calc",
    "metricsToTrack": ["string"]
  }
}

SCENARIO: "${scenario}"`

  try {
    const msg = await client.messages.create({
      model: MODEL,
      temperature: 0,
      max_tokens: 1024,
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
      return `- ${q?.label ?? id}: ${val}`
    })
    .join('\n')

  const prompt = `You are a Principal Cloud Infrastructure Architect.
Analyze the scenario and requirements, then output EXACTLY two tagged sections — nothing else outside the tags.

<SYSTEM_CONFIG>
{
  "summary": "2-sentence architectural overview",
  "bottlenecksIdentified": ["list bottlenecks"],
  "recommendedTechStack": { "compute": "", "caching": "", "database": "", "transport": "" },
  "scaleEstimates": { "qps": "", "storage": "", "cache": "", "bandwidth": "" },
  "tradeoffs": [
    { "dimension": "", "choice": "", "tradeoff": "", "winner": "" }
  ]
}
</SYSTEM_CONFIG>

<ARCHITECTURE_DIAGRAM>
[valid Mermaid flowchart — rules below]
</ARCHITECTURE_DIAGRAM>

════════════════════════════
MERMAID DIAGRAM RULES — MANDATORY
════════════════════════════

STRUCTURE: Use graph TD with 4 named subgraphs stacked top-to-bottom:
  T1 (Client and Routing) → T2 (Serving Layer) → T3 (State and Cache) → T4 (Control and Telemetry)

PARALLEL POOLS: Inside T2, add two nested subgraphs FP (fast-path) and SP (slow-path).
Each nested subgraph MUST contain at least one real node — never leave a subgraph with only comments.

CORRELATION LABELS: Every primary node must include trade-off text inside its double-quoted label.
Use plain ASCII only — no Unicode arrows. Use up/down arrows like (UP) and (DOWN) instead of ▲▼.
Example:
  fp1["vLLM Fast-Path\\n---\\n(UP) Batch Size\\n  -> (UP) Throughput\\n  -> (DOWN) TTFT Latency"]

CONNECTIONS:
  Data path (critical <500ms):    A ==> B
  Control/telemetry (async):      A -.-> B
  Inter-component correlation:    batch1 -.->|"(UP) Batch = (UP) Cache Contention"| cache1

NODE SHAPES:
  Clients:    ([label])    Databases: [(label)]
  Services:   [label]      Caches:  [[label]]
  Queues:     >label]

IDs: short alphanumeric only. Labels: always double-quoted. No bare parentheses outside quotes.

LAYOUT INIT (first line of diagram):
%%{init: {"flowchart": {"nodeSpacing": 80, "rankSpacing": 65, "curve": "linear"}}}%%

════════════════════════════
INPUTS
════════════════════════════
Scenario: ${scenario}
Requirements:
${answersText}`

  try {
    const msg = await client.messages.create({
      model: MODEL,
      temperature: 0,
      max_tokens: 4096,
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
