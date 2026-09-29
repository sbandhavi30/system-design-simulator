import { useEffect, useRef, useState } from 'react'

// Promise-based singleton so concurrent calls don't double-initialize
let initPromise = null
function initMermaid() {
  if (initPromise) return initPromise
  initPromise = import('mermaid').then(m => {
    m.default.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
      themeVariables: {
        primaryColor: '#10b981',
        primaryTextColor: '#f1f5f9',
        primaryBorderColor: '#34d399',
        lineColor: '#6b7280',
        secondaryColor: '#1e293b',
        tertiaryColor: '#0f172a',
        background: '#09090b',
        mainBkg: '#1e293b',
        nodeBorder: '#4b5563',
        clusterBkg: '#0f172a',
        titleColor: '#f1f5f9',
        edgeLabelBackground: '#1e293b',
        fontFamily: 'ui-monospace, SFMono-Regular, monospace',
      },
      flowchart: { curve: 'linear', htmlLabels: true },
    })
    return m.default
  })
  return initPromise
}

let idSeq = 0

export default function MermaidDiagram({ code, className = '' }) {
  const [svg, setSvg] = useState(null)
  const [error, setError] = useState(null)
  const instanceId = useRef(`mermaid-${++idSeq}`)

  useEffect(() => {
    if (!code?.trim()) return
    let cancelled = false

    async function render() {
      try {
        const mermaid = await initMermaid()
        // Use a unique render ID each time code changes to avoid stale DOM artifacts
        const renderId = `${instanceId.current}-${Date.now()}`
        const { svg: rendered } = await mermaid.render(renderId, code)
        if (!cancelled) {
          setSvg(rendered)
          setError(null)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e?.message ?? 'Mermaid render failed')
          setSvg(null)
        }
      }
    }

    render()
    return () => { cancelled = true }
  }, [code])

  if (error) {
    return (
      <div className={`rounded-lg border border-red-500/40 bg-red-900/10 p-4 ${className}`}>
        <p className="text-xs font-mono text-red-400 mb-2">Diagram render error</p>
        <pre className="text-xs text-red-300/60 whitespace-pre-wrap break-all mb-2">{error}</pre>
        <details>
          <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-300">Show raw Mermaid code</summary>
          <pre className="mt-2 text-xs text-slate-400 whitespace-pre-wrap bg-slate-900 p-2 rounded">{code}</pre>
        </details>
      </div>
    )
  }

  if (!svg) {
    return (
      <div className={`flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900/50 min-h-48 ${className}`}>
        <span className="text-sm text-slate-500 animate-pulse">Rendering diagram…</span>
      </div>
    )
  }

  return (
    <div
      className={`mermaid-output overflow-auto rounded-lg ${className}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
