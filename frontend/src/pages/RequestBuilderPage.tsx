import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Autocomplete, Box, Button, Chip, Divider, FormControl,
  IconButton, MenuItem, Select, Stack, Tab, Tabs, TextField, Typography,
  CircularProgress, Alert, Tooltip,
} from '@mui/material'
import { Send, DeleteOutline, DragHandle, Settings } from '@mui/icons-material'
import { useRequestStore } from '../store/requestStore'
import { useEndpointStore, EndpointInfo } from '../store/endpointStore'
import { useVariableStore } from '../store/variableStore'
import { useWorkspaceStore } from '../store/workspaceStore'
import { METHOD_COLORS } from '../constants'
import ResponseViewer from '../components/ResponseViewer'

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']

function KeyValueEditor({ entries, onChange, label, infoText }: {
  entries: Record<string, string>; onChange: (e: Record<string, string>) => void; label: string; infoText?: string
}) {
  const keys = Object.keys(entries)
  const addRow = () => onChange({ ...entries, '': '' })
  const updateKey = (old: string, nk: string) => { const n: Record<string, string> = {}; for (const [k, v] of Object.entries(entries)) n[k === old ? nk : k] = v; onChange(n) }
  const updateValue = (k: string, v: string) => onChange({ ...entries, [k]: v })
  const removeRow = (k: string) => { const { [k]: _, ...r } = entries; onChange(r) }
  return (
    <Box sx={{ mt: 1 }}>
      {infoText && <Alert severity="info" sx={{ mb: 2 }}>{infoText}</Alert>}
      {keys.map((key, i) => (
        <Stack direction="row" spacing={1} key={i} sx={{ mb: 1 }} alignItems="center">
          <TextField size="small" placeholder="Key" value={key} onChange={(e) => updateKey(key, e.target.value)} sx={{ flex: 1 }} />
          <TextField size="small" placeholder="Value" value={entries[key]} onChange={(e) => updateValue(key, e.target.value)} sx={{ flex: 1 }} />
          <Tooltip title="Remove"><IconButton size="small" color="error" onClick={() => removeRow(key)}><DeleteOutline sx={{ fontSize: 18 }} /></IconButton></Tooltip>
        </Stack>
      ))}
      <Button size="small" onClick={addRow}>+ Add {label}</Button>
    </Box>
  )
}

// JSON editor with syntax highlighting + 4-space indent
const SYN = { key: '#9CDCFE', string: '#CE9178', number: '#B5CEA8', bool: '#569CD6', null: '#569CD6', bracket: '#D4D4D4', punct: '#D4D4D4' }

function JsonEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const INDENT = '    ' // 4 spaces
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = ref.current; if (!ta) return
    if (e.key === 'Tab') {
      e.preventDefault(); const s = ta.selectionStart, end = ta.selectionEnd
      const nv = ta.value.substring(0, s) + INDENT + ta.value.substring(end)
      onChange(nv); requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + INDENT.length })
    }
    if (e.key === 'Enter') {
      const s = ta.selectionStart, val = ta.value, ls = val.lastIndexOf('\n', s - 1) + 1
      const indent = val.substring(ls, s).match(/^(\s*)/)?.[1] || '', before = val[s - 1], after = val[s]
      if (before === '{' || before === '[') {
        e.preventDefault(); const ei = indent + INDENT
        if (after === '}' || after === ']') {
          const nv = val.substring(0, s) + '\n' + ei + '\n' + indent + val.substring(s)
          onChange(nv); requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 1 + ei.length })
        } else {
          const nv = val.substring(0, s) + '\n' + ei + val.substring(s)
          onChange(nv); requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 1 + ei.length })
        }
      } else if (indent) {
        e.preventDefault(); const nv = val.substring(0, s) + '\n' + indent + val.substring(s)
        onChange(nv); requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 1 + indent.length })
      }
    }
  }, [onChange])
  return (
    <TextField inputRef={ref} multiline rows={10} fullWidth value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={handleKeyDown as any}
      placeholder={'{\n    "key": "value"\n}'} InputProps={{ sx: { fontFamily: '"Fira Code","Consolas",monospace', fontSize: 12, lineHeight: 1.6, bgcolor: '#1E1E1E', color: '#D4D4D4', '& textarea': { caretColor: '#fff' } } }} />
  )
}

