import { useForm } from '@tanstack/react-form'
import { FormError } from '@/components/FormError'
import { FormField } from '@/components/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSignUp } from '../hooks/useSignUp'
import { type SignUpInput, signUpSchema } from '../schemas/auth'

export function SignUpForm() {
  const signUpMutation = useSignUp()

  const form = useForm({
    defaultValues: { email: '', password: '' } as SignUpInput,
    validators: {
      onChange: signUpSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        await signUpMutation.mutateAsync(value)
      } catch {
        // TanStack Query already sets isError/error — FormError reads it
      }
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
          <FormField
            label="Email"
            error={
              field.state.meta.errors
                ? field.state.meta.errors
                    .map((e) => (typeof e === 'string' ? e : (e as { message: string }).message))
                    .join(', ')
                : null
            }
          >
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
          <FormField
            label="Password"
            error={
              field.state.meta.errors
                ? field.state.meta.errors
                    .map((e) => (typeof e === 'string' ? e : (e as { message: string }).message))
                    .join(', ')
                : null
            }
          >
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

      <FormError
        error={signUpMutation.isError ? signUpMutation.error : null}
        fallback="Sign up failed"
      />

      <Button
        type="submit"
        className="w-full hover:scale-[1.02]"
        disabled={signUpMutation.isPending}
      >
        {signUpMutation.isPending ? 'Creating account...' : 'Create account'}
      </Button>
    </form>
  )
}
