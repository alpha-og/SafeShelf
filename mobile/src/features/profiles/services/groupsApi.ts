// STUB — backend integration point, not called anywhere yet.
//
// `profileStorage.ts` is the active persistence layer (local device storage).
// Once the backend ships `/v1/groups`, swap `profileStorage.ts`'s internals
// to call these instead of (or in addition to, for sync) reading/writing
// local storage directly. Each function below throws rather than silently
// faking success, so accidental early wiring fails loudly instead of
// pretending to work.
import { api } from '@/lib/axios'
import type { ProfileGroup } from '../types'

const NOT_IMPLEMENTED =
  'Backend not yet implemented — see profileStorage.ts for the local source of truth'

/** Maps to: GET /v1/groups */
export async function fetchGroupsFromServer(): Promise<ProfileGroup[]> {
  void api
  throw new Error(NOT_IMPLEMENTED)
}

/** Maps to: POST /v1/groups */
export async function createGroupOnServer(_group: ProfileGroup): Promise<ProfileGroup> {
  throw new Error(NOT_IMPLEMENTED)
}

/** Maps to: PUT /v1/groups/{id} */
export async function updateGroupOnServer(
  _id: string,
  _patch: Partial<ProfileGroup>,
): Promise<ProfileGroup> {
  throw new Error(NOT_IMPLEMENTED)
}

/** Maps to: DELETE /v1/groups/{id} */
export async function deleteGroupOnServer(_id: string): Promise<void> {
  throw new Error(NOT_IMPLEMENTED)
}
