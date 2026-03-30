import { useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  alpha, Badge, Box, Button, Chip, Divider, Drawer, IconButton, List,
  ListItemButton, ListItemIcon, ListItemText, ListSubheader, Menu, MenuItem,
  AppBar, Toolbar, Tooltip, ToggleButtonGroup, ToggleButton, Typography,
} from '@mui/material'
import {
  Add, Api, ArrowBack, ArrowForward, ChevronLeft, Dashboard, DataObject,
  DarkMode, History, LightMode, Menu as MenuIcon, Notifications,
  SettingsBrightness, Workspaces as WorkspacesIcon,
  AccountTree, Receipt,
} from '@mui/icons-material'
import { useState } from 'react'
import { useThemeStore, ThemeId } from '../store/themeStore'
import { useWorkspaceStore, Workspace } from '../store/workspaceStore'
import { useNotificationStore } from '../store/notificationStore'
import { useNavStore } from '../store/navStore'
import NotificationPanel from './NotificationPanel'
import ToastContainer from './ToastContainer'
import { useAuditIntegration } from '../hooks/useAuditIntegration'

const DRAWER_WIDTH = 200
const DRAWER_WIDTH_COLLAPSED = 56
const FOOTER_HEIGHT = 28

export default function WorkspaceLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { themeId, sidebarCollapsed, setTheme, toggleSidebar } = useThemeStore()
  const { workspaces, active, activeId, setActive, load, create } = useWorkspaceStore()
  const { panelOpen, togglePanel, unreadCount } = useNotificationStore()
  const { push, canGoBack, canGoForward, goBack, goForward } = useNavStore()
  const drawerWidth = sidebarCollapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH
  const [wsSwitcherAnchor, setWsSwitcherAnchor] = useState<null | HTMLElement>(null)

  useAuditIntegration()
  useEffect(() => { load() }, [])
  useEffect(() => { push(location.pathname) }, [location.pathname])

  const handleBack = () => { const p = goBack(); if (p) navigate(p) }
  const handleForward = () => { const p = goForward(); if (p) navigate(p) }

  const handleNewRequest = () => {
    if (!active) {
      const ws = create('default')
      setActive(ws.id)
    }
    navigate('/app/request')
  }

  const handleSwitchWorkspace = (ws: Workspace) => {
    setActive(ws.id)
    setWsSwitcherAnchor(null)
  }

  const isActive = (path: string) => location.pathname === `/app${path}` || location.pathname.startsWith(`/app${path}/`)
  const hasActiveWs = !!active

  const navTo = (path: string) => navigate(`/app${path}`)

  const renderNavItem = (label: string, icon: JSX.Element, path: string, disabled = false) => {
    const act = isActive(path)
    return (
      <Tooltip key={path} title={sidebarCollapsed ? label : (disabled ? 'Select a workspace first' : '')} placement="right">
        <span>
          <ListItemButton
            selected={act}
            disabled={disabled}
            onClick={() => navTo(path)}
            sx={sidebarCollapsed ? { justifyContent: 'center', px: 1.5 } : {}}
          >
            <ListItemIcon sx={{ minWidth: sidebarCollapsed ? 'auto' : 30, justifyContent: 'center', color: act ? 'primary.main' : disabled ? 'text.disabled' : 'text.secondary' }}>
              {icon}
            </ListItemIcon>
            {!sidebarCollapsed && (
              <ListItemText primary={label} primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 500, color: disabled ? 'text.disabled' : 'text.primary' }} />
            )}
          </ListItemButton>
        </span>
      </Tooltip>
    )
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* AppBar */}
      <AppBar position="fixed" elevation={0}
        sx={{ zIndex: (t) => t.zIndex.drawer + 2, bgcolor: '#000', borderBottom: 1, borderColor: 'divider', height: 56 }}>
        <Toolbar sx={{ minHeight: 56, height: 56, gap: 0.5 }}>
          <Box onClick={() => navTo('/dashboard')} sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', mr: 1 }}>
            <DataObject sx={{ mr: 0.5, color: '#fff', fontSize: 20 }} />
            <Typography noWrap sx={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>post-it</Typography>
          </Box>

          {/* Nav arrows */}
          <IconButton size="small" disabled={!canGoBack()} onClick={handleBack} sx={{ color: 'rgba(255,255,255,0.6)' }}>
            <ArrowBack sx={{ fontSize: 18 }} />
          </IconButton>
          <IconButton size="small" disabled={!canGoForward()} onClick={handleForward} sx={{ color: 'rgba(255,255,255,0.6)' }}>
            <ArrowForward sx={{ fontSize: 18 }} />
          </IconButton>

          {/* Active workspace pill */}
          {active && (
            <Chip
              label={active.name}
              size="small"
              onClick={() => navTo('/workspaces')}
              sx={{
                ml: 1, bgcolor: 'transparent', border: '1.5px solid',
                borderColor: active.color, color: active.color,
                fontWeight: 600, fontSize: 12, cursor: 'pointer',
                '&:hover': { bgcolor: alpha(active.color, 0.1) },
              }}
            />
          )}

          {/* Workspace switcher dropdown */}
          <IconButton size="small" onClick={(e) => setWsSwitcherAnchor(e.currentTarget)} sx={{ color: 'rgba(255,255,255,0.5)', ml: 0.5 }}>
            <WorkspacesIcon sx={{ fontSize: 16 }} />
          </IconButton>
          <Menu anchorEl={wsSwitcherAnchor} open={Boolean(wsSwitcherAnchor)} onClose={() => setWsSwitcherAnchor(null)}>
            {workspaces.map((ws) => (
              <MenuItem key={ws.id} onClick={() => handleSwitchWorkspace(ws)} selected={ws.id === activeId} sx={{ fontSize: 13 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: ws.color, mr: 1.5 }} />
                {ws.name}
              </MenuItem>
            ))}
          </Menu>

          <Box sx={{ flex: 1 }} />

          {/* Notifications */}
          <Tooltip title="Notifications">
            <IconButton onClick={togglePanel} sx={{ color: 'rgba(255,255,255,0.7)' }}>
              <Badge badgeContent={unreadCount()} color="error" variant="dot">
                <Notifications sx={{ fontSize: 18 }} />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* + Request */}
          <Button variant="contained" size="small" startIcon={<Add />} onClick={handleNewRequest}
            sx={{ ml: 1, fontSize: 12, px: 1.5, py: 0.5, minHeight: 30 }}>
            Request
          </Button>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Drawer variant="permanent"
        sx={{
          width: drawerWidth, transition: 'width 0.2s', flexShrink: 0,
          '& .MuiDrawer-paper': { width: drawerWidth, transition: 'width 0.2s', boxSizing: 'border-box', overflowX: 'hidden', display: 'flex', flexDirection: 'column' },
        }}>
        <Toolbar sx={{ minHeight: 56 }} />

        {/* Core */}
        <List dense disablePadding>
          {renderNavItem('Dashboard', <Dashboard fontSize="small" />, '/dashboard')}
          {renderNavItem('Workspaces', <WorkspacesIcon fontSize="small" />, '/workspaces')}
        </List>

        {/* Workspace section */}
        {sidebarCollapsed
          ? <Divider sx={{ mx: 1, my: 0.5 }} />
          : <ListSubheader sx={{ lineHeight: '28px', fontSize: 10, fontWeight: 600, letterSpacing: 1, px: 2.5, bgcolor: 'transparent' }}>WORKSPACE</ListSubheader>
        }
        <List dense disablePadding>
          {renderNavItem('Endpoints', <Api fontSize="small" />, '/endpoints', !hasActiveWs)}
          {renderNavItem('Workflows', <AccountTree fontSize="small" />, '/workflows', !hasActiveWs)}
        </List>

        {/* Activity section */}
        {sidebarCollapsed
          ? <Divider sx={{ mx: 1, my: 0.5 }} />
          : <ListSubheader sx={{ lineHeight: '28px', fontSize: 10, fontWeight: 600, letterSpacing: 1, px: 2.5, bgcolor: 'transparent' }}>ACTIVITY</ListSubheader>
        }
        <List dense disablePadding sx={{ flex: 1 }}>
          {renderNavItem('History', <History fontSize="small" />, '/history', !hasActiveWs)}
          {renderNavItem('Audit Log', <Receipt fontSize="small" />, '/audit')}
        </List>

        {/* Theme toggle */}
        <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
          {sidebarCollapsed ? (
            <Tooltip title="Toggle theme" placement="right">
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                <IconButton size="small" onClick={() => setTheme(themeId === 'dark' ? 'light' : 'dark')} sx={{ color: 'text.secondary' }}>
                  {themeId === 'dark' ? <LightMode sx={{ fontSize: 18 }} /> : <DarkMode sx={{ fontSize: 18 }} />}
                </IconButton>
              </Box>
            </Tooltip>
          ) : (
            <Box sx={{ px: 1.5, py: 1 }}>
              <ToggleButtonGroup value={themeId} exclusive onChange={(_, v) => v && setTheme(v as ThemeId)} size="small" fullWidth
                sx={{ '& .MuiToggleButton-root': { py: 0.3, px: 1, fontSize: '0.65rem', textTransform: 'none', borderColor: 'divider' } }}>
                <ToggleButton value="dark"><Tooltip title="Dark"><DarkMode sx={{ fontSize: 14 }} /></Tooltip></ToggleButton>
                <ToggleButton value="light"><Tooltip title="Light"><LightMode sx={{ fontSize: 14 }} /></Tooltip></ToggleButton>
                <ToggleButton value="system"><Tooltip title="System"><SettingsBrightness sx={{ fontSize: 14 }} /></Tooltip></ToggleButton>
              </ToggleButtonGroup>
            </Box>
          )}
        </Box>
      </Drawer>

      {/* Collapse button */}
      <IconButton onClick={toggleSidebar} size="small"
        sx={{
          position: 'fixed', left: drawerWidth - 12, top: 132,
          zIndex: (t) => t.zIndex.drawer + 3, width: 24, height: 24, borderRadius: '50%',
          bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', color: 'text.secondary',
          transition: 'left 0.2s, background-color 0.15s',
          '&:hover': { bgcolor: 'primary.main', color: '#fff', borderColor: 'primary.main' },
        }}>
        {sidebarCollapsed ? <MenuIcon sx={{ fontSize: 14 }} /> : <ChevronLeft sx={{ fontSize: 14 }} />}
      </IconButton>

      {/* Main content area — scrollbar confined here */}
      <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, mt: '56px', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>
        <Box component="main" sx={{ flexGrow: 1, p: 3, overflow: 'auto', bgcolor: 'background.default' }}>
          <Outlet />
        </Box>

        {/* Footer */}
        <Box sx={{
          height: FOOTER_HEIGHT, minHeight: FOOTER_HEIGHT, display: 'flex', alignItems: 'center',
          px: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper',
        }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
            {active ? active.name : 'no workspace'} — post-it v0.1.0 — post-it-desktop v0.1.0
          </Typography>
        </Box>
      </Box>

      {/* Notification panel */}
      <NotificationPanel />

      {/* Toast container */}
      <ToastContainer />
    </Box>
  )
}
