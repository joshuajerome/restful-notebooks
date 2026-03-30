import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  alpha, Autocomplete, Box, Button, Card, CardContent, Chip, Dialog,
  DialogActions, DialogContent, DialogTitle, Divider, FormControl,
  IconButton, MenuItem, Select, Stack, TextField, Tooltip, Typography,
} from '@mui/material'
import {
  Add, ArrowDownward, ArrowUpward, ContentCopy, Delete, Edit,
  MoreVert, PlayArrow, Save, Settings,
} from '@mui/icons-material'
import { useWorkflowStore, Workflow, WorkflowStep } from '../store/workflowStore'
import { useWorkspaceStore } from '../store/workspaceStore'
import { useEndpointStore, EndpointInfo } from '../store/endpointStore'
import { useNotificationStore } from '../store/notificationStore'
import { METHOD_COLORS } from '../constants'

const POLKADOT_BG = `radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)`

function StepEditor({
  step, index, total, endpoints,
  onUpdate, onRemove, onMove,
}: {
  step: WorkflowStep; index: number; total: number; endpoints: EndpointInfo[]
  onUpdate: (patch: Partial<WorkflowStep>) => void
  onRemove: () => void
  onMove: (dir: 'up' | 'down') => void
}) {
  const selectedEp = endpoints.find((e) => e.name === step.endpointName) || null

  return (
    <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'background.default', mb: 1.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Chip label={`Step ${index + 1}`} size="small"
            sx={{ bgcolor: METHOD_COLORS[step.method] || '#555', color: '#fff', fontWeight: 700, fontSize: 11 }} />
          <Typography fontSize={13} fontWeight={500} color="text.secondary">
            {step.description || step.endpointName || 'Unconfigured'}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.5}>
          <IconButton size="small" disabled={index === 0} onClick={() => onMove('up')}><ArrowUpward sx={{ fontSize: 16 }} /></IconButton>
          <IconButton size="small" disabled={index === total - 1} onClick={() => onMove('down')}><ArrowDownward sx={{ fontSize: 16 }} /></IconButton>
          <IconButton size="small" color="error" onClick={onRemove}><Delete sx={{ fontSize: 16 }} /></IconButton>
        </Stack>
      </Stack>

      <Stack spacing={1.5}>
        <TextField size="small" label="Description" placeholder="e.g. Get blueprint catalog" fullWidth
          value={step.description} onChange={(e) => onUpdate({ description: e.target.value })} />

        <Stack direction="row" spacing={1}>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <Select value={step.method} onChange={(e) => onUpdate({ method: e.target.value })}>
              {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map((m) => (
                <MenuItem key={m} value={m}><Chip label={m} size="small" sx={{ bgcolor: METHOD_COLORS[m] || '#555', color: '#fff', fontWeight: 700, fontSize: 10, height: 20 }} /></MenuItem>
              ))}
            </Select>
          </FormControl>
          <Autocomplete size="small" sx={{ flex: 1 }} options={endpoints} value={selectedEp}
            onChange={(_, ep) => ep && onUpdate({ endpointName: ep.name, endpointPath: ep.path })}
            getOptionLabel={(ep) => ep.display_name || ep.name}
            filterOptions={(opts, { inputValue }) => {
              const s = inputValue.toLowerCase()
              return opts.filter((ep) => ep.name.toLowerCase().includes(s) || ep.display_name.toLowerCase().includes(s))
            }}
            renderInput={(p) => <TextField {...p} placeholder="Select endpoint..." />}
          />
        </Stack>

        {/* Data mapping from previous step */}
        {index > 0 && (
          <Box sx={{ p: 1.5, border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 11, mb: 1 }}>
              Data mapping from previous step
            </Typography>
            <Stack spacing={1}>
              <TextField size="small" label="Extract path" placeholder='response["BlueprintTemplate"][0]'
                value={step.extractFrom || ''} onChange={(e) => onUpdate({ extractFrom: e.target.value })} />
              <Stack direction="row" spacing={1}>
                <TextField size="small" label="Key to extract" placeholder="BlueprintTemplateId" sx={{ flex: 1 }}
                  value={step.extractKey || ''} onChange={(e) => onUpdate({ extractKey: e.target.value })} />
                <TextField size="small" label="Inject as" placeholder="payload.GpuBlueprintCatalogId" sx={{ flex: 1 }}
                  value={step.injectAs || ''} onChange={(e) => onUpdate({ injectAs: e.target.value })} />
              </Stack>
            </Stack>
          </Box>
        )}

        {step.method !== 'GET' && (
          <TextField size="small" label="Payload" multiline rows={3} fullWidth
            value={step.payload} onChange={(e) => onUpdate({ payload: e.target.value })}
            InputProps={{ sx: { fontFamily: 'monospace', fontSize: 12 } }}
          />
        )}
      </Stack>
    </Box>
  )
}

