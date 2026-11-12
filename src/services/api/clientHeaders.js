/**
 * How the admin panel identifies itself to the backend (X-Client-App etc.).
 * The backend never blocks admin-panel traffic; the header lets it tell admin
 * calls apart from the web app and native apps in logs and role rules.
 * Contract: backend docs/CLIENT_APPS_AND_VERSIONING.md.
 */
export const CLIENT_HEADERS = Object.freeze({
  'X-Client-App': 'admin-panel',
  'X-App-Platform': 'web',
});
