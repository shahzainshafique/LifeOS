'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'

import { AnimatedGradientText } from '@/components/ui/animated-gradient-text'
import { BlurFade } from '@/components/ui/blur-fade'
import { BorderBeam } from '@/components/ui/border-beam'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { FlickeringGrid } from '@/components/ui/flickering-grid'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const form = new FormData(e.currentTarget)

    const { error } = await supabase.auth.signUp({
      email: form.get('email') as string,
      password: form.get('password') as string,
      options: {
        data: { full_name: form.get('full_name') as string },
      },
    })

    setIsLoading(false)

    if (error) return setError(error.message)
    router.push('/dashboard')
  }

  return (
    <div className="relative flex min-h-svh w-full items-center justify-center overflow-hidden bg-background p-4">
      <div className="pointer-events-none fixed inset-0 z-0">
        <FlickeringGrid
          className="h-full w-full [mask-image:radial-gradient(700px_circle_at_center,white,transparent)] [-webkit-mask-image:radial-gradient(700px_circle_at_center,white,transparent)]"
          squareSize={4}
          gridGap={6}
          color="#3b82f6"
          maxOpacity={1}
          flickerChance={0.1}
        />
      </div>

      <div className="pointer-events-none fixed inset-0 z-[1] bg-background/45 backdrop-blur-[2px]" />

      <BlurFade delay={0.1} className="relative z-10 w-full max-w-md">
        <Card className="relative overflow-hidden border-border/60 bg-card/90 shadow-2xl backdrop-blur-xl">
          <BorderBeam duration={8} size={250} />

          <CardContent className="space-y-6 pb-2 pt-8">
            <div className="flex flex-col items-center space-y-3 text-center">
              <AnimatedGradientText className="text-sm font-medium">
                Welcome to LifeOS
              </AnimatedGradientText>

              <h1 className="font-heading text-3xl font-bold tracking-tight">
                Create your workspace
              </h1>

              <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                Organize tasks, notes, finances, and your life in one place.
              </p>
            </div>

            <form onSubmit={handleSignup} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full name</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  placeholder="John Doe"
                  autoComplete="name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="john@example.com"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>

              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}

              <Button
                className="w-full"
                size="lg"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? 'Creating workspace...' : 'Create workspace'}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 pb-8">
            <Separator />
            <p className="w-full text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link
                href="/login"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </BlurFade>
    </div>
  )
}
