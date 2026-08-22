import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TaskService } from '@/lib/services/task'
import TasksClient from './tasks-client'

export const metadata = {
  title: 'Tasks | ForecourIQ DMS',
}

export default async function TasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('dealership_id')
    .eq('id', user.id)
    .single()

  if (!profile?.dealership_id) redirect('/onboarding')

  const tasks = await TaskService.list(profile.dealership_id)

  return <TasksClient initialTasks={tasks} />
}
