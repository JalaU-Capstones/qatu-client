# Profile Management — US-04

## Overview

Allows authenticated buyers to view and edit their profile information (`full_name`, `bio`, `avatar_path`, `locale`) and upload an avatar image to Supabase Storage.

## Endpoints

- `GET /v1/profiles/:id` — Retrieve public profile data (no authentication required; `email` is always excluded)
- `GET /v1/auth/me` — Get current user's session and profile on application bootstrap
- `PATCH /v1/profiles/me` — Update own profile fields
  - Allowed fields: `full_name`, `bio`, `avatar_path`, `locale`
  - Partial update semantics — only sends changed fields; read-only fields (`id`, `username`, `email`, `created_at`, `updated_at`) are never included
- `POST /v1/profiles/me/avatar` — Upload avatar image
  - Content-Type: `multipart/form-data` (field name: `image`)
  - Max size: 2 MB (`2097152` bytes)
  - Formats: JPEG (`image/jpeg`), PNG (`image/png`), WebP (`image/webp`)
  - Returns updated profile envelope with full public URL in `avatar_path`

## Authentication

- Session via HttpOnly cookies (`access_token`, `refresh_token`)
- Mutating requests (`PATCH`, `POST`) include the `X-CSRF-Token` header matching the `csrf_token` cookie
- Automatic session refresh on `401 REFRESH_REQUIRED` via `POST /v1/auth/refresh`; redirects to `/login` if refresh fails

## Storage

- Avatars are stored in Supabase Storage (`avatars` bucket) — for bucket configuration and storage setup, see the backend [`SUPABASE-STORAGE-SETUP.md`](../../api/.docs/SUPABASE-STORAGE-SETUP.md)
- `avatar_path` contains the full public URL and is rendered directly in `<img src={profile.avatar_path}>` without path rewriting

## Error Codes

| Status / Code                            | User Message                                                           |
| ---------------------------------------- | ---------------------------------------------------------------------- |
| `200 OK` (`PATCH /v1/profiles/me`)       | `"Perfil actualizado correctamente"`                                   |
| `200 OK` (`POST /v1/profiles/me/avatar`) | `"Foto de perfil actualizada correctamente"`                           |
| `400 VALIDATION_ERROR`                   | Per-field messages mapped from `error.details[].field`                 |
| `401 UNAUTHORIZED`                       | Triggers `/v1/auth/refresh` → retry → redirects to `/login` on failure |
| `403 FORBIDDEN`                          | `"No tienes permiso para modificar este perfil"`                       |
| `404 NOT_FOUND`                          | `"Perfil no encontrado"`                                               |
| `422 FILE_TOO_LARGE`                     | `"La imagen excede el límite de 2 MB"`                                 |
| `422 INVALID_FILE_FORMAT`                | `"Solo se aceptan imágenes JPEG, PNG y WebP"`                          |
| `500 INTERNAL_SERVER_ERROR`              | `"Error al guardar los cambios. Inténtalo de nuevo más tarde"`         |

## Tests

- Unit: `src/models/api/ProfilesApi.spec.js`
- Unit: `src/models/validation/profileValidation.spec.js`
- Unit: `src/viewmodels/pages/ProfileViewModel.spec.js`
- Unit: `src/views/pages/ProfileView.spec.js`
- Visual E2E: included in `scripts/visual-matrix.mjs` (`{ name: 'profile', path: '/profile', authenticated: true }`)
