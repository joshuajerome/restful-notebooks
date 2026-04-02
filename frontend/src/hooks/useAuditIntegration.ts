import { useEffect, useRef } from 'react'
import { useAuditStore } from '../store/auditStore'
import { useWorkspaceStore } from '../store/workspaceStore'
import { useRequestStore } from '../store/requestStore'

/**
 * Hook that subscribes to store changes and logs them to the audit store.
 * Must be called once at the app shell level.
 */
export function useAuditIntegration() {
  const { log, load } = useAuditStore()
  const prevActiveId = useRef<string | null>(null)
  const prevWsCount = useRef<number>(0)

  // Load audit log on mount
  useEffect(() => { load() }, [])

  // Log session start
  useEffect(() => {
    log('session_start', 'Application started')
  }, [])

  // Track workspace changes
  const { workspaces, activeId, active } = useWorkspaceStore()

  useEffect(() => {
    // Track workspace count changes (created/deleted)
    if (prevWsCount.current > 0) {
      if (workspaces.length > prevWsCount.current) {
        const newest = workspaces[workspaces.length - 1]
        log('workspace_created', `Workspace "${newest.name}" created`, `id: ${newest.id}`)
      } else if (workspaces.length < prevWsCount.current) {
        log('workspace_deleted', 'Workspace deleted')
      }
    }
    prevWsCount.current = workspaces.length
  }, [workspaces.length])

  useEffect(() => {
    if (prevActiveId.current !== null && activeId !== prevActiveId.current) {
      log('workspace_switched', `Switched to "${active?.name || 'none'}"`, `id: ${activeId}`)
    }
    prevActiveId.current = activeId
  }, [activeId])

  // Track requests — subscribe to response changes
  const { response, method, endpointName } = useRequestStore()
  const prevResponseId = useRef<string>('')

  useEffect(() => {
    if (response && response.history_id && response.history_id !== prevResponseId.current) {
      prevResponseId.current = response.history_id
      log(
        'request_sent',
        `${method} ${endpointName} → ${response.status_code}`,
        `${response.duration_ms}ms`
      )
    }
  }, [response, method, endpointName])
}
