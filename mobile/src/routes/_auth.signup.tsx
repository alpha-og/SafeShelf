import { createFileRoute } from '@tanstack/react-router'
import { AuthPage } from '@/features/auth/components/AuthPage'
import { SignUpForm } from '@/features/auth/components/SignUpForm'
import { AuthToggle } from '@/features/auth/components/AuthToggle'

export const Route = createFileRoute('/_auth/signup')({
  component: SignUpRoute,
})

function SignUpRoute() {
  return (
    <AuthPage
      title="Create an account"
      description="Sign up for SafeShelf"
      toggle={<AuthToggle type="signup" />}
    >
      <SignUpForm />
    </AuthPage>
  )
}