export default function WorkflowsPage() {
  const navigate = useNavigate()
  const { workflows, editing, load, create, remove, duplicate, setEditing, addStep, updateStep, removeStep, moveStep, saveEditing, cancelEditing } = useWorkflowStore()
  const { active } = useWorkspaceStore()
  const { endpoints, fetchEndpoints } = useEndpointStore()
  const { add: notify } = useNotificationStore()
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [menuWf, setMenuWf] = useState<Workflow | null>(null)

  useEffect(() => { load(); fetchEndpoints() }, [])

  const wsWorkflows = workflows.filter((w) => !active || w.workspaceId === active.id)

  const handleCreate = () => {
    if (!active) return
    const wf = create(newName || 'Untitled Workflow', active.id)
    setCreateOpen(false)
    setNewName('')
    setEditing(wf)
    notify(`Workflow "${wf.name}" created`, 'success')
  }

  const handleSave = () => {
    saveEditing()
    notify('Workflow saved', 'success')
  }

  // If editing, show the editor
  if (editing) {
    return (
      <Box>
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.5 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
            workspaces / {active?.name || 'none'}
          </Typography>
          <Tooltip title="Configure workspace">
            <IconButton size="small" onClick={() => navigate('/app/workspaces')} sx={{ color: 'text.secondary' }}>
              <Settings sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </Stack>

        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Typography variant="h5">Edit Workflow</Typography>
            <TextField size="small" value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              sx={{ '& input': { fontSize: 14, fontWeight: 600 } }}
            />
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button onClick={cancelEditing}>Cancel</Button>
            <Button variant="contained" startIcon={<Save />} onClick={handleSave}>Save</Button>
          </Stack>
        </Stack>

        {/* Steps */}
        {editing.steps.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4, border: '1px dashed', borderColor: 'divider', borderRadius: 1, mb: 2 }}>
            <Typography color="text.secondary" sx={{ mb: 1 }}>No steps yet</Typography>
            <Button startIcon={<Add />} onClick={() => addStep()}>Add First Step</Button>
          </Box>
        ) : (
          editing.steps.map((step, i) => (
            <StepEditor key={step.id} step={step} index={i} total={editing.steps.length}
              endpoints={endpoints}
              onUpdate={(patch) => updateStep(step.id, patch)}
              onRemove={() => removeStep(step.id)}
              onMove={(dir) => moveStep(step.id, dir)}
            />
          ))
        )}

        {editing.steps.length > 0 && (
          <Button startIcon={<Add />} onClick={() => addStep()} sx={{ mt: 1 }}>
            Add Step
          </Button>
        )}

        {/* Visual flow preview */}
        {editing.steps.length > 1 && (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 1.5, fontSize: 12 }}>Flow Preview</Typography>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ overflowX: 'auto' }}>
              {editing.steps.map((step, i) => (
                <Stack key={step.id} direction="row" alignItems="center" spacing={1}>
                  <Chip
                    label={`${step.method} ${step.endpointName || '?'}`}
                    size="small"
                    sx={{ bgcolor: METHOD_COLORS[step.method] || '#555', color: '#fff', fontWeight: 600, fontSize: 11 }}
                  />
                  {i < editing.steps.length - 1 && (
                    <Typography color="text.secondary" fontSize={16}>→</Typography>
                  )}
                </Stack>
              ))}
            </Stack>
          </Box>
        )}
      </Box>
    )
  }

  // Canvas view
  return (
    <Box sx={{ minHeight: '100%', backgroundImage: POLKADOT_BG, backgroundSize: '24px 24px' }}>
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
          workspaces / {active?.name || 'none'}
        </Typography>
        <Tooltip title="Configure workspace">
          <IconButton size="small" onClick={() => navigate('/app/workspaces')} sx={{ color: 'text.secondary' }}>
            <Settings sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      </Stack>

      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h5">Workflows</Typography>
        <Button variant="contained" size="small" startIcon={<Add />}
          disabled={!active}
          onClick={() => { setNewName(''); setCreateOpen(true) }}>
          New Workflow
        </Button>
      </Stack>

      {wsWorkflows.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>No workflows yet</Typography>
          <Button variant="contained" startIcon={<Add />} disabled={!active}
            onClick={() => setCreateOpen(true)}>Create Workflow</Button>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {wsWorkflows.map((wf) => (
            <Card key={wf.id} sx={{ width: 280, cursor: 'pointer' }}
              onClick={() => setEditing(wf)}>
              <CardContent sx={{ pb: '12px !important' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="h6" sx={{ fontSize: 14 }}>{wf.name}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: 11 }}>
                      {wf.steps.length} step{wf.steps.length !== 1 ? 's' : ''}
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); setMenuWf(wf); setMenuAnchor(e.currentTarget) }}>
                    <MoreVert sx={{ fontSize: 16 }} />
                  </IconButton>
                </Stack>
                {/* Flow preview in card */}
                {wf.steps.length > 0 && (
                  <Stack direction="row" spacing={0.5} sx={{ mt: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
                    {wf.steps.map((step, i) => (
                      <Stack key={step.id} direction="row" alignItems="center" spacing={0.5}>
                        <Chip label={step.method} size="small"
                          sx={{ bgcolor: METHOD_COLORS[step.method] || '#555', color: '#fff', fontWeight: 700, fontSize: 9, height: 18 }} />
                        {i < wf.steps.length - 1 && <Typography fontSize={11} color="text.secondary">→</Typography>}
                      </Stack>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Context menu */}
      {menuAnchor && (
        <Box>
          <Box sx={{ position: 'fixed', inset: 0, zIndex: 1300 }} onClick={() => setMenuAnchor(null)} />
          <Box sx={{
            position: 'fixed', top: (menuAnchor as any).getBoundingClientRect().bottom,
            left: (menuAnchor as any).getBoundingClientRect().left,
            zIndex: 1301, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 1, py: 0.5,
          }}>
            <MenuItem sx={{ fontSize: 13 }} onClick={() => { if (menuWf) { setEditing(menuWf); setMenuAnchor(null) } }}>
              <Edit sx={{ fontSize: 16, mr: 1 }} /> Edit
            </MenuItem>
            <MenuItem sx={{ fontSize: 13 }} onClick={() => { if (menuWf) { duplicate(menuWf.id); notify(`Duplicated "${menuWf.name}"`, 'info') }; setMenuAnchor(null) }}>
              <ContentCopy sx={{ fontSize: 16, mr: 1 }} /> Duplicate
            </MenuItem>
            <MenuItem sx={{ fontSize: 13, color: 'error.main' }} onClick={() => { if (menuWf) { remove(menuWf.id); notify(`Deleted "${menuWf.name}"`, 'info') }; setMenuAnchor(null) }}>
              <Delete sx={{ fontSize: 16, mr: 1 }} /> Delete
            </MenuItem>
          </Box>
        </Box>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Workflow</DialogTitle>
        <DialogContent>
          <TextField size="small" label="Name" placeholder="Create GPU Infrastructure"
            value={newName} onChange={(e) => setNewName(e.target.value)} fullWidth autoFocus sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}>Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
