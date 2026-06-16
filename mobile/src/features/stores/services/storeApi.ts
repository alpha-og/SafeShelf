import { api } from '@/lib/axios'

export interface Store {
  id: string
  name: string
  address: string
  city: string
  lat: number
  lon: number
  hours?: string
}

export async function fetchStores(lat?: number, lon?: number): Promise<Store[]> {
  try {
    const params = new URLSearchParams()
    if (lat !== undefined) params.append('lat', lat.toString())
    if (lon !== undefined) params.append('lon', lon.toString())
    
    const query = params.toString() ? `?${params.toString()}` : ''
    const response = await api.get(`/v1/stores${query}`)
    return response.data.stores as Store[]
  } catch (error) {
    console.error('Failed to fetch stores:', error)
    return []
  }
}
