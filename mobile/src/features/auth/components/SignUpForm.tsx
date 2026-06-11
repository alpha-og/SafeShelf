import { useForm } from '@tanstack/react-form'
import { signUpSchema, type SignUpInput } from '../schemas/auth'
import { useSignUp } from '../hooks/useSignUp'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function SignUpForm() {
  const signUpMutation = useSignUp()

  const form = useForm({
    defaultValues: { email: '', password: '' } as SignUpInput,
    validators: {
      onChange: signUpSchema,
    },
    onSubmit: async ({ value }) => {
      await signUpMutation.mutateAsync(value)
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

      {signUpMutation.isError && (
        <p className="text-sm text-destructive">
          {((signUpMutation.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail) ?? signUpMutation.error.message ?? 'Sign up failed'}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={signUpMutation.isPending}>
        {signUpMutation.isPending ? 'Creating account...' : 'Create account'}
      </Button>
    </form>
  )
}
