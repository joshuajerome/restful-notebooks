import { create } from 'zustand'

export interface WorkflowStep {
  id: string
  method: string
  endpointName: string
  endpointPath: string
  params: Record<string, string>
  query: Record<string, string>
  payload: string
  // Data mapping: extract from previous step response
  extractFrom?: string  // e.g. 'response["BlueprintTemplate"][0]'
  extractKey?: string   // e.g. 'BlueprintTemplateId'
  injectAs?: string     // e.g. 'payload.GpuBlueprintCatalogId' or 'params.id'
  description: string
}

export interface Workflow {
  id: string
  name: string
  workspaceId: string
  steps: WorkflowStep[]
  created: string
  updated: string
}

const STORAGE_KEY = 'postit_workflows'

function loadAll(): Workflow[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
function saveAll(workflows: Workflow[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows))
}

interface WorkflowStore {
  workflows: Workflow[]
  editing: Workflow | null
  load: () => void
  create: (name: string, workspaceId: string) => Workflow
  update: (id: string, patch: Partial<Workflow>) => void
  remove: (id: string) => void
  duplicate: (id: string) => Workflow
  setEditing: (wf: Workflow | null) => void
  addStep: (step?: Partial<WorkflowStep>) => void
  updateStep: (stepId: string, patch: Partial<WorkflowStep>) => void
  removeStep: (stepId: string) => void
  moveStep: (stepId: string, direction: 'up' | 'down') => void
  saveEditing: () => void
  cancelEditing: () => void
}

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  workflows: [],
  editing: null,

  load: () => set({ workflows: loadAll() }),

  create: (name, workspaceId) => {
    const wf: Workflow = {
      id: crypto.randomUUID().slice(0, 8),
      name, workspaceId,
      steps: [],
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    }
    set((s) => {
      const workflows = [...s.workflows, wf]
      saveAll(workflows)
      return { workflows }
    })
    return wf
  },

  update: (id, patch) => {
    set((s) => {
      const workflows = s.workflows.map((w) => w.id === id ? { ...w, ...patch, updated: new Date().toISOString() } : w)
      saveAll(workflows)
      return { workflows }
    })
  },

  remove: (id) => {
    set((s) => {
      const workflows = s.workflows.filter((w) => w.id !== id)
      saveAll(workflows)
      return { workflows }
    })
  },

  duplicate: (id) => {
    const src = get().workflows.find((w) => w.id === id)
    if (!src) throw new Error('Workflow not found')
    const wf: Workflow = {
      ...JSON.parse(JSON.stringify(src)),
      id: crypto.randomUUID().slice(0, 8),
      name: `${src.name} (copy)`,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    }
    set((s) => {
      const workflows = [...s.workflows, wf]
      saveAll(workflows)
      return { workflows }
    })
    return wf
  },

  setEditing: (wf) => set({ editing: wf ? JSON.parse(JSON.stringify(wf)) : null }),

  addStep: (partial) => {
    set((s) => {
      if (!s.editing) return s
      const step: WorkflowStep = {
        id: crypto.randomUUID().slice(0, 8),
        method: 'GET',
        endpointName: '',
        endpointPath: '',
        params: {},
        query: {},
        payload: '{}',
        description: '',
        ...partial,
      }
      return { editing: { ...s.editing, steps: [...s.editing.steps, step] } }
    })
  },

  updateStep: (stepId, patch) => {
    set((s) => {
      if (!s.editing) return s
      return { editing: { ...s.editing, steps: s.editing.steps.map((st) => st.id === stepId ? { ...st, ...patch } : st) } }
    })
  },

  removeStep: (stepId) => {
    set((s) => {
      if (!s.editing) return s
      return { editing: { ...s.editing, steps: s.editing.steps.filter((st) => st.id !== stepId) } }
    })
  },

  moveStep: (stepId, direction) => {
    set((s) => {
      if (!s.editing) return s
      const steps = [...s.editing.steps]
      const idx = steps.findIndex((st) => st.id === stepId)
      if (idx < 0) return s
      const target = direction === 'up' ? idx - 1 : idx + 1
      if (target < 0 || target >= steps.length) return s
      ;[steps[idx], steps[target]] = [steps[target], steps[idx]]
      return { editing: { ...s.editing, steps } }
    })
  },

  saveEditing: () => {
    const { editing } = get()
    if (!editing) return
    get().update(editing.id, { steps: editing.steps, name: editing.name })
    set({ editing: null })
  },

  cancelEditing: () => set({ editing: null }),
}))
