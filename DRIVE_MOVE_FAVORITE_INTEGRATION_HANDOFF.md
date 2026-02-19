# Drive Move/Favorite Integration Handoff

Purpose: tomorrow's implementation handoff for frontend-backend integration of file/folder move and favorite operations.

## Path Resolution

- Frontend repo root: `/Users/hwanjinchoi/Documents/faddit/faddit-fe-v2`
- Backend repo root: `/Users/hwanjinchoi/Documents/faddit/faddit_be`
- Any `src/...` backend reference in this document means `faddit_be/src/...`.

## 1) Current Frontend Structure (what exists now)

Primary files (frontend):
- `src/pages/faddit/drive/Drive.tsx`
- `src/layouts/DriveLayout.tsx`
- `src/context/DriveContext.tsx`
- `src/partials/Drivebar.jsx`
- `src/components/DriveItemCard.tsx`
- `src/lib/api/httpClient.ts`
- `src/lib/api/authApi.ts`

Current behavior:
- Drag/drop UI is implemented with `@dnd-kit` in `DriveLayout` + `Drive` + `Drivebar`.
- Selection/multi-selection/marquee selection is implemented in `Drive.tsx`.
- Move behavior is local state only via `DriveContext.moveItemToFolder` and `DriveContext.moveSidebarItem`.
- Workspace/Favorite trees in sidebar are mock/local (`initialWorkspaces`, `initialFavorites`).
- Main drive list (`items`, `driveFolders`) is mock/local in context/page and not loaded from backend.
- There is currently no drive API client module (no `/drive` calls in frontend source).

Important mismatch right now:
- Frontend "즐겨찾기 섹션" means a separate tree bucket.
- Backend "즐겨찾기" means `is_starred` flag on the same file system item.
- So current UX intent and backend domain are not 1:1 yet.

## 2) Current Backend Capability Map

Primary files (backend):
- `src/drive/drive.controller.ts`
- `src/drive/services/drive.update.service.ts`
- `src/drive/services/drive.read.service.ts`
- `src/drive/dto/folder.dto.ts`
- `src/drive/dto/file-system.dto.ts`
- `src/drive/dto/file-system-list.dto.ts`
- `src/drive/entities/file-system.entity.ts`
- `src/guards/auth.guard.ts`

Auth model:
- Drive endpoints are protected by global auth guard (no `@Public()` on drive controller routes).
- Bearer access token required.
- Guard injects `request.body.userId` from token payload.

Relevant endpoints:
- `PATCH /drive`:
  - rename (`name`)
  - star/unstar (`isStarred`)
  - move to another folder (`parentId`, and `currentId` for count recalculation)
  - supports multi-item via `id: string[]`
- `GET /drive/all?path=<folderId>`:
  - folder children (folders/files)
- `GET /drive/starred` or `GET /drive/starred-all`:
  - favorite list
- `DELETE /drive`:
  - soft delete to trash
- `PATCH /drive/restore`:
  - restore from trash

Update DTO contract:
- `UpdateFolderDto` fields in `src/drive/dto/folder.dto.ts`:
  - `userId: string`
  - `id: string[]`
  - `name?: string`
  - `isStarred?: boolean`
  - `parentId?: string`
  - `currentId?: string`

Backend move internals:
- Parent change and path rewrite handled in `DriveUpdateService.updatePath`.
- Multi-item update is transactional in controller (`QueryRunner` transaction).
- Parent children_count is incremented/decremented when `parentId` + `currentId` provided.

## 2.1) Workspace Root Model (must be shared across agents)

Required product rule:
- Each user has a root folder (`rootFolder`) and workspaces are folders directly under that root.
- Files/folders inside each workspace are shown in the left sidebar as that workspace's children.

Backend evidence:
- `rootFolder` is exposed from sign-in payload (`root_folder -> rootFolder`) in `src/user/dto/sign-in.dto.ts`.
- Folder/file children can be fetched by parent folder id via `GET /drive/all?path=<folderId>`.

Frontend implication:
- Sidebar workspace list source should be `GET /drive/all?path=<rootFolder>` and use returned `folders` as workspace roots.
- Expanding a workspace should fetch `GET /drive/all?path=<workspaceFolderId>` (lazy loading).

Feasibility verdict (current backend vs required UX):
- Possible now (no backend change required):
  - Root -> first-level workspaces
  - Per-workspace child loading with lazy API calls
- Backend change recommended if you want one-shot full sidebar tree preload:
  - Add recursive tree endpoint (example: `GET /drive/tree?path=<rootFolder>&depth=n`)
  - Current API returns one level per request, so full preload requires multiple calls from frontend.

