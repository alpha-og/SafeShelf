import type { ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface AuthPageProps {
  title: string
  description: string
  children: ReactNode
  toggle: ReactNode
}

export function AuthPage({ title, description, children, toggle }: AuthPageProps) {
  return (
    <div className="flex flex-1 min-h-0 items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          {children}
          <div className="mt-4 text-center text-sm">{toggle}</div>
        </CardContent>
      </Card>
    </div>
  )
}
