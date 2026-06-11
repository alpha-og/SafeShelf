import { useForm } from '@tanstack/react-form'
import { signInSchema, type SignInInput } from '../schemas/auth'
import { useSignIn } from '../hooks/useSignIn'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function SignInForm() {
  const signInMutation = useSignIn()

  const form = useForm({
    defaultValues: { email: '', password: '' } as SignInInput,
    validators: {
      onChange: signInSchema,
    },
    onSubmit: async ({ value }) => {
      await signInMutation.mutateAsync(value)
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
      className="space-y-4"
    >
      <form.Field name="email">
        {(field) => (
          <div className="space-y-1">
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              placeholder="you@example.com"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            {field.state.meta.errors ? (
              <p className="text-sm text-destructive">
                {field.state.meta.errors.map((e) => (typeof e === 'string' ? e : (e as { message: string }).message)).join(', ')}
              </p>
            ) : null}
          </div>
        )}
      </form.Field>

      <form.Field name="password">
        {(field) => (
          <div className="space-y-1">
            <label className="text-sm font-medium">Password</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            {field.state.meta.errors ? (
              <p className="text-sm text-destructive">
                {field.state.meta.errors.map((e) => (typeof e === 'string' ? e : (e as { message: string }).message)).join(', ')}
              </p>
            ) : null}
          </div>
        )}
      </form.Field>

      {signInMutation.isError && (
        <p className="text-sm text-destructive">
          {((signInMutation.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail) ?? signInMutation.error.message ?? 'Sign in failed'}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={signInMutation.isPending}>
        {signInMutation.isPending ? 'Signing in...' : 'Sign in'}
      </Button>
    </form>
  )
}
