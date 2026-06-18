import { useState, useCallback } from 'react'
import { Geolocation } from '@capacitor/geolocation'
import { fetchStores, type Store } from '../services/storeApi'

export interface NearestStoreResult {
  stores: Store[]
  nearest: Store | null
  isLoading: boolean
  error: string | null
}

export function useNearestStore() {
  const [result, setResult] = useState<NearestStoreResult>({
    stores: [],
    nearest: null,
    isLoading: false,
    error: null,
  })

  const locateAndFetch = useCallback(async () => {
    setResult((prev) => ({ ...prev, isLoading: true, error: null }))
    
    try {
      let lat: number | undefined
      let lon: number | undefined

      try {
        const hasPermission = await Geolocation.checkPermissions()
        if (hasPermission.location !== 'granted') {
          const request = await Geolocation.requestPermissions()
          if (request.location === 'granted') {
            const position = await Geolocation.getCurrentPosition({ timeout: 10000 })
            lat = position.coords.latitude
            lon = position.coords.longitude
          }
        } else {
          const position = await Geolocation.getCurrentPosition({ timeout: 10000 })
          lat = position.coords.latitude
          lon = position.coords.longitude
        }
      } catch (geoError) {
        console.warn('Geolocation failed or denied, fetching stores without sorting.', geoError)
      }

      const stores = await fetchStores(lat, lon)
      setResult({
        stores,
        nearest: stores.length > 0 ? stores[0] : null,
        isLoading: false,
        error: null,
      })
      
      return { stores, lat, lon }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch stores'
      setResult((prev) => ({ ...prev, isLoading: false, error: msg }))
      return { stores: [], lat: undefined, lon: undefined }
    }
  }, [])

  return { ...result, locateAndFetch }
}