// Resizable bottom preview panel
function PreviewPanel({ method, path, params, query, payload, baseUrl }: {
  method: string; path: string; params: Record<string, string>; query: Record<string, string>; payload: string; baseUrl: string
}) {
  const [height, setHeight] = useState(36) // collapsed = 36 (just the handle bar)
  const dragging = useRef(false)
  const startY = useRef(0)
  const startH = useRef(0)

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true; startY.current = e.clientY; startH.current = height
    const onMove = (ev: MouseEvent) => { if (dragging.current) setHeight(Math.max(36, Math.min(400, startH.current - (ev.clientY - startY.current)))) }
    const onUp = () => { dragging.current = false; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
    document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp)
  }

  let fullPath = path
  if (Object.keys(params).length) { const v = Object.values(params).filter(Boolean).join(','); if (v) fullPath = `${path}(${v})` }
  const qs = Object.entries(query).filter(([k, v]) => k && v).map(([k, v]) => `${k}=${v}`).join('&')
  const fullUrl = `${baseUrl || '<base_url>'}${fullPath}${qs ? '?' + qs : ''}`
  let pp = ''; if (method !== 'GET' && payload?.trim() && payload.trim() !== '{}') { try { pp = JSON.stringify(JSON.parse(payload), null, 4) } catch { pp = payload } }
  const isExpanded = height > 60

  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper', mt: 2, overflow: 'hidden' }}>
      {/* Drag handle */}
      <Box onMouseDown={onMouseDown} sx={{ display: 'flex', justifyContent: 'center', py: 0.5, cursor: 'ns-resize', '&:hover': { bgcolor: 'action.hover' } }}>
        <DragHandle sx={{ fontSize: 16, color: 'text.disabled' }} />
      </Box>
      {isExpanded && (
        <Box sx={{ height: height - 36, overflow: 'auto', px: 2, pb: 1.5 }}>
          <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="body2" fontWeight={600} sx={{ flex: 1, fontSize: 12 }}>Request Preview</Typography>
            <Chip label="view only" size="small" variant="outlined" sx={{ fontSize: 9, height: 16 }} />
          </Stack>
          <Box sx={{ bgcolor: '#1E1E1E', p: 1.5, borderRadius: 1, fontFamily: '"Fira Code",monospace', fontSize: 12, overflowX: 'auto', mb: pp ? 1.5 : 0 }}>
            <span style={{ color: METHOD_COLORS[method] || '#888', fontWeight: 700 }}>{method}</span>
            <span style={{ color: '#D4D4D4' }}> {fullUrl}</span>
          </Box>
          {pp && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: 11, mb: 0.5 }}>Payload</Typography>
              <Box sx={{ bgcolor: '#1E1E1E', p: 1.5, borderRadius: 1, fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre', color: '#D4D4D4', overflowX: 'auto' }}>{pp}</Box>
            </>
          )}
        </Box>
      )}
    </Box>
  )
}

