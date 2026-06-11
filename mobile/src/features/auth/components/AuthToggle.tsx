import { Link } from '@tanstack/react-router'

export function AuthToggle({ type }: { type: 'signin' | 'signup' }) {
  if (type === 'signin') {
    return (
      <p>
        Don't have an account?{' '}
        <Link to="/signup" className="font-medium text-primary hover:underline">
          Sign up
        </Link>
      </p>
    )
  }
  return (
    <p>
      Already have an account?{' '}
      <Link to="/signin" className="font-medium text-primary hover:underline">
        Sign in
      </Link>
    </p>
  )
}
