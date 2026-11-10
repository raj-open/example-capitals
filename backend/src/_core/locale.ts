/**
 * Locale of the backend: English (United Kingdom), never the default of the server.
 *
 * NOTE: the collation of the DB (/db/schema.js) uses `en`, as MongoDB has no `en_GB` collation
 * (case-insensitive comparison is the same for both).
 */

export const LOCALE = "en-GB";
