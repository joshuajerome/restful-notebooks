import { useState, useCallback } from 'react'
import { Box, Menu, MenuItem, Typography } from '@mui/material'
import { useVariableStore } from '../store/variableStore'

interface Props {
  body: any
  source?: string
}

interface HoverInfo {
  path: string
  value: any
  mouseX: number
  mouseY: number
}

// VS Code dark theme colors (matches Monaco vs-dark / cutip-desktop InspectDrawer)
const SYN = {
  key: '#9CDCFE',       // property names
  string: '#CE9178',    // string values
  number: '#B5CEA8',    // number values
  boolean: '#569CD6',   // true/false
  null: '#569CD6',      // null
  bracket: '#D4D4D4',   // {} []
  comma: '#D4D4D4',     // , :
  bg: '#1E1E1E',        // background — VS Code editor bg
  hoverBg: 'rgba(29, 99, 237, 0.12)',
}

export default function ResponseViewer({ body, source = '' }: Props) {
  const [contextMenu, setContextMenu] = useState<HoverInfo | null>(null)
  const [hoveredPath, setHoveredPath] = useState<string>('')
  const { saveVariable } = useVariableStore()

  const handleContextMenu = useCallback((e: React.MouseEvent, path: string, value: any) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ path, value, mouseX: e.clientX, mouseY: e.clientY })
  }, [])

  const handleClose = () => setContextMenu(null)

  const handleCopyValue = () => {
    if (contextMenu) {
      const text = typeof contextMenu.value === 'string'
        ? contextMenu.value
        : JSON.stringify(contextMenu.value, null, 2)
      navigator.clipboard.writeText(text)
    }
    handleClose()
  }

  const handleCopyReference = () => {
    if (contextMenu) {
      navigator.clipboard.writeText(`response${contextMenu.path}`)
    }
    handleClose()
  }

  const handleSaveVariable = () => {
    if (contextMenu) {
      const name = contextMenu.path.replace(/[[\]"]/g, '_').replace(/^_+|_+$/g, '').replace(/_+/g, '_')
      const value = typeof contextMenu.value === 'string'
        ? contextMenu.value
        : JSON.stringify(contextMenu.value)
      saveVariable(name, value, source, `response${contextMenu.path}`)
    }
    handleClose()
  }

  const renderValue = (value: any, path: string, indent: number): JSX.Element => {
    const pad = '  '.repeat(indent)

    if (value === null) return <span style={{ color: SYN.null }}>null</span>
    if (typeof value === 'boolean') return <span style={{ color: SYN.boolean }}>{String(value)}</span>
    if (typeof value === 'number') return <span style={{ color: SYN.number }}>{value}</span>
    if (typeof value === 'string') {
      return (
        <span
          style={{ color: SYN.string, cursor: 'pointer' }}
          onContextMenu={(e) => handleContextMenu(e, path, value)}
          onClick={(e) => handleContextMenu(e, path, value)}
        >
          "{value}"
        </span>
      )
    }

    if (Array.isArray(value)) {
      if (value.length === 0) return <span style={{ color: SYN.bracket }}>[]</span>
      return (
        <span>
          <span style={{ color: SYN.bracket }}>{'[\n'}</span>
          {value.map((item, i) => (
            <span key={i}>
              {pad}{'  '}
              <span
                onMouseEnter={() => setHoveredPath(`${path}[${i}]`)}
                onMouseLeave={() => setHoveredPath('')}
                style={{
                  backgroundColor: hoveredPath === `${path}[${i}]` ? SYN.hoverBg : 'transparent',
                  borderRadius: 2,
                  cursor: 'pointer',
                }}
                onContextMenu={(e) => handleContextMenu(e, `${path}[${i}]`, item)}
              >
                {renderValue(item, `${path}[${i}]`, indent + 1)}
              </span>
              {i < value.length - 1 ? <span style={{ color: SYN.comma }}>,</span> : ''}
              {'\n'}
            </span>
          ))}
          {pad}<span style={{ color: SYN.bracket }}>{']'}</span>
        </span>
      )
    }

    if (typeof value === 'object') {
      const keys = Object.keys(value)
      if (keys.length === 0) return <span style={{ color: SYN.bracket }}>{'{}'}</span>
      return (
        <span
          onMouseEnter={() => setHoveredPath(path)}
          onMouseLeave={() => setHoveredPath('')}
          style={{
            backgroundColor: hoveredPath === path && path !== '' ? SYN.hoverBg : 'transparent',
            borderRadius: 2,
          }}
        >
          <span style={{ color: SYN.bracket }}>{'{\n'}</span>
          {keys.map((key, i) => (
            <span key={key}>
              {pad}{'  '}
              <span style={{ color: SYN.key }}>"{key}"</span>
              <span style={{ color: SYN.comma }}>: </span>
              <span
                style={{ cursor: 'pointer' }}
                onContextMenu={(e) => handleContextMenu(e, `${path}["${key}"]`, value[key])}
                onClick={(e) => {
                  if (typeof value[key] !== 'object' || value[key] === null) {
                    handleContextMenu(e, `${path}["${key}"]`, value[key])
                  }
                }}
              >
                {renderValue(value[key], `${path}["${key}"]`, indent + 1)}
              </span>
              {i < keys.length - 1 ? <span style={{ color: SYN.comma }}>,</span> : ''}
              {'\n'}
            </span>
          ))}
          {pad}<span style={{ color: SYN.bracket }}>{'}'}</span>
        </span>
      )
    }

    return <span>{String(value)}</span>
  }

  return (
    <Box>
      <Box
        sx={{
          fontFamily: '"Fira Code", "Consolas", "Courier New", monospace',
          fontSize: 12,
          lineHeight: 1.6,
          whiteSpace: 'pre',
          overflow: 'auto',
          p: 2,
          bgcolor: SYN.bg,
          borderRadius: 1,
          border: 1,
          borderColor: 'divider',
          maxHeight: 500,
          userSelect: 'text',
        }}
      >
        {renderValue(body, '', 0)}
      </Box>

      <Menu
        open={contextMenu !== null}
        onClose={handleClose}
        anchorReference="anchorPosition"
        anchorPosition={contextMenu ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined}
      >
        <MenuItem onClick={handleCopyValue} sx={{ fontSize: 13 }}>Copy value</MenuItem>
        <MenuItem onClick={handleCopyReference} sx={{ fontSize: 13 }}>Copy reference</MenuItem>
        <MenuItem onClick={handleSaveVariable} sx={{ fontSize: 13 }}>Save to variables</MenuItem>
      </Menu>
    </Box>
  )
}
