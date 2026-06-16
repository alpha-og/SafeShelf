import { useForm } from '@tanstack/react-form'
import { signInSchema, type SignInInput } from '../schemas/auth'
import { useSignIn } from '../hooks/useSignIn'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/FormField'
import { FormError } from '@/components/FormError'

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
          <FormField label="Email" error={field.state.meta.errors ? field.state.meta.errors.map((e) => (typeof e === 'string' ? e : (e as { message: string }).message)).join(', ') : null}>
            <Input
              type="email"
              placeholder="you@example.com"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </FormField>
        )}
      </form.Field>

      <form.Field name="password">
        {(field) => (
          <FormField label="Password" error={field.state.meta.errors ? field.state.meta.errors.map((e) => (typeof e === 'string' ? e : (e as { message: string }).message)).join(', ') : null}>
            <Input
              type="password"
              placeholder="••••••••"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </FormField>
        )}
      </form.Field>

      <FormError error={signInMutation.isError ? signInMutation.error : null} fallback="Sign in failed" />

      <Button type="submit" className="w-full hover:scale-[1.02]" disabled={signInMutation.isPending}>
        {signInMutation.isPending ? 'Signing in...' : 'Sign in'}
      </Button>
    </form>
  )
}
