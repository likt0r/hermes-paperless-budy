import type { NavigationMenuItem } from '@nuxt/ui'

export type AppNavItem = NavigationMenuItem & {
  to: string
}

export function useAppNavigation() {
  const items: AppNavItem[] = [
    {
      label: 'Analyze Single Document',
      icon: 'i-lucide-scan-text',
      to: '/analyze'
    },
    {
      label: 'Paperless Documents',
      icon: 'i-lucide-library',
      to: '/paperless-documents'
    },
    {
      label: 'Running Jobs',
      icon: 'i-lucide-activity',
      to: '/jobs'
    },
    {
      label: 'Settings',
      icon: 'i-lucide-settings',
      to: '/settings'
    }
  ]

  return { items }
}
