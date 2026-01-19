import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OSRoot } from '@/core/os/OSRoot'
import { AuthProvider } from '@/lib/auth/AuthContext'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth/login')
  }

  return (
    <AuthProvider>
      <OSRoot />
    </AuthProvider>
  )
}
