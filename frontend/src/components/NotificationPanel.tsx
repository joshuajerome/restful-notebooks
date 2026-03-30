import {
  Box, Chip, Drawer, IconButton, List, ListItem, ListItemText,
  Stack, Toolbar, Typography,
} from '@mui/material'
import { Close, DeleteSweep } from '@mui/icons-material'
import { useNotificationStore } from '../store/notificationStore'

const PANEL_WIDTH = 360

const SEVERITY_COLOR: Record<string, string> = {
  success: '#38A169',
  info: '#3B7DD8',
  warning: '#C77D1A',
  error: '#C53030',
}

export default function NotificationPanel() {
  const { notifications, panelOpen, closePanel, markAllRead, clear } = useNotificationStore()

  return (
    <Drawer
      anchor="right"
      open={panelOpen}
      onClose={closePanel}
      variant="persistent"
      sx={{
        '& .MuiDrawer-paper': {
          width: PANEL_WIDTH, boxSizing: 'border-box',
          borderLeft: 1, borderColor: 'divider',
        },
      }}
    >
      <Toolbar sx={{ minHeight: 56 }} />
      <Box sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6">Notifications</Typography>
          <Stack direction="row" spacing={0.5}>
            <IconButton size="small" onClick={() => { markAllRead(); clear() }}>
              <DeleteSweep sx={{ fontSize: 18 }} />
            </IconButton>
            <IconButton size="small" onClick={closePanel}>
              <Close sx={{ fontSize: 18 }} />
            </IconButton>
          </Stack>
        </Stack>

        {notifications.length === 0 ? (
          <Typography color="text.secondary" fontSize={13} sx={{ textAlign: 'center', py: 4 }}>
            No notifications
          </Typography>
        ) : (
          <List dense disablePadding>
            {notifications.map((n) => (
              <ListItem key={n.id} sx={{ px: 0, py: 0.5, opacity: n.read ? 0.6 : 1 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: SEVERITY_COLOR[n.severity] || '#888', mr: 1.5, flexShrink: 0 }} />
                <ListItemText
                  primary={n.message}
                  secondary={new Date(n.timestamp).toLocaleTimeString()}
                  primaryTypographyProps={{ fontSize: 13 }}
                  secondaryTypographyProps={{ fontSize: 11 }}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </Drawer>
  )
}
