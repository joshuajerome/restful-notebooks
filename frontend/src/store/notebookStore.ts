import { create } from 'zustand'

// ── Block Types ─────────────────────────────────────────────────────────

export type BlockType = 'request' | 'extract' | 'variable'

interface BaseBlock {
  id: string
  type: BlockType
  label: string
}

export interface RequestBlock extends BaseBlock {
  type: 'request'
  method: string
  endpointName: string
  endpointPath: string
  params: Record<string, string>
  query: Record<string, string>
  payload: string
  description: string
  // Runtime only (stripped before save)
  response?: any
  running?: boolean
}

export interface ExtractBlock extends BaseBlock {
  type: 'extract'
  inputBlockId: string    // immutable ref to a request block
  referencePath: string   // e.g. response["items"][0]["id"]
  variableName: string
}

export interface VariableBlock extends BaseBlock {
  type: 'variable'
  key: string
  value: string
}

export type NotebookBlock = RequestBlock | ExtractBlock | VariableBlock

export interface Notebook {
  id: string
  name: string
  workspaceId: string
  blocks: NotebookBlock[]
  created: string
  updated: string
}

// ── Helpers ─────────────────────────────────────────────────────────────

const STORAGE_KEY = 'restful_notebooks'

function genId(): string {
  return crypto.randomUUID().slice(0, 8)
}

function deriveLabel(block: NotebookBlock, index: number): string {
  switch (block.type) {
    case 'request':
      return `step-${index + 1}: ${block.method || 'GET'} ${block.endpointName || 'New Request'}`
    case 'extract':
      return `extract → ${block.variableName || '?'}`
    case 'variable':
      return `var: ${block.key || '?'}`
  }
}

function createRequestBlock(partial?: Partial<RequestBlock>): RequestBlock {
  return {
    id: genId(), type: 'request', label: '',
    method: 'GET', endpointName: '', endpointPath: '',
    params: {}, query: {}, payload: '', description: '',
    ...partial,
  }
}

function createExtractBlock(inputBlockId: string, partial?: Partial<ExtractBlock>): ExtractBlock {
  return {
    id: genId(), type: 'extract', label: '',
    inputBlockId, referencePath: '', variableName: '',
    ...partial,
  }
}

function createVariableBlock(partial?: Partial<VariableBlock>): VariableBlock {
  return {
    id: genId(), type: 'variable', label: '',
    key: '', value: '',
    ...partial,
  }
}

/** Strip runtime state before persisting. */
function stripRuntime(blocks: NotebookBlock[]): NotebookBlock[] {
  return blocks.map((b) => {
    if (b.type === 'request') {
      const { response, running, ...rest } = b
      return rest as RequestBlock
    }
    return b
  })
}

/** Update labels based on current index positions. */
function refreshLabels(blocks: NotebookBlock[]): NotebookBlock[] {
  return blocks.map((b, i) => ({ ...b, label: deriveLabel(b, i) }))
}

/** Check if an extract block's input reference is valid. */
export function validateDependencies(blocks: NotebookBlock[]): Record<string, string> {
  const warnings: Record<string, string> = {}
  const idsBefore = new Set<string>()
  for (const b of blocks) {
    if (b.type === 'extract') {
      if (!idsBefore.has(b.inputBlockId)) {
        const ref = blocks.find((x) => x.id === b.inputBlockId)
        if (!ref) warnings[b.id] = 'Input block was deleted'
        else warnings[b.id] = `Input block "${ref.label}" is now after this block`
      }
    }
    idsBefore.add(b.id)
  }
  return warnings
}

// ── Migration from old WorkflowStep format ──────────────────────────────

function migrateOldFormat(data: any[]): Notebook[] {
  return data.map((wf) => {
    const blocks: NotebookBlock[] = []
    for (const step of wf.steps || []) {
      const req = createRequestBlock({
        id: step.id || genId(),
        method: step.method || 'GET',
        endpointName: step.endpointName || '',
        endpointPath: step.endpointPath || '',
        params: step.params || {},
        query: step.query || {},
        payload: step.payload || '',
        description: step.description || '',
      })
      blocks.push(req)

      // Convert extraction config to a separate ExtractBlock
      if (step.extractMode === 'reference' && step.extractReference) {
        blocks.push(createExtractBlock(req.id, {
          referencePath: step.extractReference,
          variableName: step.extractVariableName || '',
        }))
      }
    }
    return {
      id: wf.id || genId(),
      name: wf.name || 'Untitled',
      workspaceId: wf.workspaceId || '',
      blocks: refreshLabels(blocks),
      created: wf.created || new Date().toISOString(),
      updated: wf.updated || new Date().toISOString(),
    }
  })
}

// ── Store ───────────────────────────────────────────────────────────────