export default function RequestBuilderPage() {
  const { endpointName: routeEp } = useParams()
  const navigate = useNavigate()
  const { method, endpointName, endpointPath, params, query, payload, response, loading, setMethod, setEndpoint, setParams, setQuery, setPayload, execute } = useRequestStore()
  const { endpoints, fetchEndpoints } = useEndpointStore()
  const { fetchVariables } = useVariableStore()
  const { active } = useWorkspaceStore()
  const [tab, setTab] = useState(0)
  const [baseUrl, setBaseUrl] = useState('')

  useEffect(() => { fetchEndpoints(); fetchVariables()
    import('../api/client').then(({ default: api }) => api.get('/config').then((r) => setBaseUrl(r.data.base_url || '')).catch(() => {}))
  }, [])

  useEffect(() => { if (routeEp && endpoints.length) { const ep = endpoints.find((e) => e.name === routeEp); if (ep) { setEndpoint(ep.name, ep.path); if (ep.methods.length === 1) setMethod(ep.methods[0]) } } }, [routeEp, endpoints])

  const selectedEp = endpoints.find((e) => e.name === endpointName) || null
  const statusColor = response ? (response.status_code >= 200 && response.status_code < 300 ? 'success' : response.status_code >= 400 ? 'error' : 'warning') : 'default'
  const isClientError = response?.body?.error && typeof response.body.error === 'string' && response.body.error.includes('No scheme supplied')

  // Filter endpoints: if method selected, disable endpoints that don't support it
  const selectedMethod = method

  return (
    <Box>
      {/* Workspace breadcrumb */}
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

      <Typography variant="h5" sx={{ mb: 2 }}>Request Builder</Typography>

      {/* Request bar */}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select value={method} onChange={(e) => setMethod(e.target.value)}
            renderValue={(v) => <Chip label={v} size="small" sx={{ bgcolor: METHOD_COLORS[v] || '#555', color: '#fff', fontWeight: 700, fontSize: 11, height: 22 }} />}>
            {METHODS.map((m) => (
              <MenuItem key={m} value={m} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Chip label={m} size="small" sx={{ bgcolor: METHOD_COLORS[m] || '#555', color: '#fff', fontWeight: 700, fontSize: 10, height: 20, minWidth: 55 }} />
                <Typography fontSize={13}>{m}</Typography>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Autocomplete size="small" sx={{ flex: 1 }} options={endpoints} value={selectedEp}
          onChange={(_, ep) => { if (ep) { setEndpoint(ep.name, ep.path); if (ep.methods.length === 1) setMethod(ep.methods[0]) } }}
          getOptionLabel={(ep) => ep.display_name || ep.name}
          getOptionDisabled={(ep) => !ep.methods.includes(selectedMethod)}
          filterOptions={(opts, { inputValue }) => {
            const s = inputValue.toLowerCase()
            return opts.filter((ep) => ep.name.toLowerCase().includes(s) || ep.display_name.toLowerCase().includes(s) || ep.path.toLowerCase().includes(s))
          }}
          renderOption={(props, ep) => {
            const disabled = !ep.methods.includes(selectedMethod)
            return (
              <Tooltip key={ep.name} title={disabled ? `Does not support ${selectedMethod}` : ''} placement="right"
                enterDelay={1000} enterNextDelay={1000}>
                <Box component="li" {...props} sx={{ ...((props as any).sx || {}), opacity: disabled ? 0.4 : 1 }}>
                  <Stack direction="row" spacing={0.5} sx={{ width: 80, minWidth: 80 }}>
                    {ep.methods.map((m) => (
                      <Box key={m} sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: METHOD_COLORS[m] || '#555' }} />
                    ))}
                  </Stack>
                  <Typography fontSize={13} fontWeight={500} sx={{ flex: 1 }}>{ep.display_name || ep.name}</Typography>
                  <Typography fontSize={11} color="text.secondary" fontFamily="monospace" noWrap>{ep.path}</Typography>
                </Box>
              </Tooltip>
            )
          }}
          renderInput={(p) => <TextField {...p} placeholder="Search or select endpoint..." />}
        />

        <Button variant="contained" onClick={execute} disabled={loading || !endpointName}
          startIcon={loading ? <CircularProgress size={16} /> : <Send />}>Send</Button>
      </Stack>

      {endpointPath && <Typography variant="body2" color="text.secondary" fontFamily="monospace" sx={{ mb: 2, fontSize: 12 }}>{endpointPath}</Typography>}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ minHeight: 36 }}>
          <Tab label="Params" sx={{ minHeight: 36, fontSize: 12, textTransform: 'none' }} />
          <Tab label="Query" sx={{ minHeight: 36, fontSize: 12, textTransform: 'none' }} />
          <Tab label="Payload" sx={{ minHeight: 36, fontSize: 12, textTransform: 'none' }} />
        </Tabs>
      </Box>

      {tab === 0 && <KeyValueEditor entries={params} onChange={setParams} label="param" infoText="OData key predicates appended to the path. Example: id=abc, namespace=prod → /Nodes(abc,prod)" />}
      {tab === 1 && <KeyValueEditor entries={query} onChange={setQuery} label="query param" infoText="URL query string params. Example: $expand=BlueprintTemplates → ?$expand=BlueprintTemplates" />}
      {tab === 2 && <JsonEditor value={payload} onChange={setPayload} />}

      {/* Response */}
      {response && (
        <Box sx={{ mt: 3 }}>
          <Divider sx={{ mb: 2 }} />
          {isClientError && <Alert severity="warning" sx={{ mb: 2 }}>No base URL configured. Go to <strong>Workspaces</strong> to configure API connection.</Alert>}
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6">Response</Typography>
            <Chip label={response.status_code || 'ERR'} color={statusColor as any} size="small" sx={{ fontWeight: 700 }} />
            <Typography variant="body2" color="text.secondary" fontSize={12}>{response.duration_ms}ms</Typography>
          </Stack>
          <ResponseViewer body={response.body} source={`${method} ${endpointName}`} />
        </Box>
      )}

      {/* Resizable preview panel */}
      {endpointPath && <PreviewPanel method={method} path={endpointPath} params={params} query={query} payload={payload} baseUrl={baseUrl} />}
    </Box>
  )
}
