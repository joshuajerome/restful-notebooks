import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Button, Checkbox, Chip, FormControl, InputLabel, MenuItem, Select, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Tooltip, Typography, Paper,
} from '@mui/material'
import { AutoStories } from '@mui/icons-material'
import api from '../api/client'
import { useWorkspaceStore } from '../store/workspaceStore'
import { useNotebookStore } from '../store/notebookStore'
import { useNotificationStore } from '../store/notificationStore'
import { METHOD_COLORS } from '../constants'

interface HistoryEntry {
  id: string
  method: string
  endpoint_name: string
  endpoint_path: string
  response_status: number
  duration_ms: number
  created_at: string
  workspace_name?: string
  notebook_name?: string
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [wsFilter, setWsFilter] = useState<string>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const navigate = useNavigate()
  const { workspaces, active } = useWorkspaceStore()
  const { create: createNotebook, setEditing } = useNotebookStore()
  const { add: notify } = useNotificationStore()

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSaveAsNotebook = () => {
    if (selected.size === 0 || !active) return
    const entries = history.filter((e) => selected.has(e.id))
    const nb = createNotebook(`From History (${entries.length} requests)`, active.id)

    // Add request blocks from selected entries
    const { addBlock, updateBlock } = useNotebookStore.getState()
    setEditing(nb)
    for (const entry of entries) {
      addBlock('request')
      const blocks = useNotebookStore.getState().editing?.blocks || []
      const last = blocks[blocks.length - 1]
      if (last) {
        updateBlock(last.id, {
          method: entry.method,
          endpointName: entry.endpoint_name,
          endpointPath: entry.endpoint_path,
          description: `From history: ${entry.method} ${entry.endpoint_name}`,
        })
      }
    }

    notify(`Created notebook with ${entries.length} requests`, 'success')
    setSelected(new Set())
    navigate('/app/notebooks')
  }

  useEffect(() => {
    const params = new URLSearchParams({ limit: '100' })
    if (wsFilter !== 'all') {
      const ws = workspaces.find((w) => w.id === wsFilter)
      if (ws) params.set('workspace', ws.name)
    }
    api.get(`/requests/history?${params.toString()}`).then((r) => setHistory(r.data))
  }, [wsFilter])

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
        <Typography variant="h5">Request History</Typography>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Workspace</InputLabel>
          <Select value={wsFilter} label="Workspace" onChange={(e) => setWsFilter(e.target.value)}>
            <MenuItem value="all">All Workspaces</MenuItem>
            {workspaces.map((ws) => (
              <MenuItem key={ws.id} value={ws.id}>{ws.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box sx={{ flex: 1 }} />
        {selected.size > 0 && (
          <Tooltip title="Create a notebook from selected requests">
            <Button size="small" variant="outlined" startIcon={<AutoStories sx={{ fontSize: 16 }} />}
              onClick={handleSaveAsNotebook} disabled={!active}>
              Save as Notebook ({selected.size})
            </Button>
          </Tooltip>
        )}
      </Stack>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" sx={{ width: 40 }} />
              <TableCell>Method</TableCell>
              <TableCell>Endpoint</TableCell>
              <TableCell>Workspace</TableCell>
              <TableCell>Notebook</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Time</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {history.map((entry) => {
              const matchedWs = entry.workspace_name ? workspaces.find((w) => w.name === entry.workspace_name) : null
              const wsColor = matchedWs?.color || '#888'
              return (
                <TableRow key={entry.id} hover sx={{ cursor: 'pointer' }}>
                  <TableCell padding="checkbox">
                    <Checkbox size="small" checked={selected.has(entry.id)}
                      onChange={() => toggleSelect(entry.id)} onClick={(e) => e.stopPropagation()} />
                  </TableCell>
                  <TableCell onClick={() => entry.notebook_name ? navigate('/app/notebooks') : navigate(`/app/request/${entry.endpoint_name}`)}>
                    <Chip label={entry.method} size="small"
                      sx={{ bgcolor: METHOD_COLORS[entry.method] || '#555', color: '#fff', fontWeight: 700, fontSize: 10, height: 20 }} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600} noWrap>{entry.endpoint_name}</Typography>
                    <Typography variant="body2" color="text.secondary" noWrap sx={{ fontSize: 11, fontFamily: 'monospace' }}>{entry.endpoint_path}</Typography>
                  </TableCell>
                  <TableCell>
                    {entry.workspace_name ? (
                      <Chip label={entry.workspace_name} size="small"
                        sx={{ bgcolor: `${wsColor}22`, color: wsColor, fontWeight: 600, fontSize: 10, height: 20, border: '1px solid', borderColor: wsColor }} />
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {entry.notebook_name ? (
                      <Typography variant="body2" color="text.secondary" noWrap sx={{ fontSize: 12 }}>{entry.notebook_name}</Typography>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Chip label={entry.response_status} size="small"
                      color={entry.response_status >= 200 && entry.response_status < 300 ? 'success' : 'error'} sx={{ fontWeight: 700, fontSize: 11 }} />
                  </TableCell>
                  <TableCell><Typography variant="body2" color="text.secondary">{entry.duration_ms}ms</Typography></TableCell>
                  <TableCell><Typography variant="body2" color="text.secondary" noWrap>{entry.created_at ? new Date(entry.created_at).toLocaleString() : ''}</Typography></TableCell>
                </TableRow>
              )
            })}
            {history.length === 0 && (
              <TableRow><TableCell colSpan={8} align="center"><Typography color="text.secondary" sx={{ py: 4 }}>No requests yet</Typography></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}
