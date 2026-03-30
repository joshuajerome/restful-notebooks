import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Button, Card, CardActionArea, CardContent, Dialog, DialogActions,
  DialogContent, DialogTitle, Grid, Stack, TextField, Typography,
  AppBar, Toolbar,
} from '@mui/material'
import { Add, DataObject, FolderOpen } from '@mui/icons-material'
// uses theme palette via sx props

interface Workspace {
  id: string
  name: string
  plugin: string
  created: string
}

export default function WorkspacesPage() {
  const navigate = useNavigate()
  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => {
    const saved = localStorage.getItem('postit_workspaces')
    return saved ? JSON.parse(saved) : []
  })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState('')
  const [plugin, setPlugin] = useState('snf-instance-rest')

  const handleCreate = () => {
    const ws: Workspace = {
      id: crypto.randomUUID().slice(0, 8),
      name: name || 'untitled',
      plugin,
      created: new Date().toISOString(),
    }
    const updated = [...workspaces, ws]
    setWorkspaces(updated)
    localStorage.setItem('postit_workspaces', JSON.stringify(updated))
    setDialogOpen(false)
    setName('')
    navigate(`/workspace/${ws.id}`)
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header — gradient like cutip-desktop */}
      <AppBar
        position="static"
        elevation={0}
        sx={{
          bgcolor: '#000',
          borderBottom: 1, borderColor: 'divider',
        }}
      >
        <Toolbar sx={{ minHeight: 56, height: 56 }}>
          <DataObject sx={{ mr: 1, color: '#fff' }} />
          <Typography variant="h6" noWrap sx={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>
            post-it
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Content */}
      <Box sx={{ maxWidth: 900, mx: 'auto', p: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>Workspaces</Typography>
          <Button variant="contained" startIcon={<Add />} onClick={() => setDialogOpen(true)}>
            New Workspace
          </Button>
        </Stack>

        {workspaces.length === 0 ? (
          <Card
            sx={{
              p: 6,
              textAlign: 'center',
              bgcolor: 'background.paper',
              border: '1px dashed',
              borderColor: 'divider',
            }}
          >
            <FolderOpen sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
              No workspaces yet
            </Typography>
            <Typography color="text.secondary" fontSize={13} sx={{ mb: 3 }}>
              Create a workspace to start making API requests
            </Typography>
            <Button variant="contained" startIcon={<Add />} onClick={() => setDialogOpen(true)}>
              Create Workspace
            </Button>
          </Card>
        ) : (
          <Grid container spacing={2}>
            {workspaces.map((ws) => (
              <Grid item xs={4} key={ws.id}>
                <Card>
                  <CardActionArea onClick={() => navigate(`/workspace/${ws.id}`)}>
                    <CardContent>
                      <Typography variant="h6" sx={{ fontSize: 15, fontWeight: 600 }}>{ws.name}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
                        {ws.plugin}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: 11, mt: 1 }}>
                        {new Date(ws.created).toLocaleDateString()}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* Create dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Workspace</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              size="small"
              label="Workspace Name"
              placeholder="my-sfm-project"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              autoFocus
            />
            <TextField
              size="small"
              label="Plugin"
              value={plugin}
              onChange={(e) => setPlugin(e.target.value)}
              fullWidth
              helperText="e.g. snf-instance-rest"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}>Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
