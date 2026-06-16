import { setupServer } from 'msw/node';

// Shared MSW server for the test suite. Handlers are registered per-test via
// `server.use(...)` and reset after each test (see setup.js).
export const server = setupServer();
