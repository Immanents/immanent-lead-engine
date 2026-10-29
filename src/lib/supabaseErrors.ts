interface SupabaseErrorLike {
  code?: unknown
  message?: unknown
}

export function isMissingRpcError(error: unknown, functionName: string): boolean {
  if (!error || typeof error !== 'object') return false

  const { code, message } = error as SupabaseErrorLike
  return (
    code === 'PGRST202'
    && typeof message === 'string'
    && message.toLowerCase().includes(functionName.toLowerCase())
  )
}
