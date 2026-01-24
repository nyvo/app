import { Spinner } from '@/components/ui/spinner'

export const PageLoader = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <Spinner size="xl" />
    </div>
  )
}
