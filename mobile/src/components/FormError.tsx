interface FormErrorProps {
  error: Error | null
  fallback?: string
}

export function FormError({ error, fallback = 'Something went wrong' }: FormErrorProps) {
  if (!error) return null

  const detail =
    (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
    error.message ??
    fallback

  return <p className="text-sm text-destructive">{detail}</p>
}
