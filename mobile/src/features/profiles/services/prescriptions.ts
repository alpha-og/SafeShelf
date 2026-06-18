import { generateId } from '@/lib/id'
import type { PrescriptionFile } from '../types'

/** File types accepted by the prescription picker: PDF, Word docs, and images. */
export const PRESCRIPTION_ACCEPT = [
  '.pdf',
  '.doc',
  '.docx',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/*',
].join(',')

/**
 * Backend connector (stub).
 *
 * The selected document should be uploaded to the API so the backend can run
 * OCR / NLP and extract the user's conditions and allergens. For now this only
 * records local metadata and marks the file `pending` so the UI can show it.
 *
 * TODO(backend): replace the body with the real upload, e.g.
 *   const form = new FormData()
 *   form.append('file', file)
 *   const { data } = await api.post('/v1/prescriptions', form)
 *   return data  // server record incl. extracted conditions/allergens + status
 */
export async function uploadPrescription(file: File): Promise<PrescriptionFile> {
  return {
    id: generateId(),
    name: file.name,
    mimeType: file.type,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    status: 'pending',
  }
}
