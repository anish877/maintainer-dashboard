export const metadata = {
  title: 'Repositories - Mosaic',
  description: 'Manage your GitHub repositories',
}

import { SelectedItemsProvider } from '@/app/selected-items-context'
import ReposContent from './repos-content'

export default function Repos() {
  return (
    <SelectedItemsProvider>
      <ReposContent />
    </SelectedItemsProvider>
  )
}