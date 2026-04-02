import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  alpha, Autocomplete, Box, Button, Card, CardContent, Chip, Dialog,
  DialogActions, DialogContent, DialogTitle, FormControl, IconButton,
  InputLabel, List, ListItemButton, ListItemText, MenuItem, Select,
  Stack, Tab, Tabs, TextField, Tooltip, Typography,
} from '@mui/material'
import {
  Add, ArrowDownward, ArrowUpward, Block, CheckCircle, ContentCopy,
  Delete, Edit, MoreVert, PlayArrow, Save, Settings,
} from '@mui/icons-material'
import { useWorkflowStore, Workflow, WorkflowStep, ExtractMode } from '../store/workflowStore'
import { useWorkspaceStore } from '../store/workspaceStore'
import { useEndpointStore } from '../store/endpointStore'
import { useNotificationStore } from '../store/notificationStore'
import { METHOD_COLORS } from '../constants'
import SyntaxEditor from '../components/SyntaxEditor'
import ResponseViewer from '../components/ResponseViewer'
import api from '../api/client'

const POLKADOT_BG = `radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)`

/**
 * Safely traverse a JSON object using a path like: response["BlueprintTemplate"][0]["Id"]
 * No eval or Function constructor — parses the path string into keys.
 */
function resolveJsonPath(obj: any, path: string): any {
  // Parse path: response["key"][0]["nested"] → ["key", 0, "nested"]
  const cleaned = path.replace(/^response/, '')
  const keys: (string | number)[] = []
  const re = /\["([^"]+)"\]|\[(\d+)\]|\.(\w+)/g
  let match
  while ((match = re.exec(cleaned)) !== null) {
    if (match[1] !== undefined) keys.push(match[1])
    else if (match[2] !== undefined) keys.push(parseInt(match[2], 10))
    else if (match[3] !== undefined) keys.push(match[3])
  }
  let current = obj
  for (const key of keys) {
    if (current == null) throw new Error(`Cannot access "${key}" on null/undefined`)
    current = current[key]
  }
  return current
}

const PYTHON_TEMPLATE = `def extract(response: dict) -> dict:
    """
    Extract data from the previous step's response.
    response is a JSON dict. Return a dict of variables.
    """
    return {
        # "blueprint_id": response["BlueprintTemplate"][0]["BlueprintTemplateId"],
    }
`

function KeyValueEditorCompact({ entries, onChange, label }: {
  entries: Record<string, string>; onChange: (e: Record<string, string>) => void; label: string
}) {
  const keys = Object.keys(entries)
  return (
    <Box>
      {keys.map((key, i) => (
        <Stack direction="row" spacing={0.5} key={i} sx={{ mb: 0.5 }} alignItems="center">
          <TextField size="small" placeholder="Key" value={key} sx={{ flex: 1 }}
            onChange={(e) => { const n: Record<string, string> = {}; for (const [k, v] of Object.entries(entries)) n[k === key ? e.target.value : k] = v; onChange(n) }} />
          <TextField size="small" placeholder="Value (or {{var}})" value={entries[key]} sx={{ flex: 1 }}
            onChange={(e) => onChange({ ...entries, [key]: e.target.value })} />
          <IconButton size="small" color="error" onClick={() => { const { [key]: _, ...r } = entries; onChange(r) }}>
            <Delete sx={{ fontSize: 16 }} />
          </IconButton>
        </Stack>
      ))}
      <Button size="small" onClick={() => onChange({ ...entries, '': '' })}>+ {label}</Button>
    </Box>
  )
}

