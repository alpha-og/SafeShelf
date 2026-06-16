// STUB — backend integration point, not called anywhere yet.
//
// `profileStorage.ts` is the active persistence layer (local device storage).
// Once the backend ships `/v1/profiles`, swap `profileStorage.ts`'s internals
// to call these instead of (or in addition to, for sync) reading/writing
// local storage directly. Each function below throws rather than silently
// faking success, so accidental early wiring fails loudly instead of
// pretending to work.
import { api } from '@/lib/axios'
import type { Profile } from '../types'

const NOT_IMPLEMENTED =
  'Backend not yet implemented — see profileStorage.ts for the local source of truth'

/** Maps to: GET /v1/profiles */
export async function fetchProfilesFromServer(): Promise<Profile[]> {
  void api
  throw new Error(NOT_IMPLEMENTED)
}

/** Maps to: POST /v1/profiles */
export async function createProfileOnServer(_profile: Profile): Promise<Profile> {
  throw new Error(NOT_IMPLEMENTED)
}

/** Maps to: PUT /v1/profiles/{id} */
export async function updateProfileOnServer(
  _id: string,
  _patch: Partial<Profile>,
): Promise<Profile> {
  throw new Error(NOT_IMPLEMENTED)
}

/** Maps to: DELETE /v1/profiles/{id} */
export async function deleteProfileOnServer(_id: string): Promise<void> {
  throw new Error(NOT_IMPLEMENTED)
}
