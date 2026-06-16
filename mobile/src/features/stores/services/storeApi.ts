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

export async function fetchStores(): Promise<Store[]> {
  try {
    const response = await api.get('/v1/stores')
    return response.data.stores as Store[]
  } catch (error) {
    console.error('Failed to fetch stores:', error)
    return []
  }
}
