import { useEffect, useRef, useState } from 'react'
import { Alert, Stack } from '@mui/material'
import { useNotificationStore, Notification } from '../store/notificationStore'

export default function ToastContainer() {
  const { notifications } = useNotificationStore()
  const [visible, setVisible] = useState<Notification[]>([])
  const seenRef = useRef(new Set<string>())

  useEffect(() => {
    const latest = notifications[0]
    if (!latest || seenRef.current.has(latest.id)) return

    seenRef.current.add(latest.id)
    setVisible((v) => [latest, ...v].slice(0, 3))

    setTimeout(() => {
      setVisible((v) => v.filter((n) => n.id !== latest.id))
    }, 4000)
  }, [notifications.length, notifications[0]?.id])

  return (
    <Stack spacing={1} sx={{ position: 'fixed', bottom: 40, right: 16, zIndex: 9999, maxWidth: 380 }}>
      {visible.map((n) => (
        <Alert key={n.id} severity={n.severity} variant="filled" sx={{ fontSize: 13 }}>
          {n.message}
        </Alert>
      ))}
    </Stack>
  )
}
