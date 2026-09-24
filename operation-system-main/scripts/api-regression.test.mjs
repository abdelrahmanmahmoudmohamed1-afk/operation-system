import test from 'node:test';
import assert from 'node:assert/strict';

const storage = () => ({ getItem(key) { return this[key] ?? null; }, setItem(key, value) { this[key] = String(value); }, removeItem(key) { delete this[key]; } });
globalThis.localStorage = storage();
globalThis.sessionStorage = storage();
const events = [];
globalThis.window = { dispatchEvent(event) { events.push(event.type); } };
Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true });
const api = (await import('../assets/js/services/api.service.js')).default;
const session = (await import('../assets/js/managers/session.manager.js')).default;
const response = (status, data) => new Response(JSON.stringify(data), { status });
function reset() {
  api.clearReadCache(); api.inFlight.clear(); events.length = 0;
  globalThis.sessionStorage = storage(); navigator.onLine = true;
  api.retry = { enabled: true, maxAttempts: 2, delay: 1 };
}

test('expired access token refreshes before the app logs out', async () => {
  reset(); sessionStorage.setItem('auth_refresh_token', 'refresh');
  let calls = 0;
  globalThis.fetch = async (_url, options) => {
    calls++; const body = JSON.parse(options.body);
    if (body.action === 'refreshSession') return response(200, { ok: true, data: { token: 'new', refreshToken: 'next' } });
    return body.token === 'new' ? response(200, { ok: true, data: [] }) : response(401, { ok: false, message: 'SESSION_EXPIRED' });
  };
  const result = await api.post('getClients', { token: 'old' });
  assert.equal(result.ok, true); assert.equal(calls, 3); assert.deepEqual(events, []);
  assert.equal(sessionStorage.getItem('auth_token'), 'new');
});

test('failed refresh emits session expiry only after trying refresh', async () => {
  reset(); sessionStorage.setItem('auth_refresh_token', 'refresh');
  let refreshes = 0;
  globalThis.fetch = async (_url, options) => {
    if (JSON.parse(options.body).action === 'refreshSession') { refreshes++; assert.deepEqual(events, []); }
    return response(401, { ok: false, message: 'SESSION_EXPIRED' });
  };
  assert.equal((await api.post('getClients', { token: 'old' })).ok, false);
  assert.equal(refreshes, 1); assert.deepEqual(events, ['operation:session-expired']);
});

test('concurrent requests share one token refresh', async () => {
  reset(); sessionStorage.setItem('auth_refresh_token', 'refresh');
  let refreshes = 0;
  globalThis.fetch = async () => { refreshes++; await new Promise(resolve => setTimeout(resolve, 10)); return response(200, { ok: true, data: { token: 'new', refreshToken: 'next' } }); };
  assert.deepEqual(await Promise.all([api.refreshAuthToken(), api.refreshAuthToken()]), ['new', 'new']);
  assert.equal(refreshes, 1);
});

test('refresh cannot restore a session after logout', async () => {
  reset(); sessionStorage.setItem('auth_refresh_token', 'refresh');
  globalThis.fetch = async () => { session.clearSession(); return response(200, { ok: true, data: { token: 'new' } }); };
  assert.equal(await api.refreshAuthToken(), null); assert.equal(session.getToken(), null);
});

test('sales writes and other side effects are never retried on server failure', async () => {
  for (const action of ['saveSalesPerson', 'saveSalesTarget', 'deleteDocument', 'operationAiChat', 'recordUserActivity']) {
    reset(); let calls = 0;
    globalThis.fetch = async () => { calls++; return response(500, { ok: false }); };
    assert.equal((await api.post(action, { token: 'token' })).ok, false); assert.equal(calls, 1, action);
  }
});

test('separate login submissions are not merged despite identical username', async () => {
  reset(); let calls = 0;
  globalThis.fetch = async () => { calls++; return response(200, { ok: true }); };
  await Promise.all([api.post('login', { username: 'same', password: 'first' }), api.post('login', { username: 'same', password: 'second' })]);
  assert.equal(calls, 2);
});

test('offline reads retain the selected project filter', async () => {
  reset(); sessionStorage.setItem('operation_global_project', 'Project A');
  api.writeCache(api.makeKey({ action: 'getClients', body: { action: 'getClients', token: 't', filters: { project: 'Project A' } } }), { ok: true, data: ['A'] }, 10000);
  navigator.onLine = false;
  assert.deepEqual((await api.post('getClients', { token: 't' })).data, ['A']);
  navigator.onLine = true;
});

test('new login without refresh token clears a previous users token', () => {
  reset(); sessionStorage.setItem('auth_refresh_token', 'previous');
  session.setSession('new', { id: 'new' }); assert.equal(session.getRefreshToken(), null);
});
