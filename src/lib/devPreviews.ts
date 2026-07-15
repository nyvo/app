/**
 * Gate for the `/dev` preview gallery — its route table (App.tsx) and the
 * sidebar link (TeacherSidebar.tsx). Two guards, both must pass:
 *
 *   1. import.meta.env.DEV — false in every `vite build`, so the preview
 *      pages and the sidebar link are tree-shaken out of production. They can
 *      never ship or be reached by a real user.
 *   2. VITE_DEV_PREVIEWS === 'true' — off by default even in local dev, so the
 *      Dev link doesn't show for anyone (collaborators, screen-shares) running
 *      the app. To turn it on for yourself, add `VITE_DEV_PREVIEWS=true` to
 *      .env.local and restart the dev server. Delete the line to hide it again.
 */
export const DEV_PREVIEWS_ENABLED =
  import.meta.env.DEV && import.meta.env.VITE_DEV_PREVIEWS === 'true';
