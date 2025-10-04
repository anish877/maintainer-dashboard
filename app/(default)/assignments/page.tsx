export const metadata = {
  title: 'Assignments - Fork-Aware Cookie Licking Detection',
  description: 'Monitor GitHub issue assignments and detect work in forks',
}

import { SelectedItemsProvider } from '@/app/selected-items-context'
import AssignmentsContent from './assignments-content'

export default function Assignments() {
  return (
    <SelectedItemsProvider>
      <AssignmentsContent />
    </SelectedItemsProvider>
  )
}
