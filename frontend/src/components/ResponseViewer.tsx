import { useState, useCallback, useMemo } from 'react'
import { Box, ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material'
import { Code, DataObject } from '@mui/icons-material'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ResponseViewerProps {
  data: any
  maxHeight?: number | string
  highlightPath?: string
}

type ViewMode = 'json' | 'text'

// ---------------------------------------------------------------------------
// VS Code dark theme colors
// ---------------------------------------------------------------------------

const SYN = {
  key: '#9CDCFE',
  string: '#CE9178',
  number: '#B5CEA8',
  boolean: '#569CD6',
  null: '#569CD6',
  bracket: '#D4D4D4',
  comma: '#D4D4D4',
  bg: '#1E1E1E',
  hoverBg: 'rgba(30, 80, 180, 0.15)',
  highlightBg: 'rgba(80, 180, 80, 0.18)',
}

const MONO_FONT = '"Fira Code", "Consolas", "Courier New", monospace'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
}

/** Serialize a value for clipboard — strings without quotes, others as JSON. */
function toClipboardText(value: any): string {
  if (typeof value === 'string') return value
  if (value === null) return 'null'
  if (typeof value === 'boolean' || typeof value === 'number') return String(value)
  return JSON.stringify(value, null, 2)
}

/** Check if a JSON path matches a highlight path (simple prefix / exact match). */
function pathMatchesHighlight(currentPath: string, highlightPath: string | undefined): boolean {
  if (!highlightPath) return false
  return currentPath === highlightPath || currentPath.startsWith(highlightPath + '.')
    || currentPath.startsWith(highlightPath + '[')
}

// ---------------------------------------------------------------------------
// Copied toast — ephemeral flash
// ---------------------------------------------------------------------------

function CopiedFlash({ show }: { show: boolean }) {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 8,
        left: '50%',
        transform: 'translateX(-50%)',
        bgcolor: 'rgba(30, 80, 180, 0.85)',
        color: '#fff',
        fontSize: 11,
        fontFamily: MONO_FONT,
        px: 1.5,
        py: 0.25,
        borderRadius: 1,
        pointerEvents: 'none',
        opacity: show ? 1 : 0,
        transition: 'opacity 0.2s ease',
        zIndex: 10,
      }}
    >
      Copied!
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Text Mode — plain syntax-highlighted JSON
// ---------------------------------------------------------------------------

function TextModeView({ data, highlightPath }: { data: any; highlightPath?: string }) {
  const text = useMemo(() => JSON.stringify(data, null, 2) ?? '', [data])

  // Apply syntax highlighting via regex
  const highlighted = useMemo(() => {
    const lines = text.split('\n')
    return lines.map((line, i) => {
      let html = line
        // Keys
        .replace(/"([^"]+)"(?=\s*:)/g, `<span style="color:${SYN.key}">"$1"</span>`)
        // String values (after colon or in arrays)
        .replace(/:\s*"([^"]*)"(,?)$/g, `: <span style="color:${SYN.string}">"$1"</span>$2`)
        .replace(/^\s*"([^"]*)"(,?)$/g, (match, val, comma) => {
          // Only if not already wrapped (i.e., not a key)
          if (match.includes(`color:${SYN.key}`)) return match
          return match.replace(`"${val}"`, `<span style="color:${SYN.string}">"${val}"</span>`)
        })
        // Numbers
        .replace(/:\s*(-?\d+\.?\d*)(,?)$/g, `: <span style="color:${SYN.number}">$1</span>$2`)
        .replace(/^\s*(-?\d+\.?\d*)(,?)$/g, `<span style="color:${SYN.number}">$1</span>$2`)
        // Booleans
        .replace(/:\s*(true|false)(,?)$/g, `: <span style="color:${SYN.boolean}">$1</span>$2`)
        .replace(/^\s*(true|false)(,?)$/g, `<span style="color:${SYN.boolean}">$1</span>$2`)
        // Null
        .replace(/:\s*(null)(,?)$/g, `: <span style="color:${SYN.null}">$1</span>$2`)
        .replace(/^\s*(null)(,?)$/g, `<span style="color:${SYN.null}">$1</span>$2`)

      return `<span key="${i}">${html}</span>`
    }).join('\n')
  }, [text])

  return (
    <Box
      component="pre"
      sx={{
        m: 0,
        p: 0,
        fontFamily: MONO_FONT,
        fontSize: 12,
        lineHeight: 1.6,
        color: SYN.bracket,
        whiteSpace: 'pre',
        userSelect: 'text',
        cursor: 'text',
      }}
      dangerouslySetInnerHTML={{ __html: highlighted }}
    />
  )
}

// ---------------------------------------------------------------------------
// JSON Mode — interactive recursive renderer
// ---------------------------------------------------------------------------

interface JsonNodeProps {
  value: any
  path: string
  indent: number
  isLast: boolean
  hoveredPath: string
  onHover: (path: string) => void
  onCopy: (text: string) => void
  highlightPath?: string
}

