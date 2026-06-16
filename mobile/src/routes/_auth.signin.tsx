import { createFileRoute } from '@tanstack/react-router'
import { AuthPage } from '@/features/auth/components/AuthPage'
import { AuthToggle } from '@/features/auth/components/AuthToggle'
import { SignInForm } from '@/features/auth/components/SignInForm'

export const Route = createFileRoute('/_auth/signin')({
  component: SignInRoute,
})

function SignInRoute() {
  return (
    <AuthPage
      title="Welcome back"
      description="Sign in to your SafeShelf account"
      toggle={<AuthToggle type="signin" />}
    >
      <SignInForm />
    </AuthPage>
  )
}