function StepEditor({
  step, index, total, endpoints, variables, baseUrl, onUpdate, onRemove, onMove, onRun,
}: {
  step: WorkflowStep; index: number; total: number; endpoints: any[]; variables: Record<string, string>; baseUrl: string
  onUpdate: (patch: Partial<WorkflowStep>) => void
  onRemove: () => void; onMove: (dir: 'up' | 'down') => void; onRun: () => void
}) {
  const selectedEp = endpoints.find((e: any) => e.name === step.endpointName) || null
  const [tab, setTab] = useState(0)

  return (
    <Box sx={{
      p: 2, border: 1, borderRadius: 1, mb: 1.5,
      borderColor: step.commented ? 'divider' : 'divider',
      bgcolor: step.commented ? alpha('#000', 0.3) : 'background.paper',
      opacity: step.commented ? 0.5 : 1,
      position: 'relative',
    }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Chip label={`Step ${index + 1}`} size="small"
            sx={{ bgcolor: step.commented ? '#555' : (METHOD_COLORS[step.method] || '#555'), color: '#fff', fontWeight: 700, fontSize: 11 }} />
          <Typography fontSize={13} fontWeight={500} color="text.secondary">
            {step.description || step.endpointName || 'Unconfigured'}
          </Typography>
          {step.commented && <Chip label="commented out" size="small" variant="outlined" sx={{ fontSize: 10, height: 18 }} />}
        </Stack>
        <Stack direction="row" spacing={0.5}>
          <Tooltip title={step.commented ? 'Uncomment' : 'Comment out'}>
            <IconButton size="small" onClick={() => onUpdate({ commented: !step.commented })}>
              {step.commented ? <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} /> : <Block sx={{ fontSize: 16 }} />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Run this step">
            <IconButton size="small" color="primary" onClick={onRun} disabled={step.commented || !step.endpointName}>
              <PlayArrow sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <IconButton size="small" disabled={index === 0} onClick={() => onMove('up')}><ArrowUpward sx={{ fontSize: 16 }} /></IconButton>
          <IconButton size="small" disabled={index === total - 1} onClick={() => onMove('down')}><ArrowDownward sx={{ fontSize: 16 }} /></IconButton>
          <IconButton size="small" color="error" onClick={onRemove}><Delete sx={{ fontSize: 16 }} /></IconButton>
        </Stack>
      </Stack>

      {!step.commented && (
        <Stack spacing={1.5}>
          <TextField size="small" label="Description" fullWidth value={step.description}
            onChange={(e) => onUpdate({ description: e.target.value })} />

          <Stack direction="row" spacing={1}>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <Select value={step.method} onChange={(e) => onUpdate({ method: e.target.value })}>
                {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map((m) => (
                  <MenuItem key={m} value={m}><Chip label={m} size="small" sx={{ bgcolor: METHOD_COLORS[m] || '#555', color: '#fff', fontWeight: 700, fontSize: 10, height: 20 }} /></MenuItem>
                ))}
              </Select>
            </FormControl>
            <Autocomplete size="small" sx={{ flex: 1 }} options={endpoints} value={selectedEp}
              onChange={(_: any, ep: any) => ep && onUpdate({ endpointName: ep.name, endpointPath: ep.path })}
              getOptionLabel={(ep: any) => `${ep.display_name || ep.name}  —  ${ep.path}`}
              filterOptions={(opts: any[], { inputValue }: any) => {
                const s = inputValue.toLowerCase()
                return opts.filter((ep: any) => ep.name.toLowerCase().includes(s) || ep.display_name.toLowerCase().includes(s) || ep.path.toLowerCase().includes(s))
              }}
              renderOption={(props: any, ep: any) => (
                <Box component="li" {...props} key={ep.name}>
                  <Stack direction="row" spacing={0.5} sx={{ width: 60, minWidth: 60 }}>
                    {ep.methods.map((m: string) => (
                      <Box key={m} sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: METHOD_COLORS[m] || '#555' }} />
                    ))}
                  </Stack>
                  <Typography fontSize={13} fontWeight={500} sx={{ mr: 1 }}>{ep.display_name || ep.name}</Typography>
                  <Typography fontSize={11} color="text.secondary" fontFamily="monospace" noWrap>{ep.path}</Typography>
                </Box>
              )}
              renderInput={(p: any) => <TextField {...p} placeholder="Select endpoint..." />}
            />
          </Stack>

          {/* Full URL preview */}
          {step.endpointPath && (
            <Typography variant="body2" fontFamily="monospace" sx={{ fontSize: 11, color: 'text.secondary', bgcolor: 'background.default', px: 1.5, py: 0.5, borderRadius: 1 }}>
              {baseUrl || '<base_url>'}{step.endpointPath}
            </Typography>
          )}

          {/* Tabs for Params / Query / Payload / Extract */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ minHeight: 30 }}>
              <Tab label="Params" sx={{ minHeight: 30, fontSize: 11, textTransform: 'none', py: 0 }} />
              <Tab label="Query" sx={{ minHeight: 30, fontSize: 11, textTransform: 'none', py: 0 }} />
              {step.method !== 'GET' && <Tab label="Payload" sx={{ minHeight: 30, fontSize: 11, textTransform: 'none', py: 0 }} />}
              {index > 0 && <Tab label="Extract Data" sx={{ minHeight: 30, fontSize: 11, textTransform: 'none', py: 0 }} />}
            </Tabs>
          </Box>

          {tab === 0 && <KeyValueEditorCompact entries={step.params} onChange={(p) => onUpdate({ params: p })} label="param" />}
          {tab === 1 && <KeyValueEditorCompact entries={step.query} onChange={(q) => onUpdate({ query: q })} label="query" />}
          {tab === 2 && step.method !== 'GET' && (
            <SyntaxEditor value={step.payload} onChange={(v) => onUpdate({ payload: v })} language="json" rows={4}
              placeholder='{\n    "Name": "{{blueprint_name}}"\n}' />
          )}
          {/* Extract data — only for steps after the first */}
          {index > 0 && ((step.method !== 'GET' && tab === 3) || (step.method === 'GET' && tab === 2)) && (
            <Box>
              <FormControl size="small" sx={{ mb: 1.5, minWidth: 200 }}>
                <InputLabel>Extract Mode</InputLabel>
                <Select value={step.extractMode} label="Extract Mode"
                  onChange={(e) => onUpdate({ extractMode: e.target.value as ExtractMode })}>
                  <MenuItem value="none">None</MenuItem>
                  <MenuItem value="reference">Reference Path</MenuItem>
                  <MenuItem value="python">Python Function</MenuItem>
                </Select>
              </FormControl>

              {step.extractMode === 'reference' && (
                <Stack spacing={1}>
                  <TextField size="small" label="Reference path" fullWidth
                    placeholder='response["BlueprintTemplate"][0]["BlueprintTemplateId"]'
                    value={step.extractReference} onChange={(e) => onUpdate({ extractReference: e.target.value })} />
                  <TextField size="small" label="Save as variable" fullWidth
                    placeholder="blueprint_id"
                    value={step.extractVariableName} onChange={(e) => onUpdate({ extractVariableName: e.target.value })} />
                </Stack>
              )}

              {step.extractMode === 'python' && (
                <Box>
                  <SyntaxEditor
                    value={step.extractPython || PYTHON_TEMPLATE}
                    onChange={(v) => onUpdate({ extractPython: v })}
                    language="python" rows={8}
                  />
                  <TextField size="small" label="Save returned dict keys as variables" fullWidth sx={{ mt: 1 }}
                    placeholder="(variables auto-extracted from returned dict)"
                    value={step.extractVariableName} onChange={(e) => onUpdate({ extractVariableName: e.target.value })} />
                </Box>
              )}
            </Box>
          )}

          {/* Available variables */}
          {Object.keys(variables).length > 0 && (
            <Box sx={{ p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: 11, mb: 0.5 }}>Available variables:</Typography>
              <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                {Object.keys(variables).map((k) => (
                  <Chip key={k} label={`{{${k}}}`} size="small" variant="outlined" sx={{ fontSize: 10, height: 18 }} />
                ))}
              </Stack>
            </Box>
          )}

          {/* Response block — shows after running */}
          {step.response && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" fontWeight={600} sx={{ fontSize: 12, mb: 0.5 }}>Response</Typography>
              <ResponseViewer body={step.response} source={`${step.method} ${step.endpointName}`} />
            </Box>
          )}

          {step.running && (
            <Typography color="primary" fontSize={12}>Running...</Typography>
          )}
        </Stack>
      )}
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
  const [workflowVars, setWorkflowVars] = useState<Record<string, string>>({})

  // Get base URL from active workspace's first API
  const baseUrl = active?.apis?.[0]?.base_url || ''

  useEffect(() => { load(); fetchEndpoints() }, [])

  const wsWorkflows = workflows.filter((w) => !active || w.workspaceId === active.id)

  const handleCreate = () => {
    if (!active) return
    const wf = create(newName || 'Untitled Notebook', active.id)
    setCreateOpen(false)
    setNewName('')
    setEditing(wf)
    notify(`Notebook "${wf.name}" created`, 'success')
  }

  const handleSave = () => {
    saveEditing()
    notify('Notebook saved', 'success')
  }

  const runStep = async (stepId: string) => {
    if (!editing) return
    const step = editing.steps.find((s) => s.id === stepId)
    if (!step || step.commented || !step.endpointPath) return

    updateStep(stepId, { running: true, response: null })

    // Resolve variables in payload
    let resolvedPayload = step.payload
    for (const [k, v] of Object.entries(workflowVars)) {
      resolvedPayload = resolvedPayload.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v)
    }

    // Resolve variables in params
    const resolvedParams: Record<string, string> = {}
    for (const [k, v] of Object.entries(step.params)) {
      let rv = v
      for (const [vk, vv] of Object.entries(workflowVars)) {
        rv = rv.replace(new RegExp(`\\{\\{${vk}\\}\\}`, 'g'), vv)
      }
      resolvedParams[k] = rv
    }

    try {
      let parsedPayload = null
      if (step.method !== 'GET' && resolvedPayload?.trim() && resolvedPayload.trim() !== '{}') {
        try { parsedPayload = JSON.parse(resolvedPayload) } catch { /* skip */ }
      }

      const r = await api.post('/requests/execute', {
        method: step.method,
        endpoint_name: step.endpointName,
        endpoint_path: step.endpointPath,
        api_alias: active?.apis?.[0]?.alias || '',
        params: Object.keys(resolvedParams).length ? resolvedParams : null,
        query: Object.keys(step.query).length ? step.query : null,
        payload: parsedPayload,
      })

      updateStep(stepId, { running: false, response: r.data.body })

      // Extract variables if configured
      if (step.extractMode === 'reference' && step.extractVariableName && step.extractReference) {
        try {
          const val = resolveJsonPath(r.data.body, step.extractReference)
          setWorkflowVars((v) => ({ ...v, [step.extractVariableName]: typeof val === 'string' ? val : JSON.stringify(val) }))
          notify(`Variable "${step.extractVariableName}" extracted`, 'info')
        } catch (err: any) {
          notify(`Extract failed: ${err.message}`, 'error')
        }
      }
    } catch (err: any) {
      updateStep(stepId, { running: false, response: { error: err.message } })
      notify(`Step failed: ${err.message}`, 'error')
    }
  }

  const runAll = async () => {
    if (!editing) return
    setWorkflowVars({})
    for (const step of editing.steps) {
      if (step.commented) continue
      await runStep(step.id)
    }
    notify('Notebook complete', 'success')
  }

  // Editor view
  if (editing) {
    return (
      <Box sx={{ display: 'flex', height: '100%', gap: 2 }}>
        {/* Left sidebar */}
        <Box sx={{ width: 200, minWidth: 200, borderRight: 1, borderColor: 'divider', pr: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mb: 0.5 }}>
            workspaces / {active?.name || 'none'}
          </Typography>
          <Typography variant="h6" sx={{ mb: 1.5 }}>{editing.name}</Typography>
          <List dense disablePadding>
            {editing.steps.map((step, i) => (
              <ListItemButton key={step.id} sx={{ borderRadius: 1, mb: 0.5, opacity: step.commented ? 0.4 : 1 }}>
                <Chip label={step.method} size="small" sx={{
                  bgcolor: step.commented ? '#555' : (METHOD_COLORS[step.method] || '#555'), color: '#fff',
                  fontWeight: 700, fontSize: 9, height: 18, mr: 1, minWidth: 40,
                }} />
                <ListItemText
                  primary={step.description || step.endpointName || `Step ${i + 1}`}
                  primaryTypographyProps={{ fontSize: 12, noWrap: true }}
                />
                {step.response && <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'success.main', ml: 0.5 }} />}
              </ListItemButton>
            ))}
          </List>
          <Button size="small" startIcon={<Add />} onClick={() => addStep()} sx={{ mt: 1 }}>Add Step</Button>

          {/* Workflow variables */}
          {Object.keys(workflowVars).length > 0 && (
            <Box sx={{ mt: 2, p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2" fontWeight={600} sx={{ fontSize: 11, mb: 0.5 }}>Variables</Typography>
              {Object.entries(workflowVars).map(([k, v]) => (
                <Typography key={k} variant="body2" sx={{ fontSize: 11, fontFamily: 'monospace' }} noWrap>
                  {k}: {String(v).slice(0, 20)}{String(v).length > 20 ? '...' : ''}
                </Typography>
              ))}
            </Box>
          )}
        </Box>

        {/* Right — step editors */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Stack spacing={0.5}>
              <TextField size="small" value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                sx={{ '& input': { fontSize: 16, fontWeight: 600 } }} />
              {baseUrl && (
                <Typography variant="body2" color="text.secondary" fontFamily="monospace" sx={{ fontSize: 11 }}>
                  {baseUrl}
                </Typography>
              )}
              {!baseUrl && (
                <Typography variant="body2" color="warning.main" sx={{ fontSize: 11 }}>
                  No base URL configured — set it in Workspaces
                </Typography>
              )}
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button onClick={cancelEditing}>Close</Button>
              <Button variant="outlined" startIcon={<PlayArrow />} onClick={runAll}
                disabled={editing.steps.filter((s) => !s.commented && s.endpointName).length === 0}>
                Run All
              </Button>
              <Button variant="contained" startIcon={<Save />} onClick={handleSave}>Save</Button>
            </Stack>
          </Stack>

          {editing.steps.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4, border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>
              <Typography color="text.secondary" sx={{ mb: 1 }}>No steps yet</Typography>
              <Button startIcon={<Add />} onClick={() => addStep()}>Add First Step</Button>
            </Box>
          ) : (
            editing.steps.map((step, i) => (
              <StepEditor key={step.id} step={step} index={i} total={editing.steps.length}
                endpoints={endpoints} variables={workflowVars} baseUrl={baseUrl}
                onUpdate={(patch) => updateStep(step.id, patch)}
                onRemove={() => removeStep(step.id)}
                onMove={(dir) => moveStep(step.id, dir)}
                onRun={() => runStep(step.id)}
              />
            ))
          )}

          {editing.steps.length > 1 && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1, fontSize: 12 }}>Flow</Typography>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ overflowX: 'auto' }}>
                {editing.steps.map((step, i) => (
                  <Stack key={step.id} direction="row" alignItems="center" spacing={1}>
                    <Chip label={`${step.method} ${step.endpointName || '?'}`} size="small"
                      sx={{
                        bgcolor: step.commented ? '#555' : (METHOD_COLORS[step.method] || '#555'),
                        color: '#fff', fontWeight: 600, fontSize: 11,
                        textDecoration: step.commented ? 'line-through' : 'none',
                      }} />
                    {i < editing.steps.length - 1 && <Typography color="text.secondary" fontSize={16}>→</Typography>}
                  </Stack>
                ))}
              </Stack>
            </Box>
          )}
        </Box>
      </Box>
    )
  }

  // Canvas view
  return (
    <Box sx={{ minHeight: '100%', backgroundImage: POLKADOT_BG, backgroundSize: '24px 24px' }}>
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>workspaces / {active?.name || 'none'}</Typography>
        <Tooltip title="Configure workspace"><IconButton size="small" onClick={() => navigate('/app/workspaces')} sx={{ color: 'text.secondary' }}><Settings sx={{ fontSize: 14 }} /></IconButton></Tooltip>
      </Stack>

      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h5">Notebooks</Typography>
        <Button variant="contained" size="small" startIcon={<Add />} disabled={!active}
          onClick={() => { setNewName(''); setCreateOpen(true) }}>New Notebook</Button>
      </Stack>

      {wsWorkflows.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography color="text.secondary">No notebooks yet</Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {wsWorkflows.map((wf) => (
            <Card key={wf.id} sx={{ width: 280, cursor: 'pointer' }} onClick={() => setEditing(wf)}>
              <CardContent sx={{ pb: '12px !important' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="h6" sx={{ fontSize: 14 }}>{wf.name}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: 11 }}>{wf.steps.length} step{wf.steps.length !== 1 ? 's' : ''}</Typography>
                  </Box>
                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); setMenuWf(wf); setMenuAnchor(e.currentTarget) }}><MoreVert sx={{ fontSize: 16 }} /></IconButton>
                </Stack>
                {wf.steps.length > 0 && (
                  <Stack direction="row" spacing={0.5} sx={{ mt: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
                    {wf.steps.map((step, i) => (
                      <Stack key={step.id} direction="row" alignItems="center" spacing={0.5}>
                        <Chip label={step.method} size="small" sx={{ bgcolor: METHOD_COLORS[step.method] || '#555', color: '#fff', fontWeight: 700, fontSize: 9, height: 18 }} />
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

      {menuAnchor && (
        <Box>
          <Box sx={{ position: 'fixed', inset: 0, zIndex: 1300 }} onClick={() => setMenuAnchor(null)} />
          <Box sx={{ position: 'fixed', top: (menuAnchor as any).getBoundingClientRect().bottom, left: (menuAnchor as any).getBoundingClientRect().left, zIndex: 1301, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 1, py: 0.5 }}>
            <MenuItem sx={{ fontSize: 13 }} onClick={() => { if (menuWf) { setEditing(menuWf); setMenuAnchor(null) } }}><Edit sx={{ fontSize: 16, mr: 1 }} /> Edit</MenuItem>
            <MenuItem sx={{ fontSize: 13 }} onClick={() => { if (menuWf) { duplicate(menuWf.id); notify(`Duplicated "${menuWf.name}"`, 'info') }; setMenuAnchor(null) }}><ContentCopy sx={{ fontSize: 16, mr: 1 }} /> Duplicate</MenuItem>
            <MenuItem sx={{ fontSize: 13, color: 'error.main' }} onClick={() => { if (menuWf) { remove(menuWf.id); notify(`Deleted "${menuWf.name}"`, 'info') }; setMenuAnchor(null) }}><Delete sx={{ fontSize: 16, mr: 1 }} /> Delete</MenuItem>
          </Box>
        </Box>
      )}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Notebook</DialogTitle>
        <DialogContent>
          <TextField size="small" label="Name" placeholder="Create GPU Infrastructure" value={newName} onChange={(e) => setNewName(e.target.value)} fullWidth autoFocus sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}>Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