interface NotebookStore {
  notebooks: Notebook[]
  editing: Notebook | null

  load: () => void
  create: (name: string, workspaceId: string) => Notebook
  update: (id: string, patch: Partial<Notebook>) => void
  remove: (id: string) => void
  duplicate: (id: string) => Notebook

  setEditing: (nb: Notebook) => void
  saveEditing: () => void
  cancelEditing: () => void

  addBlock: (type: BlockType) => void
  updateBlock: (blockId: string, patch: Partial<NotebookBlock>) => void
  removeBlock: (blockId: string) => void
  moveBlock: (fromIndex: number, toIndex: number) => void
}

export const useNotebookStore = create<NotebookStore>((set, get) => {
  const persist = () => {
    const { notebooks } = get()
    const clean = notebooks.map((nb) => ({
      ...nb,
      blocks: stripRuntime(nb.blocks),
    }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean))
  }

  return {
    notebooks: [],
    editing: null,

    load: () => {
      const raw = localStorage.getItem(STORAGE_KEY)
      let notebooks: Notebook[] = []
      try { notebooks = raw ? JSON.parse(raw) : [] } catch { notebooks = [] }

      // Migrate from old workflow format
      if (notebooks.length === 0) {
        const old = localStorage.getItem('postit_workflows')
        if (old) {
          try {
            const parsed = JSON.parse(old)
            notebooks = migrateOldFormat(parsed)
          } catch { /* ignore */ }
        }
      }

      // Ensure all blocks have labels
      notebooks = notebooks.map((nb) => ({
        ...nb,
        blocks: refreshLabels(nb.blocks),
      }))

      set({ notebooks })
      persist()
    },

    create: (name, workspaceId) => {
      const nb: Notebook = {
        id: genId(), name, workspaceId,
        blocks: [], created: new Date().toISOString(), updated: new Date().toISOString(),
      }
      set((s) => ({ notebooks: [...s.notebooks, nb] }))
      persist()
      return nb
    },

    update: (id, patch) => {
      set((s) => ({
        notebooks: s.notebooks.map((nb) => nb.id === id ? { ...nb, ...patch, updated: new Date().toISOString() } : nb),
      }))
      persist()
    },

    remove: (id) => {
      set((s) => ({
        notebooks: s.notebooks.filter((nb) => nb.id !== id),
        editing: s.editing?.id === id ? null : s.editing,
      }))
      persist()
    },

    duplicate: (id) => {
      const src = get().notebooks.find((nb) => nb.id === id)
      if (!src) throw new Error('Notebook not found')
      const nb: Notebook = {
        ...src,
        id: genId(),
        name: `${src.name} (copy)`,
        blocks: refreshLabels(src.blocks.map((b) => ({ ...b, id: genId() }))),
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      }
      set((s) => ({ notebooks: [...s.notebooks, nb] }))
      persist()
      return nb
    },

    setEditing: (nb) => set({ editing: { ...nb } }),

    saveEditing: () => {
      const { editing } = get()
      if (!editing) return
      const saved = {
        ...editing,
        blocks: refreshLabels(stripRuntime(editing.blocks)),
        updated: new Date().toISOString(),
      }
      set((s) => ({
        notebooks: s.notebooks.map((nb) => nb.id === saved.id ? saved : nb),
        editing: null,
      }))
      persist()
    },

    cancelEditing: () => set({ editing: null }),

    addBlock: (type) => {
      const { editing } = get()
      if (!editing) return

      let block: NotebookBlock
      if (type === 'request') {
        block = createRequestBlock()
      } else if (type === 'extract') {
        // Find the last request block to reference
        const lastReq = [...editing.blocks].reverse().find((b) => b.type === 'request')
        block = createExtractBlock(lastReq?.id || '')
      } else {
        block = createVariableBlock()
      }

      const blocks = refreshLabels([...editing.blocks, block])
      set({ editing: { ...editing, blocks } })
    },

    updateBlock: (blockId, patch) => {
      const { editing } = get()
      if (!editing) return
      const blocks = refreshLabels(
        editing.blocks.map((b) => b.id === blockId ? { ...b, ...patch } as NotebookBlock : b)
      )
      set({ editing: { ...editing, blocks } })
    },

    removeBlock: (blockId) => {
      const { editing } = get()
      if (!editing) return
      const blocks = refreshLabels(editing.blocks.filter((b) => b.id !== blockId))
      set({ editing: { ...editing, blocks } })
    },

    moveBlock: (fromIndex, toIndex) => {
      const { editing } = get()
      if (!editing) return
      const blocks = [...editing.blocks]
      const [moved] = blocks.splice(fromIndex, 1)
      blocks.splice(toIndex, 0, moved)
      set({ editing: { ...editing, blocks: refreshLabels(blocks) } })
    },
  }
})
