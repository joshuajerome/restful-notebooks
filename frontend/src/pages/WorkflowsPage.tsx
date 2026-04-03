import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert, Autocomplete, Box, Button, Card, CardContent, Chip, Collapse,
  Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControl,
  IconButton, InputLabel, List, ListItemButton, ListItemText, Menu,
  MenuItem, Select, Stack, Tab, Tabs, TextField, Tooltip, Typography,
} from '@mui/material'
import {
  Add, Close, Code, DataObject, Delete, Edit, ExpandMore,
  ContentCopy, MoreVert, PlayArrow, Save, Send, Settings,
} from '@mui/icons-material'
import {
  useNotebookStore, Notebook, NotebookBlock, RequestBlock, ExtractBlock,
  VariableBlock, BlockType, validateDependencies,
} from '../store/notebookStore'
import { useWorkspaceStore } from '../store/workspaceStore'
import { useEndpointStore } from '../store/endpointStore'
import { useNotificationStore } from '../store/notificationStore'
import ResponseViewer from '../components/ResponseViewer'
import { METHOD_COLORS } from '../constants'
import api from '../api/client'

const POLKADOT_BG = `radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)`

// ── Helpers ────────────────────────────────────────────────────────────

function resolveJsonPath(obj: any, path: string): any {
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

function KeyValueEditor({ entries, onChange, label }: {
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

// ── Block Editors (inline) ─────────────────────────────────────────────

function RequestBlockEditor({ block, index, endpoints, baseUrl, onUpdate, onDelete, onRun }: {
  block: RequestBlock; index: number; endpoints: any[]; baseUrl: string
  onUpdate: (patch: Partial<RequestBlock>) => void; onDelete: () => void; onRun: () => void
}) {
  const selectedEp = endpoints.find((e: any) => e.name === block.endpointName) || null
  const [tab, setTab] = useState(0)

  const previewUrl = (() => {
    let url = (baseUrl || '<base_url>') + (block.endpointPath || '')
    const paramKeys = Object.keys(block.params).filter((k) => k)
    if (paramKeys.length) {
      for (const k of paramKeys) url = url.replace(`{${k}}`, block.params[k] || `{${k}}`)
    }
    const queryKeys = Object.keys(block.query).filter((k) => k)
    if (queryKeys.length) url += '?' + queryKeys.map((k) => `${k}=${block.query[k]}`).join('&')
    return url
  })()

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Chip label={`step-${index + 1}`} size="small"
              sx={{ bgcolor: METHOD_COLORS[block.method] || '#555', color: '#fff', fontWeight: 700, fontSize: 11 }} />
            <TextField size="small" placeholder="Description" value={block.description}
              onChange={(e) => onUpdate({ description: e.target.value })}
              sx={{ minWidth: 200, '& input': { fontSize: 13 } }} />
          </Stack>
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Run this step">
              <IconButton size="small" color="primary" onClick={onRun} disabled={!block.endpointName}>
                <PlayArrow sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            <IconButton size="small" color="error" onClick={onDelete}>
              <Delete sx={{ fontSize: 16 }} />
            </IconButton>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <Select value={block.method} onChange={(e) => onUpdate({ method: e.target.value })}>
              {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map((m) => (
                <MenuItem key={m} value={m}>
                  <Chip label={m} size="small" sx={{ bgcolor: METHOD_COLORS[m] || '#555', color: '#fff', fontWeight: 700, fontSize: 10, height: 20 }} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Autocomplete size="small" sx={{ flex: 1 }} options={endpoints} value={selectedEp}
            onChange={(_: any, ep: any) => ep && onUpdate({ endpointName: ep.name, endpointPath: ep.path })}
            getOptionLabel={(ep: any) => `${ep.display_name || ep.name}  —  ${ep.path}`}
            filterOptions={(opts: any[], { inputValue }: any) => {
              const s = inputValue.toLowerCase()
              return opts.filter((ep: any) => ep.name.toLowerCase().includes(s) || ep.display_name?.toLowerCase().includes(s) || ep.path.toLowerCase().includes(s))
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

        {block.endpointPath && (
          <Box sx={{ mb: 1.5 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 10, mb: 0.25 }}>Preview</Typography>
            <Typography variant="body2" fontFamily="monospace" sx={{ fontSize: 11, color: 'text.secondary', bgcolor: 'background.default', px: 1.5, py: 0.5, borderRadius: 1 }}>
              {previewUrl}
            </Typography>
          </Box>
        )}

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ minHeight: 30 }}>
            <Tab label="Params" sx={{ minHeight: 30, fontSize: 11, textTransform: 'none', py: 0 }} />
            <Tab label="Query" sx={{ minHeight: 30, fontSize: 11, textTransform: 'none', py: 0 }} />
            {block.method !== 'GET' && <Tab label="Payload" sx={{ minHeight: 30, fontSize: 11, textTransform: 'none', py: 0 }} />}
          </Tabs>
        </Box>

        <Box sx={{ pt: 1 }}>
          {tab === 0 && <KeyValueEditor entries={block.params} onChange={(p) => onUpdate({ params: p })} label="param" />}
          {tab === 1 && <KeyValueEditor entries={block.query} onChange={(q) => onUpdate({ query: q })} label="query" />}
          {tab === 2 && block.method !== 'GET' && (
            <TextField size="small" fullWidth multiline minRows={3} maxRows={8} placeholder={'{\n    "Name": "{{var_name}}"\n}'}
              value={block.payload} onChange={(e) => onUpdate({ payload: e.target.value })}
              sx={{ fontFamily: 'monospace', '& textarea': { fontSize: 12 } }} />
          )}
        </Box>

        {block.response && (
          <Box sx={{ mt: 1.5 }}>
            <Typography variant="body2" fontWeight={600} sx={{ fontSize: 12, mb: 0.5 }}>Response</Typography>
            <ResponseViewer data={block.response} />
          </Box>
        )}
        {block.running && <Typography color="primary" fontSize={12} sx={{ mt: 1 }}>Running...</Typography>}
      </CardContent>
    </Card>
  )
}

function ExtractBlockEditor({ block, blocks, onUpdate, onDelete }: {
  block: ExtractBlock; blocks: NotebookBlock[]
  onUpdate: (patch: Partial<ExtractBlock>) => void; onDelete: () => void
}) {
  const inputBlock = blocks.find((b) => b.id === block.inputBlockId)
  const warnings = validateDependencies(blocks)
  const warning = warnings[block.id]
  const [previewOpen, setPreviewOpen] = useState(false)
  const inputResponse = inputBlock?.type === 'request' ? (inputBlock as RequestBlock).response : undefined

  return (
    <Card variant="outlined" sx={{ mb: 2, borderColor: warning ? 'warning.main' : 'divider' }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
          <Chip label="extract" size="small" sx={{ bgcolor: '#805AD5', color: '#fff', fontWeight: 700, fontSize: 11 }} />
          <IconButton size="small" color="error" onClick={onDelete}><Delete sx={{ fontSize: 16 }} /></IconButton>
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mb: 1 }}>
          Input: {inputBlock ? inputBlock.label : <em>unknown block</em>}
        </Typography>

        {warning && <Alert severity="warning" sx={{ mb: 1.5, fontSize: 12, py: 0 }}>{warning}</Alert>}

        <Stack spacing={1.5}>
          <TextField size="small" label="Reference path" fullWidth
            placeholder='response["items"][0]["id"]'
            value={block.referencePath} onChange={(e) => onUpdate({ referencePath: e.target.value })} />
          <TextField size="small" label="Variable name" fullWidth
            placeholder="item_id"
            value={block.variableName} onChange={(e) => onUpdate({ variableName: e.target.value })} />
        </Stack>

        {inputResponse && (
          <Box sx={{ mt: 1.5 }}>
            <Button size="small" startIcon={<ExpandMore sx={{ transform: previewOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />}
              onClick={() => setPreviewOpen(!previewOpen)} sx={{ fontSize: 11 }}>
              Response preview
            </Button>
            <Collapse in={previewOpen}>
              <Box sx={{ mt: 0.5 }}>
                <ResponseViewer data={inputResponse} maxHeight={200} highlightPath={block.referencePath} />
              </Box>
            </Collapse>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

function VariableBlockEditor({ block, onUpdate, onDelete }: {
  block: VariableBlock; onUpdate: (patch: Partial<VariableBlock>) => void; onDelete: () => void
}) {
  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
          <Chip label="variable" size="small" sx={{ bgcolor: '#718096', color: '#fff', fontWeight: 700, fontSize: 11 }} />
          <IconButton size="small" color="error" onClick={onDelete}><Delete sx={{ fontSize: 16 }} /></IconButton>
        </Stack>
        <Stack direction="row" spacing={1.5}>
          <TextField size="small" label="Key" value={block.key} sx={{ flex: 1 }}
            onChange={(e) => onUpdate({ key: e.target.value })} />
          <TextField size="small" label="Value" value={block.value} sx={{ flex: 1 }}
            onChange={(e) => onUpdate({ value: e.target.value })} />
        </Stack>
      </CardContent>
    </Card>
  )
}

// ── Add Block Menu ─────────────────────────────────────────────────────

function AddBlockButton({ onAdd }: { onAdd: (type: BlockType) => void }) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)
  return (
    <>
      <Button size="small" startIcon={<Add />} onClick={(e) => setAnchor(e.currentTarget)}>Add Block</Button>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        <MenuItem onClick={() => { onAdd('request'); setAnchor(null) }}>
          <Send sx={{ fontSize: 16, mr: 1 }} /> REST Request
        </MenuItem>
        <MenuItem onClick={() => { onAdd('extract'); setAnchor(null) }}>
          <DataObject sx={{ fontSize: 16, mr: 1 }} /> Extract Data
        </MenuItem>
        <MenuItem onClick={() => { onAdd('variable'); setAnchor(null) }}>
          <Code sx={{ fontSize: 16, mr: 1 }} /> Create Variable
        </MenuItem>
      </Menu>
    </>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────

export default function WorkflowsPage() {
  const navigate = useNavigate()
  const {
    notebooks, editing, load, create, remove, duplicate,
    setEditing, saveEditing, cancelEditing, addBlock, updateBlock, removeBlock, moveBlock,
  } = useNotebookStore()
  const { active } = useWorkspaceStore()
  const { endpoints, fetchEndpoints } = useEndpointStore()
  const { add: notify } = useNotificationStore()

  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [menuNb, setMenuNb] = useState<Notebook | null>(null)
  const [runtimeVars, setRuntimeVars] = useState<Record<string, string>>({})
  const blockRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dropIdx, setDropIdx] = useState<number | null>(null)

  const baseUrl = active?.apis?.[0]?.base_url || ''

  useEffect(() => { load(); fetchEndpoints() }, [])

  const wsNotebooks = notebooks.filter((nb) => !active || nb.workspaceId === active.id)

  const handleCreate = () => {
    if (!active) return
    const nb = create(newName || 'Untitled Notebook', active.id)
    setCreateOpen(false)
    setNewName('')
    setEditing(nb)
    notify(`Notebook "${nb.name}" created`, 'success')
  }

  const handleSave = () => {
    saveEditing()
    notify('Notebook saved', 'success')
  }

  const scrollToBlock = (blockId: string) => {
    blockRefs.current[blockId]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  // ── Run logic ──────────────────────────────────────────────────────

  const resolveVariables = (text: string, vars: Record<string, string>): string => {
    let resolved = text
    for (const [k, v] of Object.entries(vars)) {
      resolved = resolved.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v)
    }
    return resolved
  }

  const runStep = async (blockId: string, vars: Record<string, string>) => {
    if (!editing) return vars
    const block = editing.blocks.find((b) => b.id === blockId)
    if (!block || block.type !== 'request') return vars
    const req = block as RequestBlock
    if (!req.endpointPath) return vars

    updateBlock(blockId, { running: true, response: undefined } as Partial<RequestBlock>)

    const resolvedPayload = resolveVariables(req.payload, vars)
    const resolvedParams: Record<string, string> = {}
    for (const [k, v] of Object.entries(req.params)) resolvedParams[k] = resolveVariables(v, vars)
    const resolvedQuery: Record<string, string> = {}
    for (const [k, v] of Object.entries(req.query)) resolvedQuery[k] = resolveVariables(v, vars)

    try {
      let parsedPayload = null
      if (req.method !== 'GET' && resolvedPayload?.trim() && resolvedPayload.trim() !== '{}') {
        try { parsedPayload = JSON.parse(resolvedPayload) } catch { /* skip */ }
      }

      const r = await api.post('/requests/execute', {
        method: req.method,
        endpoint_name: req.endpointName,
        endpoint_path: req.endpointPath,
        api_alias: active?.apis?.[0]?.alias || '',
        params: Object.keys(resolvedParams).length ? resolvedParams : null,
        query: Object.keys(resolvedQuery).length ? resolvedQuery : null,
        payload: parsedPayload,
      })

      updateBlock(blockId, { running: false, response: r.data.body } as Partial<RequestBlock>)

      // Auto-resolve following extract blocks
      const idx = editing.blocks.findIndex((b) => b.id === blockId)
      let newVars = { ...vars }
      for (let i = idx + 1; i < editing.blocks.length; i++) {
        const next = editing.blocks[i]
        if (next.type === 'extract' && (next as ExtractBlock).inputBlockId === blockId) {
          const ext = next as ExtractBlock
          if (ext.variableName && ext.referencePath) {
            try {
              const val = resolveJsonPath(r.data.body, ext.referencePath)
              newVars[ext.variableName] = typeof val === 'string' ? val : JSON.stringify(val)
              notify(`Variable "${ext.variableName}" extracted`, 'info')
            } catch (err: any) {
              notify(`Extract failed: ${err.message}`, 'error')
            }
          }
        } else if (next.type === 'request') break
      }
      return newVars
    } catch (err: any) {
      updateBlock(blockId, { running: false, response: { error: err.message } } as Partial<RequestBlock>)
      notify(`Step failed: ${err.message}`, 'error')
      return vars
    }
  }

  const runAll = async () => {
    if (!editing) return
    let vars: Record<string, string> = {}

    // Collect variable blocks first, then run sequentially
    for (const block of editing.blocks) {
      if (block.type === 'variable') {
        const vb = block as VariableBlock
        if (vb.key) vars[vb.key] = vb.value
      } else if (block.type === 'request') {
        vars = await runStep(block.id, vars)
      }
      // Extract blocks are handled inside runStep
    }
    setRuntimeVars(vars)
    notify('Notebook complete', 'success')
  }

  const runSingleStep = async (blockId: string) => {
    // Collect all variables defined before this block
    if (!editing) return
    let vars: Record<string, string> = {}
    for (const block of editing.blocks) {
      if (block.id === blockId) break
      if (block.type === 'variable') {
        const vb = block as VariableBlock
        if (vb.key) vars[vb.key] = vb.value
      }
    }
    // Merge runtime vars (from previous runs)
    vars = { ...vars, ...runtimeVars }
    const newVars = await runStep(blockId, vars)
    setRuntimeVars(newVars)
  }

  // ── Editor View ────────────────────────────────────────────────────

  if (editing) {
    const requestCount = editing.blocks.filter((b) => b.type === 'request').length
    return (
      <Box sx={{ display: 'flex', height: '100%', ml: -3, mr: -3 }}>
        {/* Left Sidebar */}
        <Box sx={{ width: 210, minWidth: 210, borderRight: 1, borderColor: 'divider', pl: 1.5, pr: 1.5, display: 'flex', flexDirection: 'column' }}>
          <TextField size="small" value={editing.name}
            onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            sx={{ mb: 1.5, '& input': { fontSize: 14, fontWeight: 600 } }} />

          <List dense disablePadding sx={{ flex: 1, overflow: 'auto', px: 0 }}>
            {editing.blocks.map((block, idx) => (
              <ListItemButton key={block.id}
                draggable
                onDragStart={() => setDragIdx(idx)}
                onDragOver={(e) => { e.preventDefault(); setDropIdx(idx) }}
                onDragEnd={() => {
                  if (dragIdx !== null && dropIdx !== null && dragIdx !== dropIdx) moveBlock(dragIdx, dropIdx)
                  setDragIdx(null); setDropIdx(null)
                }}
                sx={{
                  borderRadius: 1, mb: 0.5, py: 0.25, cursor: 'grab',
                  ...(dragIdx === idx ? { opacity: 0.4, border: '1px dashed', borderColor: 'primary.main' } : {}),
                  ...(dropIdx === idx && dragIdx !== idx ? { borderTop: '2px solid', borderColor: 'primary.main' } : {}),
                }}
                onClick={() => scrollToBlock(block.id)}>
                {block.type === 'request' && (
                  <>
                    <Chip label={(block as RequestBlock).method} size="small" sx={{
                      bgcolor: METHOD_COLORS[(block as RequestBlock).method] || '#555', color: '#fff',
                      fontWeight: 700, fontSize: 9, height: 18, mr: 1, minWidth: 36,
                    }} />
                    <ListItemText
                      primary={(block as RequestBlock).endpointName || 'New Request'}
                      primaryTypographyProps={{ fontSize: 11, noWrap: true }} />
                  </>
                )}
                {block.type === 'extract' && (
                  <ListItemText
                    primary={`\u2193 extract \u2192 ${(block as ExtractBlock).variableName || '?'}`}
                    primaryTypographyProps={{ fontSize: 11, fontFamily: 'monospace', noWrap: true, color: 'text.secondary' }} />
                )}
                {block.type === 'variable' && (
                  <ListItemText
                    primary={`${(block as VariableBlock).key || '?'} = ${((block as VariableBlock).value || '').slice(0, 12)}${((block as VariableBlock).value || '').length > 12 ? '...' : ''}`}
                    primaryTypographyProps={{ fontSize: 11, fontFamily: 'monospace', noWrap: true, color: 'text.secondary' }} />
                )}
                {block.type === 'request' && (block as RequestBlock).response && (
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'success.main', ml: 0.5 }} />
                )}
              </ListItemButton>
            ))}
          </List>

          <Divider sx={{ my: 1 }} />
          <AddBlockButton onAdd={(type) => addBlock(type)} />

          {/* Runtime variables */}
          {Object.keys(runtimeVars).length > 0 && (
            <Box sx={{ mt: 1.5, p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2" fontWeight={600} sx={{ fontSize: 11, mb: 0.5 }}>Variables</Typography>
              {Object.entries(runtimeVars).map(([k, v]) => (
                <Typography key={k} variant="body2" sx={{ fontSize: 10, fontFamily: 'monospace' }} noWrap>
                  {k}: {String(v).slice(0, 20)}{String(v).length > 20 ? '...' : ''}
                </Typography>
              ))}
            </Box>
          )}

          <Stack spacing={1} sx={{ mt: 1.5 }}>
            <Button variant="outlined" startIcon={<PlayArrow />} onClick={runAll} fullWidth size="small"
              disabled={requestCount === 0}>
              Run All
            </Button>
            <Button variant="contained" startIcon={<Save />} onClick={handleSave} fullWidth size="small">Save</Button>
            <Button startIcon={<Close />} onClick={cancelEditing} fullWidth size="small">Cancel</Button>
          </Stack>
        </Box>

        {/* Main Area */}
        <Box sx={{ flex: 1, overflow: 'auto', pb: 4, pl: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Box>
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
            </Box>
          </Stack>

          {editing.blocks.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6, border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>
              <Typography color="text.secondary" sx={{ mb: 1.5 }}>No blocks yet</Typography>
              <AddBlockButton onAdd={(type) => addBlock(type)} />
            </Box>
          ) : (
            editing.blocks.map((block, i) => (
              <Box key={block.id} ref={(el: HTMLDivElement | null) => { blockRefs.current[block.id] = el }}>
                {block.type === 'request' && (
                  <RequestBlockEditor
                    block={block as RequestBlock} index={i} endpoints={endpoints} baseUrl={baseUrl}
                    onUpdate={(patch) => updateBlock(block.id, patch)}
                    onDelete={() => removeBlock(block.id)}
                    onRun={() => runSingleStep(block.id)}
                  />
                )}
                {block.type === 'extract' && (
                  <ExtractBlockEditor
                    block={block as ExtractBlock} blocks={editing.blocks}
                    onUpdate={(patch) => updateBlock(block.id, patch)}
                    onDelete={() => removeBlock(block.id)}
                  />
                )}
                {block.type === 'variable' && (
                  <VariableBlockEditor
                    block={block as VariableBlock}
                    onUpdate={(patch) => updateBlock(block.id, patch)}
                    onDelete={() => removeBlock(block.id)}
                  />
                )}
              </Box>
            ))
          )}

          {editing.blocks.length > 0 && (
            <Box sx={{ mt: 1 }}>
              <AddBlockButton onAdd={(type) => addBlock(type)} />
            </Box>
          )}
        </Box>
      </Box>
    )
  }

  // ── Canvas View ────────────────────────────────────────────────────

  return (
    <Box sx={{ minHeight: '100%', backgroundImage: POLKADOT_BG, backgroundSize: '24px 24px' }}>
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>workspaces / {active?.name || 'none'}</Typography>
        <Tooltip title="Configure workspace">
          <IconButton size="small" onClick={() => navigate('/app/workspaces')} sx={{ color: 'text.secondary' }}>
            <Settings sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      </Stack>

      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h5">Notebooks</Typography>
        <Button variant="contained" size="small" startIcon={<Add />} disabled={!active}
          onClick={() => { setNewName(''); setCreateOpen(true) }}>New Notebook</Button>
      </Stack>

      {wsNotebooks.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography color="text.secondary">No notebooks yet</Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {wsNotebooks.map((nb) => (
            <Card key={nb.id} sx={{ width: 280, cursor: 'pointer' }}
              onClick={() => setEditing(nb)}
              onContextMenu={(e) => { e.preventDefault(); setMenuNb(nb); setMenuAnchor(e.currentTarget as HTMLElement) }}>
              <CardContent sx={{ pb: '12px !important' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="h6" sx={{ fontSize: 14 }}>{nb.name}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: 11 }}>
                      {nb.blocks.length} block{nb.blocks.length !== 1 ? 's' : ''}
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); setMenuNb(nb); setMenuAnchor(e.currentTarget) }}>
                    <MoreVert sx={{ fontSize: 16 }} />
                  </IconButton>
                </Stack>
                {nb.blocks.length > 0 && (
                  <Stack direction="row" spacing={0.5} sx={{ mt: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
                    {nb.blocks.map((block) => {
                      if (block.type === 'request') {
                        const req = block as RequestBlock
                        return <Chip key={block.id} label={req.method} size="small"
                          sx={{ bgcolor: METHOD_COLORS[req.method] || '#555', color: '#fff', fontWeight: 700, fontSize: 9, height: 18 }} />
                      }
                      if (block.type === 'extract') {
                        return <Chip key={block.id} label="extract" size="small" variant="outlined" sx={{ fontSize: 9, height: 18 }} />
                      }
                      return <Chip key={block.id} label="var" size="small" variant="outlined" sx={{ fontSize: 9, height: 18 }} />
                    })}
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
          <Box sx={{ position: 'fixed', top: (menuAnchor as any).getBoundingClientRect().bottom, left: (menuAnchor as any).getBoundingClientRect().left, zIndex: 1301, bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 1, py: 0.5 }}>
            <MenuItem sx={{ fontSize: 13 }} onClick={() => { if (menuNb) { setEditing(menuNb); setMenuAnchor(null) } }}>
              <Edit sx={{ fontSize: 16, mr: 1 }} /> Edit
            </MenuItem>
            <MenuItem sx={{ fontSize: 13 }} onClick={() => { if (menuNb) { duplicate(menuNb.id); notify(`Duplicated "${menuNb.name}"`, 'info') }; setMenuAnchor(null) }}>
              <ContentCopy sx={{ fontSize: 16, mr: 1 }} /> Duplicate
            </MenuItem>
            <MenuItem sx={{ fontSize: 13, color: 'error.main' }} onClick={() => { if (menuNb) { remove(menuNb.id); notify(`Deleted "${menuNb.name}"`, 'info') }; setMenuAnchor(null) }}>
              <Delete sx={{ fontSize: 16, mr: 1 }} /> Delete
            </MenuItem>
          </Box>
        </Box>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Notebook</DialogTitle>
        <DialogContent>
          <TextField size="small" label="Name" placeholder="Create GPU Infrastructure" value={newName}
            onChange={(e) => setNewName(e.target.value)} fullWidth autoFocus sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}>Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
