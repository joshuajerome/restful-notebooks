import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Box, Chip, Typography, Stack, Button, IconButton, Tooltip, Paper,
  CircularProgress, Alert, TextField, InputAdornment,
} from '@mui/material'
import { Download, FolderOpen, Refresh, Search, PlaylistPlay } from '@mui/icons-material'
import api from '../api/client'

interface LogResponse {
  lines: string[]
  path: string
  total: number
}

function getLogColor(line: string): string | undefined {
  if (/\bERROR\b/i.test(line)) return 'error.main'
  if (/\bWARNING\b/i.test(line)) return 'warning.main'
  if (/\bDEBUG\b/i.test(line)) return 'text.disabled'
  return undefined
}

export default function ObservabilityPage() {
  const [lines, setLines] = useState<string[]>([])
  const [logPath, setLogPath] = useState('')
  const [totalLines, setTotalLines] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [autoScroll, setAutoScroll] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)

  const fetchLogs = useCallback(async () => {
    try {
      const res = await api.get<LogResponse>('/system/logs?tail=500')
      setLines(res.data.lines)
      setLogPath(res.data.path)
      setTotalLines(res.data.total ?? 0)
      setError(null)
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Failed to fetch logs')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLogs()
    const interval = setInterval(fetchLogs, 5000)
    return () => clearInterval(interval)
  }, [fetchLogs])

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [lines, autoScroll])

  const [levelFilter, setLevelFilter] = useState<Set<string>>(new Set(['ERROR', 'WARNING', 'INFO', 'DEBUG']))

  const toggleLevel = (level: string) => {
    setLevelFilter((prev) => {
      const next = new Set(prev)
      if (next.has(level)) next.delete(level)
      else next.add(level)
      return next
    })
  }

  const getLineLevel = (line: string): string => {
    if (/\bERROR\b/i.test(line)) return 'ERROR'
    if (/\bWARNING\b/i.test(line)) return 'WARNING'
    if (/\bDEBUG\b/i.test(line)) return 'DEBUG'
    return 'INFO'
  }

  const filteredLines = lines
    .filter((l) => levelFilter.has(getLineLevel(l)))
    .filter((l) => !filter || l.toLowerCase().includes(filter.toLowerCase()))

  const handleDownload = () => {
    const blob = new Blob([filteredLines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `postit-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleOpenLocation = async () => {
    if (!logPath) return
    // Try electronAPI first, fall back to clipboard
    const electron = (window as any).electronAPI
    if (electron?.showItemInFolder) {
      electron.showItemInFolder(logPath)
    } else {
      try {
        await navigator.clipboard.writeText(logPath)
      } catch {
        // silently ignore
      }
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h5">Observability</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {logPath && <>Log file: <code>{logPath}</code> &mdash; </>}
        {totalLines.toLocaleString()} total lines
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Filter logs..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          sx={{ flexGrow: 1, maxWidth: 400 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>
              ),
            },
          }}
        />
        {/* Level filters */}
        {(['ERROR', 'WARNING', 'INFO', 'DEBUG'] as const).map((level) => {
          const colors: Record<string, string> = { ERROR: '#F44336', WARNING: '#FF9800', INFO: '#2196F3', DEBUG: '#9E9E9E' }
          const active = levelFilter.has(level)
          return (
            <Chip key={level} label={level} size="small" onClick={() => toggleLevel(level)}
              sx={{
                fontSize: 10, height: 22, fontWeight: 700,
                bgcolor: active ? colors[level] + '33' : 'transparent',
                color: active ? colors[level] : '#555',
                border: '1px solid',
                borderColor: active ? colors[level] : 'divider',
                cursor: 'pointer',
              }} />
          )
        })}

        <Tooltip title={autoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF'}>
          <IconButton
            onClick={() => setAutoScroll((v) => !v)}
            color={autoScroll ? 'primary' : 'default'}
          >
            <PlaylistPlay />
          </IconButton>
        </Tooltip>
        <Tooltip title="Refresh">
          <IconButton onClick={fetchLogs}><Refresh /></IconButton>
        </Tooltip>
        <Button startIcon={<Download />} size="small" variant="outlined" onClick={handleDownload}>
          Download
        </Button>
        <Tooltip title={logPath ? `Open: ${logPath}` : 'No log path'}>
          <span>
            <Button
              startIcon={<FolderOpen />}
              size="small"
              variant="outlined"
              onClick={handleOpenLocation}
              disabled={!logPath}
            >
              Open Location
            </Button>
          </span>
        </Tooltip>
      </Stack>

      <Paper
        ref={containerRef}
        variant="outlined"
        sx={{
          bgcolor: '#0d1117',
          color: '#c9d1d9',
          fontFamily: 'monospace',
          fontSize: 12,
          lineHeight: 1.6,
          p: 2,
          overflow: 'auto',
          maxHeight: 'calc(100vh - 280px)',
          whiteSpace: 'pre',
        }}
      >
        {filteredLines.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
            {filter ? 'No matching log lines' : 'No logs available'}
          </Typography>
        ) : (
          filteredLines.map((line, i) => (
            <Box key={i} component="span" sx={{ display: 'block', color: getLogColor(line) }}>
              {line}
            </Box>
          ))
        )}
      </Paper>
    </Box>
  )
}
