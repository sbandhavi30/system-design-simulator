export function stripFences(text, lang = '') {
  return text
    .trim()
    .replace(new RegExp(`^\`\`\`${lang}\\s*\\n?`), '')
    .replace(/\n?```$/, '')
    .trim()
}

export function repairJSON(str) {
  const stack = []
  let inStr = false, esc = false
  for (const ch of str) {
    if (esc) { esc = false; continue }
    if (ch === '\\' && inStr) { esc = true; continue }
    if (ch === '"') { inStr = !inStr; continue }
    if (inStr) continue
    if (ch === '{' || ch === '[') stack.push(ch)
    if (ch === '}') stack.pop()
    if (ch === ']') stack.pop()
  }
  let tail = inStr ? '"' : ''
  for (let i = stack.length - 1; i >= 0; i--) {
    tail += stack[i] === '{' ? '}' : ']'
  }
  return str + tail
}
