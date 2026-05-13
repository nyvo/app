/**
 * Reserved slugs — these strings can NEVER be used as a team slug because
 * they collide with top-level routes or reserved namespaces in the app.
 *
 * The flat-slug URL scheme (`ourapp.no/<slug>`) means every top-level path
 * segment is potentially in conflict with a team slug. To prevent that, all
 * literal route names + likely future routes + filesystem-style names are
 * forbidden as slugs.
 *
 * **Add new entries here whenever you add a new top-level route in App.tsx.**
 *
 * Validation should be done in two places:
 *   1. Client-side in slug forms (immediate feedback when typing)
 *   2. Server-side in `ensure_seller_for_user` and `createTeam` edge function
 *      (defense in depth — never trust the client)
 */
export const RESERVED_SLUGS = new Set<string>([
  // Existing top-level routes (App.tsx)
  '', // root
  'signup',
  'login',
  'logout',
  'forgot-password',
  'reset-password',
  'terms',
  'checkout',
  'confirm-email',
  'teacher',
  'dev',
  'studio',
  'studios',
  'space',
  'spaces',
  'team',
  'teams',
  'admin',
  'api',

  // Auth / account
  'auth',
  'account',
  'accounts',
  'signin',
  'sign-in',
  'sign-up',
  'register',
  'verify',
  'oauth',

  // Common SaaS routes (likely additions)
  'about',
  'pricing',
  'price',
  'contact',
  'help',
  'support',
  'blog',
  'news',
  'docs',
  'documentation',
  'faq',
  'careers',
  'jobs',
  'press',
  'privacy',
  'legal',
  'cookies',
  'security',
  'features',
  'product',
  'platform',
  'enterprise',
  'business',
  'home',
  'welcome',
  'onboarding',
  'dashboard',
  'oversikt',
  'overview',
  'app',
  'apps',
  'settings',
  'profile',
  'profiles',
  'preferences',
  'billing',
  'invoice',
  'invoices',
  'payment',
  'payments',
  'payouts',
  'refund',
  'refunds',
  'invite',
  'invites',
  'join',

  // Norwegian counterparts
  'om-oss',
  'priser',
  'kontakt',
  'hjelp',
  'personvern',
  'vilkar',
  'vilkaar',

  // Course / domain
  'kurs',
  'course',
  'courses',
  'event',
  'events',
  'schedule',
  'timeplan',
  'booking',
  'book',
  'paamelding',
  'paameldinger',
  'pamelding',
  'innstillinger',
  'signup',
  'signups',
  'cancel',
  'avbestill',

  // File-system / framework / static
  'static',
  'assets',
  'public',
  'private',
  'favicon',
  'robots',
  'sitemap',
  'manifest',
  'icon',
  'icons',
  'og',
  'embed',
  'oembed',
  'rss',
  'feed',
  'json',

  // Reserved JS / common pitfalls
  'null',
  'undefined',
  'true',
  'false',
  'new',

  // Internals (paths used by Vite, dev tooling)
  '_',
  '@',
  '$',
  '__internal',
  '__data',
])

