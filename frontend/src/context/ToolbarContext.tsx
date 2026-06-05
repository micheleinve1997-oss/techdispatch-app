import { createContext, useContext, useState, useCallback } from 'react'

interface ToolbarActions {
  onSave?: () => void
  onDelete?: () => void
  onReset?: () => void
  onEdit?: () => void
  canSave?: boolean
  canDelete?: boolean
  canReset?: boolean
  canEdit?: boolean
  isSaving?: boolean
  editMode?: boolean
}

interface ToolbarCtx {
  actions: ToolbarActions
  setActions: (a: ToolbarActions) => void
  clearActions: () => void
}

const ToolbarContext = createContext<ToolbarCtx>({
  actions: {},
  setActions: () => {},
  clearActions: () => {},
})

export function ToolbarProvider({ children }: { children: React.ReactNode }) {
  const [actions, setActionsState] = useState<ToolbarActions>({})

  const setActions = useCallback((a: ToolbarActions) => {
    setActionsState(a)
  }, [])

  const clearActions = useCallback(() => {
    setActionsState({})
  }, [])

  return (
    <ToolbarContext.Provider value={{ actions, setActions, clearActions }}>
      {children}
    </ToolbarContext.Provider>
  )
}

export const useToolbar = () => useContext(ToolbarContext)
