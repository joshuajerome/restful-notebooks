import { useEffect } from 'react'
import {
  Box, Button, Chip, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography, Paper,
} from '@mui/material'
import { DeleteSweep } from '@mui/icons-material'
import { useAuditStore, AuditEventType } from '../store/auditStore'

const TYPE_COLORS: Record<string, string> = {
  workspace_created: '#38A169',
  workspace_deleted: '#C53030',
  workspace_updated: '#C77D1A',
  workspace_switched: '#3B7DD8',
  api_added: '#38A169',
  api_removed: '#C53030',
  api_updated: '#C77D1A',
  request_sent: '#3B7DD8',
  variable_added: '#38A169',
  variable_removed: '#C53030',
  session_start: '#319795',
  session_change: '#805AD5',
}

const TYPE_LABELS: Record<string, string> = {
  workspace_created: 'WS Created',
  workspace_deleted: 'WS Deleted',
  workspace_updated: 'WS Updated',
  workspace_switched: 'WS Switched',
  api_added: 'API Added',
  api_removed: 'API Removed',
  api_updated: 'API Updated',
  request_sent: 'Request',
  variable_added: 'Var Added',
  variable_removed: 'Var Removed',
  session_start: 'Session Start',
  session_change: 'Session Change',
}

export default function AuditLogPage() {
  const { events, load, clear } = useAuditStore()

  useEffect(() => { load() }, [])

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5">Audit Log</Typography>
        <Button size="small" startIcon={<DeleteSweep />} onClick={clear} color="error">
          Clear Log
        </Button>
      </Stack>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width={140}>Type</TableCell>
              <TableCell>Message</TableCell>
              <TableCell width={80}>Details</TableCell>
              <TableCell width={160}>Time</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {events.map((e) => (
              <TableRow key={e.id} hover>
                <TableCell>
                  <Chip label={TYPE_LABELS[e.type] || e.type} size="small"
                    sx={{ bgcolor: TYPE_COLORS[e.type] || '#555', color: '#fff', fontWeight: 600, fontSize: 10, height: 20 }} />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontSize={13}>{e.message}</Typography>
                </TableCell>
                <TableCell>
                  {e.details && <Typography variant="body2" color="text.secondary" fontSize={11} noWrap>{e.details}</Typography>}
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary" fontSize={11}>
                    {new Date(e.timestamp).toLocaleString()}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
            {events.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <Typography color="text.secondary" sx={{ py: 4 }}>No audit events recorded</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}
