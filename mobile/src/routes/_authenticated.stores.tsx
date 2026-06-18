import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Clock, MapPin } from 'lucide-react'
import { useEffect } from 'react'
import { useNearestStore } from '@/features/stores/hooks/useNearestStore'
import { useStore } from '@/providers/StoreProvider'

export const Route = createFileRoute('/_authenticated/stores')({
  component: StoresPage,
})

function StoresPage() {
  const { locateAndFetch, stores, isLoading } = useNearestStore()

  useEffect(() => {
    locateAndFetch()
  }, [locateAndFetch])

  const { setSelectedStoreId, selectedStoreId } = useStore()
  const navigate = useNavigate()

  const handleSelectStore = async (id: string) => {
    await setSelectedStoreId(id)
    navigate({ to: '/' })
  }

  return (
    <div className="flex flex-col h-full w-full bg-background">
      <header className="px-6 py-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Select a Store</h1>
        <p className="text-muted-foreground mt-2">
          Choose a SafeShelf location near you to view available inventory.
        </p>
      </header>

      <main className="flex-1 overflow-y-auto px-6 pb-20">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-muted-foreground animate-pulse">Detecting nearby stores...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {stores?.map((store) => (
              <button
                key={store.id}
                onClick={() => handleSelectStore(store.id)}
                className={`flex flex-col p-5 rounded-2xl border text-left transition-all active:scale-[0.98]
                  ${
                    selectedStoreId === store.id
                      ? 'border-primary bg-primary/10 shadow-sm shadow-primary/20'
                      : 'border-border/50 bg-card hover:bg-muted/50'
                  }`}
              >
                <div className="flex items-start justify-between w-full">
                  <h3 className="text-lg font-semibold text-foreground">{store.name}</h3>
                  {selectedStoreId === store.id && (
                    <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full">
                      Selected
                    </span>
                  )}
                </div>

                <div className="flex items-center text-muted-foreground mt-3 text-sm">
                  <MapPin className="w-4 h-4 mr-2 opacity-70 shrink-0" />
                  <span className="line-clamp-1">
                    {store.address}, {store.city}
                  </span>
                </div>

                {store.hours && (
                  <div className="flex items-center text-muted-foreground mt-2 text-sm">
                    <Clock className="w-4 h-4 mr-2 opacity-70 shrink-0" />
                    <span>{store.hours}</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
