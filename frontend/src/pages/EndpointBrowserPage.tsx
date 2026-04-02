import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, IconButton, TextField, Typography, List, ListItemButton, ListItemText,
  Chip, Stack, Select, MenuItem, FormControl, InputLabel, Tooltip,
} from '@mui/material'
import { Settings } from '@mui/icons-material'
import { useEndpointStore } from '../store/endpointStore'
import { useWorkspaceStore } from '../store/workspaceStore'
import { METHOD_COLORS } from '../constants'

export default function EndpointBrowserPage() {
  const navigate = useNavigate()
  const { active } = useWorkspaceStore()
  const {
    endpoints, groups, search, selectedGroup,
    setSearch, setSelectedGroup, fetchEndpoints, fetchGroups,
  } = useEndpointStore()

  // Refetch when backend workspace changes (after load/unload completes)
  useEffect(() => {
    const refresh = () => { fetchEndpoints(); fetchGroups() }
    refresh()
    window.addEventListener('workspace-synced', refresh)
    return () => window.removeEventListener('workspace-synced', refresh)
  }, [])

  const filtered = useMemo(() => {
    let result = endpoints
    if (search) {
      const s = search.toLowerCase()
      result = result.filter((e) => e.name.toLowerCase().includes(s) || e.display_name.toLowerCase().includes(s) || e.path.toLowerCase().includes(s))
    }
    if (selectedGroup) result = result.filter((e) => e.group === selectedGroup)
    return result
  }, [endpoints, search, selectedGroup])

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

      <Typography variant="h5" sx={{ mb: 2 }}>Endpoints</Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField size="small" placeholder="Search endpoints..." value={search} onChange={(e) => setSearch(e.target.value)} sx={{ flex: 1 }} />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>API</InputLabel>
          <Select value={selectedGroup} label="API" onChange={(e) => setSelectedGroup(e.target.value)}>
            <MenuItem value="">All APIs</MenuItem>
            {groups.map((g) => <MenuItem key={g} value={g}>{g}</MenuItem>)}
          </Select>
        </FormControl>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {filtered.length} endpoint{filtered.length !== 1 ? 's' : ''}
      </Typography>

      <List sx={{ bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
        {filtered.map((ep) => (
          <ListItemButton key={ep.name} onClick={() => navigate(`/app/request/${ep.name}`)}
            sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ width: 200, minWidth: 200, display: 'flex', gap: 0.5, flexWrap: 'wrap', mr: 2 }}>
              {ep.methods.map((m) => (
                <Chip key={m} label={m} size="small" sx={{ bgcolor: METHOD_COLORS[m] || '#555', color: '#fff', fontWeight: 700, fontSize: 10, height: 20, minWidth: 50 }} />
              ))}
            </Box>
            <ListItemText primary={ep.display_name || ep.name} secondary={ep.path}
              primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 500 }}
              secondaryTypographyProps={{ fontSize: 11, fontFamily: 'monospace', color: 'text.secondary' }} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  )
}
