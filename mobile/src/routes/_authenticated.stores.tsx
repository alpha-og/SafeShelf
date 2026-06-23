import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { ArrowLeft, Clock, MapPin } from 'lucide-react'
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
  const router = useRouter()

  const handleSelectStore = async (id: string) => {
    await setSelectedStoreId(id)
    navigate({ to: '/' })
  }

  return (
    <div className="flex flex-col h-full w-full bg-background">
      <header className="px-6 py-4">
        <button
          onClick={() => router.history.back()}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 border border-primary/20 hover:bg-primary/20 hover:scale-[1.02] transition-all mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Select a Store</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Choose a SafeShelf location near you.
        </p>
      </header>

      <main className="flex-1 overflow-y-auto px-6 pb-20">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-muted-foreground animate-pulse">Detecting nearby stores...</p>
          </div>
        ) : !stores?.length ? (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <p className="text-muted-foreground mb-4">
              No stores found nearby. You can choose one later from settings.
            </p>
            <button
              onClick={() => navigate({ to: '/' })}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 active:scale-[0.98] transition-all"
            >
              Skip for now
            </button>
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
