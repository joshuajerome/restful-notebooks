import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  alpha, Box, Button, Card, CardContent, Chip, Dialog, DialogActions,
  DialogContent, DialogTitle, IconButton, Stack, TextField, Tooltip, Typography,
} from '@mui/material'
import { Add, CheckCircle, Edit, Settings } from '@mui/icons-material'
import { useWorkspaceStore, Workspace, WORKSPACE_COLORS } from '../store/workspaceStore'
import { useNotificationStore } from '../store/notificationStore'
import { useAuditStore } from '../store/auditStore'

// Polkadot background pattern
const POLKADOT_BG = `radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)`
const POLKADOT_SIZE = '24px 24px'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { workspaces, active, activeId, setActive, create, update, remove, duplicate } = useWorkspaceStore()
  const { add: notify } = useNotificationStore()
  const { log: audit } = useAuditStore()
  const [editMode, setEditMode] = useState(false)
  const [selectedWs, setSelectedWs] = useState<Workspace | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newName, setNewName] = useState('')

  const handleCardClick = (ws: Workspace) => {
    if (editMode) return
    setSelectedWs(ws)
  }

  const handleActivate = (ws: Workspace) => {
    setActive(ws.id)
    notify(`"${ws.name}" is now the active workspace`, 'success')
    setSelectedWs(null)
  }

  const handleConfigure = (ws: Workspace) => {
    setActive(ws.id)
    setSelectedWs(null)
    navigate('/app/workspaces')
  }

  const handleColorChange = (ws: Workspace, color: string) => {
    update(ws.id, { color })
  }

  const handleCreate = () => {
    const ws = create(newName || 'untitled')
    setNewName('')
    setDialogOpen(false)
    notify(`Workspace "${ws.name}" created`, 'success')
  }

  return (
    <Box sx={{
      minHeight: '100%',
      backgroundImage: POLKADOT_BG,
      backgroundSize: POLKADOT_SIZE,
    }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h5">Dashboard</Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant={editMode ? 'contained' : 'outlined'}
            size="small"
            startIcon={<Edit />}
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? 'Done' : 'Edit'}
          </Button>
          <Button variant="contained" size="small" startIcon={<Add />}
            onClick={() => { setNewName(''); setDialogOpen(true) }}>
            New Workspace
          </Button>
        </Stack>
      </Stack>

      {workspaces.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>No workspaces</Typography>
          <Button variant="contained" startIcon={<Add />} onClick={() => setDialogOpen(true)}>Create</Button>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {workspaces.map((ws) => (
            <Card key={ws.id}
              sx={{
                width: 240, cursor: editMode ? 'grab' : 'pointer',
                borderLeft: `4px solid ${ws.color}`,
                outline: ws.id === activeId ? `2px solid ${ws.color}` : 'none',
                outlineOffset: 2,
              }}
              onClick={() => handleCardClick(ws)}
            >
              <CardContent sx={{ pb: '12px !important' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="h6" sx={{ fontSize: 14 }}>{ws.name}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: 11 }}>
                      {ws.apis.length} API{ws.apis.length !== 1 ? 's' : ''} — {ws.apis.map((a) => a.plugin).join(', ')}
                    </Typography>
                  </Box>
                  {ws.id === activeId && (
                    <Chip label="active" size="small" sx={{ bgcolor: alpha(ws.color, 0.15), color: ws.color, fontSize: 10, height: 18 }} />
                  )}
                </Stack>

                {editMode && (
                  <Stack direction="row" spacing={0.5} sx={{ mt: 1.5 }}>
                    {WORKSPACE_COLORS.map((c) => (
                      <Box key={c} onClick={(e) => { e.stopPropagation(); handleColorChange(ws, c) }}
                        sx={{
                          width: 16, height: 16, borderRadius: '50%', bgcolor: c, cursor: 'pointer',
                          border: ws.color === c ? '2px solid #fff' : '2px solid transparent',
                        }}
                      />
                    ))}
                  </Stack>
                )}

                {editMode && (
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Button size="small" onClick={(e) => { e.stopPropagation(); duplicate(ws.id); notify(`Duplicated "${ws.name}"`, 'info') }}>
                      Duplicate
                    </Button>
                    <Button size="small" color="error" onClick={(e) => { e.stopPropagation(); remove(ws.id); notify(`Deleted "${ws.name}"`, 'info') }}>
                      Delete
                    </Button>
                  </Stack>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Workspace popup */}
      <Dialog open={!!selectedWs && !editMode} onClose={() => setSelectedWs(null)} maxWidth="xs" fullWidth>
        {selectedWs && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: selectedWs.color }} />
              {selectedWs.name}
            </DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {selectedWs.apis.length} API{selectedWs.apis.length !== 1 ? 's' : ''}: {selectedWs.apis.map((a) => a.name).join(', ')}
              </Typography>
              <Typography variant="body2" color="text.secondary" fontSize={11}>
                Created {new Date(selectedWs.created).toLocaleDateString()}
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button variant="contained" startIcon={<Settings />} onClick={() => handleConfigure(selectedWs)}>
                Configure
              </Button>
              <Button variant="contained" color="success" startIcon={<CheckCircle />}
                onClick={() => handleActivate(selectedWs)}>
                Set as Active
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Create dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Workspace</DialogTitle>
        <DialogContent>
          <TextField size="small" label="Name" placeholder="my-project" value={newName}
            onChange={(e) => setNewName(e.target.value)} fullWidth autoFocus sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}>Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
