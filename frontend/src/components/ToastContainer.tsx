import { useEffect, useState } from 'react'
import { Alert, Snackbar, Stack } from '@mui/material'
import { useNotificationStore, Notification } from '../store/notificationStore'

export default function ToastContainer() {
  const { notifications } = useNotificationStore()
  const [visible, setVisible] = useState<Notification[]>([])

  useEffect(() => {
    if (notifications.length === 0) return
    const latest = notifications[0]
    if (latest && !latest.read) {
      setVisible((v) => {
        if (v.find((n) => n.id === latest.id)) return v
        return [latest, ...v].slice(0, 3)
      })
      const timer = setTimeout(() => {
        setVisible((v) => v.filter((n) => n.id !== latest.id))
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [notifications])

  return (
    <Stack spacing={1} sx={{ position: 'fixed', bottom: 40, right: 16, zIndex: 9999, maxWidth: 380 }}>
      {visible.map((n) => (
        <Snackbar key={n.id} open anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
          <Alert severity={n.severity} variant="filled" sx={{ fontSize: 13, width: '100%' }}>
            {n.message}
          </Alert>
        </Snackbar>
      ))}
    </Stack>
  )
}
