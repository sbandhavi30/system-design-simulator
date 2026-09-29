import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import http from 'node:http'

// Mock Anthropic SDK before importing app — prevents real API calls and avoids
// needing ANTHROPIC_API_KEY in the test environment
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      constructor() {
        this.messages = {
          create: vi.fn().mockRejectedValue(new Error('LLM not called in validation tests')),
        }
      }
    },
  }
})

const { app } = await import('./index.js')

let server, baseURL

beforeAll(() => new Promise(resolve => {
  server = http.createServer(app)
  server.listen(0, () => {
    baseURL = `http://localhost:${server.address().port}`
    resolve()
  })
}))

afterAll(() => new Promise(resolve => server.close(resolve)))

async function post(path, body) {
  const res = await fetch(`${baseURL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { status: res.status, body: await res.json() }
}

// ── /api/requirements ─────────────────────────────────────────────────────────

describe('POST /api/requirements', () => {
  it('rejects empty scenario with 400', async () => {
    const { status, body } = await post('/api/requirements', { scenario: '' })
    expect(status).toBe(400)
    expect(body.error).toMatch(/scenario required/)
  })

  it('rejects whitespace-only scenario with 400', async () => {
    const { status, body } = await post('/api/requirements', { scenario: '   ' })
    expect(status).toBe(400)
    expect(body.error).toMatch(/scenario required/)
  })

  it('rejects missing scenario key with 400', async () => {
    const { status, body } = await post('/api/requirements', {})
    expect(status).toBe(400)
    expect(body.error).toMatch(/scenario required/)
  })

  it('rejects null scenario with 400', async () => {
    const { status, body } = await post('/api/requirements', { scenario: null })
    expect(status).toBe(400)
    expect(body.error).toMatch(/scenario required/)
  })
})

// ── /api/architecture ─────────────────────────────────────────────────────────

describe('POST /api/architecture', () => {
  it('rejects missing scenario with 400', async () => {
    const { status, body } = await post('/api/architecture', { answers: { q1: 'yes' } })
    expect(status).toBe(400)
    expect(body.error).toMatch(/scenario and answers required/)
  })

  it('rejects missing answers with 400', async () => {
    const { status, body } = await post('/api/architecture', { scenario: 'Design a chat app' })
    expect(status).toBe(400)
    expect(body.error).toMatch(/scenario and answers required/)
  })

  it('rejects null scenario with 400', async () => {
    const { status, body } = await post('/api/architecture', { scenario: null, answers: { q1: 'yes' } })
    expect(status).toBe(400)
    expect(body.error).toMatch(/scenario and answers required/)
  })

  it('rejects null answers with 400', async () => {
    const { status, body } = await post('/api/architecture', { scenario: 'Design a chat app', answers: null })
    expect(status).toBe(400)
    expect(body.error).toMatch(/scenario and answers required/)
  })

  it('rejects empty object for both fields with 400', async () => {
    const { status, body } = await post('/api/architecture', {})
    expect(status).toBe(400)
    expect(body.error).toMatch(/scenario and answers required/)
  })
})

// ── /api/modify-architecture ──────────────────────────────────────────────────

describe('POST /api/modify-architecture', () => {
  it('rejects missing currentGraph with 400', async () => {
    const { status, body } = await post('/api/modify-architecture', { userMessage: 'add Redis' })
    expect(status).toBe(400)
    expect(body.error).toMatch(/currentGraph and userMessage required/)
  })

  it('rejects missing userMessage with 400', async () => {
    const { status, body } = await post('/api/modify-architecture', {
      currentGraph: { nodes: [], edges: [] }
    })
    expect(status).toBe(400)
    expect(body.error).toMatch(/currentGraph and userMessage required/)
  })

  it('rejects null currentGraph with 400', async () => {
    const { status, body } = await post('/api/modify-architecture', {
      currentGraph: null,
      userMessage: 'add Redis',
    })
    expect(status).toBe(400)
    expect(body.error).toMatch(/currentGraph and userMessage required/)
  })

  it('rejects empty string userMessage with 400', async () => {
    // Empty string is falsy in JS: !userMessage is true for ''
    const { status, body } = await post('/api/modify-architecture', {
      currentGraph: { nodes: [], edges: [] },
      userMessage: '',
    })
    expect(status).toBe(400)
    expect(body.error).toMatch(/currentGraph and userMessage required/)
  })

  it('rejects both missing with 400', async () => {
    const { status, body } = await post('/api/modify-architecture', {})
    expect(status).toBe(400)
    expect(body.error).toMatch(/currentGraph and userMessage required/)
  })

  it('accepts valid request with graph that has null nodes/edges (compact topology uses ?? [])', async () => {
    // This validates the server does NOT 400 before hitting the LLM.
    // The LLM mock rejects, so expect a 500 (not a 400 or a crash).
    const { status } = await post('/api/modify-architecture', {
      currentGraph: { nodes: null, edges: null },
      userMessage: 'add Redis cache',
    })
    expect(status).toBe(500)
  })
})