function JsonNode({ value, path, indent, isLast, hoveredPath, onHover, onCopy, highlightPath }: JsonNodeProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pad = '  '.repeat(indent)
  const innerPad = '  '.repeat(indent + 1)
  const isHighlighted = pathMatchesHighlight(path, highlightPath)
  const highlightStyle = isHighlighted ? { backgroundColor: SYN.highlightBg, borderRadius: 2 } : {}

  const hoverStyle = (targetPath: string) => ({
    backgroundColor: hoveredPath === targetPath ? SYN.hoverBg : undefined,
    borderRadius: 2,
    cursor: 'pointer',
    ...((isHighlighted && hoveredPath !== targetPath) ? { backgroundColor: SYN.highlightBg } : {}),
  })

  const comma = isLast ? '' : ','

  // Null
  if (value === null) {
    return (
      <span
        style={{ color: SYN.null, ...hoverStyle(path), ...highlightStyle }}
        onMouseEnter={() => onHover(path)}
        onMouseLeave={() => onHover('')}
        onClick={() => onCopy('null')}
      >
        null{comma && <span style={{ color: SYN.comma }}>{comma}</span>}
      </span>
    )
  }

  // Boolean
  if (typeof value === 'boolean') {
    return (
      <span
        style={{ color: SYN.boolean, ...hoverStyle(path), ...highlightStyle }}
        onMouseEnter={() => onHover(path)}
        onMouseLeave={() => onHover('')}
        onClick={() => onCopy(String(value))}
      >
        {String(value)}{comma && <span style={{ color: SYN.comma }}>{comma}</span>}
      </span>
    )
  }

  // Number
  if (typeof value === 'number') {
    return (
      <span
        style={{ color: SYN.number, ...hoverStyle(path), ...highlightStyle }}
        onMouseEnter={() => onHover(path)}
        onMouseLeave={() => onHover('')}
        onClick={() => onCopy(String(value))}
      >
        {value}{comma && <span style={{ color: SYN.comma }}>{comma}</span>}
      </span>
    )
  }

  // String
  if (typeof value === 'string') {
    return (
      <span
        style={{ color: SYN.string, ...hoverStyle(path), ...highlightStyle }}
        onMouseEnter={() => onHover(path)}
        onMouseLeave={() => onHover('')}
        onClick={() => onCopy(value)}
      >
        &quot;{value}&quot;{comma && <span style={{ color: SYN.comma }}>{comma}</span>}
      </span>
    )
  }

  // Array
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return (
        <span
          style={{ color: SYN.bracket, ...hoverStyle(path), ...highlightStyle }}
          onMouseEnter={() => onHover(path)}
          onMouseLeave={() => onHover('')}
          onClick={() => onCopy('[]')}
        >
          []{comma && <span style={{ color: SYN.comma }}>{comma}</span>}
        </span>
      )
    }

    return (
      <span
        style={{ ...hoverStyle(path), ...highlightStyle }}
        onMouseEnter={(e) => { e.stopPropagation(); onHover(path) }}
        onMouseLeave={(e) => { e.stopPropagation(); onHover('') }}
        onClick={(e) => { e.stopPropagation(); onCopy(JSON.stringify(value, null, 2)) }}
      >
        <span
          style={{ color: SYN.bracket, cursor: 'pointer', userSelect: 'none' }}
          onClick={(e) => { e.stopPropagation(); setCollapsed(!collapsed) }}
        >
          {collapsed ? '▶ ' : '▼ '}[
        </span>
        {collapsed ? (
          <>
            <span style={{ color: SYN.comma, fontStyle: 'italic', opacity: 0.5 }}>{` ${value.length} items `}</span>
            <span style={{ color: SYN.bracket }}>]{comma && <span style={{ color: SYN.comma }}>{comma}</span>}</span>
          </>
        ) : (
          <>
            {'\n'}
            {value.map((item, i) => (
              <span key={i}>
                {innerPad}
                <JsonNode
                  value={item}
                  path={`${path}[${i}]`}
                  indent={indent + 1}
                  isLast={i === value.length - 1}
                  hoveredPath={hoveredPath}
                  onHover={onHover}
                  onCopy={onCopy}
                  highlightPath={highlightPath}
                />
                {'\n'}
              </span>
            ))}
            {pad}<span style={{ color: SYN.bracket }}>]{comma && <span style={{ color: SYN.comma }}>{comma}</span>}</span>
          </>
        )}
      </span>
    )
  }

  // Object
  if (typeof value === 'object') {
    const keys = Object.keys(value)
    if (keys.length === 0) {
      return (
        <span
          style={{ color: SYN.bracket, ...hoverStyle(path), ...highlightStyle }}
          onMouseEnter={() => onHover(path)}
          onMouseLeave={() => onHover('')}
          onClick={() => onCopy('{}')}
        >
          {'{}'}{comma && <span style={{ color: SYN.comma }}>{comma}</span>}
        </span>
      )
    }

    return (
      <span
        style={{ ...hoverStyle(path), ...highlightStyle }}
        onMouseEnter={(e) => { e.stopPropagation(); onHover(path) }}
        onMouseLeave={(e) => { e.stopPropagation(); onHover('') }}
        onClick={(e) => { e.stopPropagation(); onCopy(JSON.stringify(value, null, 2)) }}
      >
        <span
          style={{ color: SYN.bracket, cursor: 'pointer', userSelect: 'none' }}
          onClick={(e) => { e.stopPropagation(); setCollapsed(!collapsed) }}
        >
          {collapsed ? '▶ ' : '▼ '}{'{'}
        </span>
        {collapsed ? (
          <>
            <span style={{ color: SYN.comma, fontStyle: 'italic', opacity: 0.5 }}>{` ${keys.length} keys `}</span>
            <span style={{ color: SYN.bracket }}>{'}'}{comma && <span style={{ color: SYN.comma }}>{comma}</span>}</span>
          </>
        ) : (
          <>
            {'\n'}
            {keys.map((key, i) => {
              const childPath = `${path}["${key}"]`
              const childValue = value[key]
              const isLastKey = i === keys.length - 1
              return (
                <span key={key}>
                  {innerPad}
                  <span
                    style={{ color: SYN.key, ...hoverStyle(`${childPath}__key`), cursor: 'pointer' }}
                    onMouseEnter={(e) => { e.stopPropagation(); onHover(`${childPath}__key`) }}
                    onMouseLeave={(e) => { e.stopPropagation(); onHover('') }}
                    onClick={(e) => { e.stopPropagation(); onCopy(key) }}
                  >
                    &quot;{key}&quot;
                  </span>
                  <span style={{ color: SYN.comma }}>: </span>
                  <JsonNode
                    value={childValue}
                    path={childPath}
                    indent={indent + 1}
                    isLast={isLastKey}
                    hoveredPath={hoveredPath}
                    onHover={onHover}
                    onCopy={onCopy}
                    highlightPath={highlightPath}
                  />
                  {'\n'}
                </span>
              )
            })}
            {pad}<span style={{ color: SYN.bracket }}>{'}'}{comma && <span style={{ color: SYN.comma }}>{comma}</span>}</span>
          </>
        )}
      </span>
    )
  }

  return <span style={{ color: SYN.bracket }}>{String(value)}</span>
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ResponseViewer({ data, maxHeight = 500, highlightPath }: ResponseViewerProps) {
  const [mode, setMode] = useState<ViewMode>('json')
  const [hoveredPath, setHoveredPath] = useState('')
  const [showCopied, setShowCopied] = useState(false)

  const handleModeChange = (_: React.MouseEvent<HTMLElement>, newMode: ViewMode | null) => {
    if (newMode !== null) setMode(newMode)
  }

  const handleHover = useCallback((path: string) => {
    setHoveredPath(path)
  }, [])

  const handleCopy = useCallback((text: string) => {
    copyToClipboard(text)
    setShowCopied(true)
    setTimeout(() => setShowCopied(false), 1200)
  }, [])

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Mode toggle — top right */}
      <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 5 }}>
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={handleModeChange}
          size="small"
          sx={{
            bgcolor: 'rgba(255,255,255,0.06)',
            '& .MuiToggleButton-root': {
              color: '#888',
              borderColor: 'rgba(255,255,255,0.1)',
              px: 1,
              py: 0.25,
              fontSize: 11,
              textTransform: 'none',
              '&.Mui-selected': {
                color: '#ddd',
                bgcolor: 'rgba(255,255,255,0.1)',
              },
            },
          }}
        >
          <ToggleButton value="json">
            <Tooltip title="Interactive JSON">
              <DataObject sx={{ fontSize: 14, mr: 0.5 }} />
            </Tooltip>
            JSON
          </ToggleButton>
          <ToggleButton value="text">
            <Tooltip title="Plain text">
              <Code sx={{ fontSize: 14, mr: 0.5 }} />
            </Tooltip>
            Text
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Copied flash */}
      <CopiedFlash show={showCopied} />

      {/* Content area */}
      <Box
        sx={{
          fontFamily: MONO_FONT,
          fontSize: 12,
          lineHeight: 1.6,
          whiteSpace: 'pre',
          overflow: 'auto',
          p: 2,
          pt: 5,
          bgcolor: SYN.bg,
          borderRadius: 1,
          border: 1,
          borderColor: 'divider',
          maxHeight,
          color: SYN.bracket,
          userSelect: mode === 'text' ? 'text' : 'none',
        }}
        onContextMenu={mode === 'json' ? (e) => e.preventDefault() : undefined}
      >
        {mode === 'text' ? (
          <TextModeView data={data} highlightPath={highlightPath} />
        ) : (
          <JsonNode
            value={data}
            path=""
            indent={0}
            isLast
            hoveredPath={hoveredPath}
            onHover={handleHover}
            onCopy={handleCopy}
            highlightPath={highlightPath}
          />
        )}
      </Box>
    </Box>
  )
}
