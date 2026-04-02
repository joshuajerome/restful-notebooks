import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Chip, FormControl, InputLabel, MenuItem, Select, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Typography, Paper,
} from '@mui/material'
import api from '../api/client'
import { useWorkspaceStore } from '../store/workspaceStore'
import { METHOD_COLORS } from '../constants'

interface HistoryEntry {
  id: string
  method: string
  endpoint_name: string
  endpoint_path: string
  response_status: number
  duration_ms: number
  created_at: string
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  // TODO: Backend RequestHistory table doesn't have a workspace_id column,
  // so filtering by workspace is client-side only and currently a no-op.
  // Once the backend adds workspace_id, switch to server-side filtering.
  const [wsFilter, setWsFilter] = useState<string>('all')
  const navigate = useNavigate()
  const { workspaces } = useWorkspaceStore()

  useEffect(() => {
    api.get('/requests/history?limit=100').then((r) => setHistory(r.data))
  }, [])

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
        <Typography variant="h5">Request History</Typography>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Workspace</InputLabel>
          <Select
            value={wsFilter}
            label="Workspace"
            onChange={(e) => setWsFilter(e.target.value)}
          >
            <MenuItem value="all">All Workspaces</MenuItem>
            {workspaces.map((ws) => (
              <MenuItem key={ws.id} value={ws.id}>{ws.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Method</TableCell>
              <TableCell>Endpoint</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Time</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {history.map((entry) => (
              <TableRow key={entry.id} hover sx={{ cursor: 'pointer' }}
                onClick={() => navigate(`/app/request/${entry.endpoint_name}`)}>
                <TableCell>
                  <Chip label={entry.method} size="small"
                    sx={{ bgcolor: METHOD_COLORS[entry.method] || '#555', color: '#fff', fontWeight: 700, fontSize: 10, height: 20 }} />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={600} noWrap>{entry.endpoint_name}</Typography>
                  <Typography variant="body2" color="text.secondary" noWrap sx={{ fontSize: 11, fontFamily: 'monospace' }}>{entry.endpoint_path}</Typography>
                </TableCell>
                <TableCell>
                  <Chip label={entry.response_status} size="small"
                    color={entry.response_status >= 200 && entry.response_status < 300 ? 'success' : 'error'} sx={{ fontWeight: 700, fontSize: 11 }} />
                </TableCell>
                <TableCell><Typography variant="body2" color="text.secondary">{entry.duration_ms}ms</Typography></TableCell>
                <TableCell><Typography variant="body2" color="text.secondary" noWrap>{entry.created_at ? new Date(entry.created_at).toLocaleString() : ''}</Typography></TableCell>
              </TableRow>
            ))}
            {history.length === 0 && (
              <TableRow><TableCell colSpan={5} align="center"><Typography color="text.secondary" sx={{ py: 4 }}>No requests yet</Typography></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}
