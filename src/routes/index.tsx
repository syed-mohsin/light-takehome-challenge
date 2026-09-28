import {
  createFileRoute,
  useRouter,
  useRouterState,
} from '@tanstack/react-router'
import { DashboardSearchSchema } from '../domain/energy'
import {
  DashboardContainer,
  DashboardError,
} from '../features/dashboard/dashboard-container'
import { DATA_VERSIONS } from '../generated/data-versions'
import { getEnergyWindow } from '../server/functions/energy'

export const Route = createFileRoute('/')({
  validateSearch: (search) => DashboardSearchSchema.parse(search),
  loaderDeps: ({ search }) => ({
    household: search.household,
    start: search.start,
    end: search.end,
    dataVersion: DATA_VERSIONS[search.household].dataVersion,
  }),
  loader: async ({ deps }) => {
    const data = await getEnergyWindow({
      data: { household: deps.household, start: deps.start, end: deps.end },
    })
    if (data.dataVersion !== deps.dataVersion)
      throw new Error(
        'Dataset updated. Reload the page to load the new version.',
      )
    return data
  },
  staleTime: 5 * 60_000,
  preloadStaleTime: 5 * 60_000,
  gcTime: 30 * 60_000,
  pendingMs: 10_000,
  headers: () => ({ 'Cache-Control': 'private, no-store' }),
  errorComponent: () => (
    <DashboardError
      onReset={() => {
        window.location.href = '/'
      }}
    />
  ),
  component: Home,
})

function Home() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const router = useRouter()
  const pending = useRouterState({ select: (state) => state.isLoading })
  return (
    <DashboardContainer
      window={data}
      search={search}
      pending={pending}
      onSearchChange={(updates) => {
        void navigate({
          search: (previous) => ({ ...previous, ...updates }),
          resetScroll: false,
        })
      }}
      onRefresh={() => {
        void router.invalidate()
      }}
    />
  )
}