## 3) Frontend-Backend Connection Points (direct mapping)

Action mapping:
1. Move selected items to folder
   - API: `PATCH /drive`
   - body: `{ id: string[], parentId: targetFolderId, currentId: sourceFolderId }`

2. Add to favorites (star)
   - API: `PATCH /drive`
   - body: `{ id: string[], isStarred: true }`

3. Remove from favorites (unstar)
   - API: `PATCH /drive`
   - body: `{ id: string[], isStarred: false }`

4. Refresh list after mutations
   - main folder: `GET /drive/all?path=<activeFolderId>`
   - favorites panel/list: `GET /drive/starred` or `GET /drive/starred-all`

Token/transport requirements:
- Use existing `baseHttpClient`/`cookieHttpClient` from `src/lib/api/httpClient.ts`.
- Keep Bearer access token flow as-is (auto refresh already implemented).
- Use `withCredentials` only where needed; drive routes are bearer-protected and do not require refresh cookie directly.

## 4) Gaps to Close Tomorrow

Gap A: No drive API module
- Need a new frontend API layer for drive domain (fetch list, patch update, fetch starred).

Gap B: Local-only move/favorite state
- Current drag/drop updates only local trees, not backend.
- Need mutation pipeline: optimistic state -> API -> reconcile/rollback.

Gap C: Domain mismatch (favorites section vs star flag)
- Decide UX rule and normalize:
  - recommendation: favorites section should represent starred items/folders from backend.
  - avoid maintaining a separate disconnected "favorites tree" source of truth.

Gap D: Source folder tracking for move
- Backend expects `currentId` for count updates.
- UI must know active/source parent folder for selected entries before sending move.

Gap E: IDs and shape harmonization
- Front uses synthetic IDs (`drive-item-1`, `drive-folder-1`) in mocks.
- Must migrate to backend UUID IDs from `FileSystemResponseDataDto.fileSystemId`.

Gap F: Workspace root hydration strategy
- Current frontend sidebar assumes local mock workspace/favorite trees.
- To match product rule, frontend must hydrate workspace roots from backend `rootFolder` and then lazy-load children.
- If product requires initial full expanded tree (without incremental loading), backend needs a tree endpoint.

## 5) Recommended Development Direction (implementation order)

Phase 1: Data model alignment
- Replace mock IDs with backend IDs.
- Introduce frontend type adapter from backend response (`FileSystemResponseDataDto`) to UI view models.

Phase 2: API integration
- Create `src/lib/api/driveApi.ts` with:
  - `getRootWorkspaces(rootFolderId)` (internally `GET /drive/all?path=<rootFolderId>`)
  - `getWorkspaceChildren(folderId)` (internally `GET /drive/all?path=<folderId>`)
  - `getDriveAll(path)`
  - `getStarred(params)` / `getStarredAll(params)`
  - `updateDriveItems(payload)` for move/star/rename

Phase 3: UI action wiring
- Hook drag-drop end handler in `DriveLayout.tsx` to call `updateDriveItems`.
- For drop to "favorites zone": send `isStarred: true` (not physical folder move).
- For folder drop: send `parentId` + `currentId`.

Phase 4: Reliability and UX
- Optimistic update for immediate feedback.
- Rollback on API failure and show toast error.
- Re-fetch target lists on success for consistency.

Phase 5: Clean separation
- Keep DnD interaction state local.
- Keep canonical file tree/list state backend-driven.
- Treat workspace roots as "folders under rootFolder", not an independent frontend-only domain.

## 6) API Payload Examples

Move to folder:
```json
{
  "id": ["uuid-a", "uuid-b"],
  "parentId": "target-folder-uuid",
  "currentId": "source-folder-uuid"
}
```

Star selected:
```json
{
  "id": ["uuid-a", "uuid-b"],
  "isStarred": true
}
```

Unstar selected:
```json
{
  "id": ["uuid-a"],
  "isStarred": false
}
```

## 7) Risks / Notes for Agents

- Backend update service rewrites path/ltree; large subtree moves can be sensitive to path consistency.
- Front should not assume section-based favorite storage after integration; use backend starred queries.
- Current drive page has additional UI-only concerns (detail pane, chip editor, local delete toast) that are independent from move/star API.
- Keep API failures explicit to user; silent divergence between sidebar and server state must be avoided.

## 8) Tomorrow Ready Checklist

- [ ] Create drive API client (`driveApi.ts`)
- [ ] Wire move mutation from DnD drop
- [ ] Wire favorite/unfavorite mutation
- [ ] Replace mock seed load with backend fetch
- [ ] Add rollback + toast on mutation failure
- [ ] Re-fetch active folder + starred list after successful mutation
