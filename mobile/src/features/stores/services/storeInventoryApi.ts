import { api } from '@/lib/axios'
import { apiError } from '@/lib/logger'

export interface InventoryResponse {
  store_id: string
  barcode: string
  product_name: string | null
  product_image: string | null
  in_stock: boolean
  quantity: number
  price: number
}

export async function searchStoreInventory(
  storeId: string,
  query: string,
): Promise<InventoryResponse[]> {
  try {
    const response = await api.get(`/v1/stores/${storeId}/inventory/search`, {
      params: { q: query },
    })
    return response.data as InventoryResponse[]
  } catch (error) {
    apiError('searchStoreInventory', error)
    return []
  }
}

export async function getAllStoreInventory(storeId: string): Promise<InventoryResponse[]> {
  try {
    const response = await api.get(`/v1/stores/${storeId}/inventory`)
    return response.data as InventoryResponse[]
  } catch (error) {
    apiError('getAllStoreInventory', error)
    return []
  }
}
