import { useRef, useCallback, useEffect, useState } from 'react'
import { Box } from '@mui/material'

// VS Code dark theme colors
const SYN = {
  key: '#9CDCFE',
  string: '#CE9178',
  number: '#B5CEA8',
  bool: '#569CD6',
  null: '#569CD6',
  bracket: '#D4D4D4',
  punct: '#808080',
  text: '#D4D4D4',
  bg: '#1E1E1E',
  lineNum: '#858585',
  cursor: '#fff',
  // Python specific
  keyword: '#569CD6',
  builtin: '#DCDCAA',
  comment: '#6A9955',
  decorator: '#DCDCAA',
  param: '#9CDCFE',
}

function highlightJson(code: string): string {
  return code.replace(
    /("(?:[^"\\]|\\.)*")\s*:|("(?:[^"\\]|\\.)*")|(\b(?:true|false)\b)|(\bnull\b)|(-?\d+\.?\d*(?:[eE][+-]?\d+)?)|([{}[\]])|([,:])/g,
    (match, key, str, bool, nul, num, bracket, punct) => {
      if (key) return `<span style="color:${SYN.key}">${key}</span>:`
      if (str) return `<span style="color:${SYN.string}">${str}</span>`
      if (bool) return `<span style="color:${SYN.bool}">${bool}</span>`
      if (nul) return `<span style="color:${SYN.null}">${nul}</span>`
      if (num) return `<span style="color:${SYN.number}">${num}</span>`
      if (bracket) return `<span style="color:${SYN.bracket}">${bracket}</span>`
      if (punct) return `<span style="color:${SYN.punct}">${punct}</span>`
      return match
    }
  )
}

function highlightPython(code: string): string {
  const keywords = /\b(def|return|if|elif|else|for|in|while|import|from|as|class|try|except|raise|with|pass|break|continue|and|or|not|is|None|True|False|lambda|yield|async|await)\b/g
  const builtins = /\b(print|len|range|str|int|float|list|dict|set|tuple|type|isinstance|getattr|setattr|enumerate|zip|map|filter|sorted|any|all|next)\b/g

  let result = code
    // Comments
    .replace(/(#.*$)/gm, `<span style="color:${SYN.comment}">$1</span>`)
    // Strings (double and single quoted)
    .replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, `<span style="color:${SYN.string}">$1</span>`)

  // Keywords (avoid replacing inside already-spanned text)
  result = result.replace(keywords, (m) => `<span style="color:${SYN.keyword}">${m}</span>`)
  result = result.replace(builtins, (m) => `<span style="color:${SYN.builtin}">${m}</span>`)

  return result
}

interface Props {
  value: string
  onChange: (v: string) => void
  language?: 'json' | 'python'
  placeholder?: string
  rows?: number
  readOnly?: boolean
}

export default function SyntaxEditor({
  value, onChange, language = 'json', placeholder, rows = 10, readOnly = false,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const highlightRef = useRef<HTMLDivElement>(null)
  const INDENT = language === 'json' ? '    ' : '    '

  const syncScroll = () => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft
    }
  }

  const highlighted = language === 'python' ? highlightPython(value || '') : highlightJson(value || '')

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (readOnly) return
    const ta = textareaRef.current
    if (!ta) return

    if (e.key === 'Tab') {
      e.preventDefault()
      const s = ta.selectionStart, end = ta.selectionEnd
      const nv = ta.value.substring(0, s) + INDENT + ta.value.substring(end)
      onChange(nv)
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + INDENT.length })
    }

    if (e.key === 'Enter') {
      const s = ta.selectionStart, val = ta.value
      const ls = val.lastIndexOf('\n', s - 1) + 1
      const indent = val.substring(ls, s).match(/^(\s*)/)?.[1] || ''
      const before = val[s - 1], after = val[s]

      if (before === '{' || before === '[' || before === ':') {
        e.preventDefault()
        const ei = indent + INDENT
        if (after === '}' || after === ']') {
          const nv = val.substring(0, s) + '\n' + ei + '\n' + indent + val.substring(s)
          onChange(nv)
          requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 1 + ei.length })
        } else {
          const nv = val.substring(0, s) + '\n' + ei + val.substring(s)
          onChange(nv)
          requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 1 + ei.length })
        }
      } else if (indent) {
        e.preventDefault()
        const nv = val.substring(0, s) + '\n' + indent + val.substring(s)
        onChange(nv)
        requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 1 + indent.length })
      }
    }
  }, [onChange, readOnly, INDENT])

  return (
    <Box sx={{ position: 'relative', borderRadius: 1, overflow: 'hidden', border: 1, borderColor: 'divider' }}>
      {/* Syntax-highlighted overlay */}
      <Box
        ref={highlightRef}
        sx={{
          position: 'absolute', inset: 0, p: 1.5,
          fontFamily: '"Fira Code", "Consolas", "Courier New", monospace',
          fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordWrap: 'break-word',
          color: SYN.text, bgcolor: SYN.bg,
          overflow: 'auto', pointerEvents: 'none',
          '& span': { pointerEvents: 'none' },
        }}
        dangerouslySetInnerHTML={{ __html: highlighted + '\n' }}
      />
      {/* Transparent textarea on top */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
        onKeyDown={handleKeyDown as any}
        readOnly={readOnly}
        placeholder={placeholder}
        rows={rows}
        spellCheck={false}
        style={{
          position: 'relative',
          width: '100%',
          padding: 12,
          fontFamily: '"Fira Code", "Consolas", "Courier New", monospace',
          fontSize: 12,
          lineHeight: 1.6,
          color: 'transparent',
          caretColor: SYN.cursor,
          backgroundColor: 'transparent',
          border: 'none',
          outline: 'none',
          resize: 'vertical',
          minHeight: rows * 19.2,
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
          overflow: 'auto',
        }}
      />
    </Box>
  )
}
