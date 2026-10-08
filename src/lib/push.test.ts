import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableEvening, enableWeekly, loadPrefs, updatePrefs } from './push';

const mock = vi.hoisted(() => ({
  prefs: null as Record<string, unknown> | null,
  writes: [] as { table: string; values: Record<string, unknown> }[],
  invoke: vi.fn(async () => ({ data: { applicationServerKey: 'AQID' }, error: null })),
  eq: vi.fn(async () => ({ error: null })),
}));
vi.mock('./supabase', () => ({ supabase: {
  functions: { invoke: mock.invoke },
  auth: { getSession: async () => ({ data: { session: { user: { id: 'user' } } } }) },
  from: (table: string) => ({
    select: () => ({ maybeSingle: async () => ({ data: mock.prefs, error: null }) }),
    upsert: async (values: Record<string, unknown>) => { mock.writes.push({ table, values }); return { error: null }; },
    update: (values: Record<string, unknown>) => { mock.writes.push({ table, values }); return { eq: mock.eq }; },
  }),
} }));
const subscription = { endpoint: 'https://push.invalid/device', toJSON: () => ({ keys: { p256dh: 'key', auth: 'auth' } }) };
let permission: ReturnType<typeof vi.fn>;
let subscribe: ReturnType<typeof vi.fn>;
let getSubscription: ReturnType<typeof vi.fn>;
beforeEach(() => {
  mock.prefs = null; mock.writes.length = 0; vi.clearAllMocks();
  permission = vi.fn(async () => 'granted'); subscribe = vi.fn(async () => subscription); getSubscription = vi.fn(async () => subscription);
  vi.stubGlobal('Notification', { permission: 'granted', requestPermission: permission });
  vi.stubGlobal('navigator', { userAgent: 'test', serviceWorker: { ready: Promise.resolve({ pushManager: { getSubscription, subscribe } }) } });
});
afterEach(() => vi.unstubAllGlobals());
describe('notification preferences (mocked transport, no database)', () => {
  it('enables weekly notifications using the existing device subscription without requesting permission, a key or a new subscription', async () => {
    await enableWeekly(0, '10:00');
    expect(getSubscription).toHaveBeenCalledOnce(); expect(permission).not.toHaveBeenCalled();
    expect(subscribe).not.toHaveBeenCalled(); expect(mock.invoke).not.toHaveBeenCalled();
    expect(mock.writes[0]).toMatchObject({ table: 'push_subscriptions', values: { endpoint: subscription.endpoint } });
    expect(mock.writes[1]).toMatchObject({ table: 'notification_prefs', values: { weekly_enabled: true, weekly_day: 0, weekly_time: '10:00' } });
    expect(mock.writes[1].values).not.toHaveProperty('evening_enabled');
    expect(mock.writes[1].values).not.toHaveProperty('last_sent_date'); expect(mock.writes[1].values).not.toHaveProperty('last_weekly_sent_date');
  });
  it('uses the shared subscribe flow when the device is not yet subscribed', async () => {
    getSubscription.mockResolvedValue(null);
    vi.stubGlobal('Notification', { permission: 'default', requestPermission: permission });
    await enableWeekly(1, '09:15');
    expect(permission).toHaveBeenCalledOnce(); expect(mock.invoke).toHaveBeenCalledWith('push', { body: { action: 'key' } });
    expect(subscribe).toHaveBeenCalledWith({ userVisibleOnly: true, applicationServerKey: Uint8Array.from([1, 2, 3]) });
    expect(mock.writes[1].values).toMatchObject({ weekly_day: 1, weekly_time: '09:15' });
  });
  it('stops without saving preferences when permission is denied', async () => {
    permission.mockResolvedValue('denied'); vi.stubGlobal('Notification', { permission: 'denied', requestPermission: permission });
    await expect(enableWeekly(0, '10:00')).rejects.toThrow('denied'); expect(mock.writes).toEqual([]);
  });
  it('keeps the evening flow and weekly preferences independent', async () => {
    await enableEvening('21:30');
    expect(mock.writes[1].values).toMatchObject({ evening_enabled: true, evening_time: '21:30' });
    expect(mock.writes[1].values).not.toHaveProperty('weekly_enabled');
    await updatePrefs({ weekly_enabled: false });
    expect(mock.writes[2].values).toMatchObject({ weekly_enabled: false }); expect(mock.eq).toHaveBeenCalledWith('user_id', 'user');
  });
  it('loads the saved day/time and normalizes SQL time values, with defaults for missing additive fields', async () => {
    expect(await loadPrefs()).toBeNull();
    mock.prefs = { evening_enabled: true, evening_time: '21:30:00', weekly_enabled: true, weekly_day: 2, weekly_time: '09:15:00' };
    expect(await loadPrefs()).toEqual({ evening_enabled: true, evening_time: '21:30', weekly_enabled: true, weekly_day: 2, weekly_time: '09:15' });
    mock.prefs = { evening_enabled: false, evening_time: '21:30:00' };
    expect(await loadPrefs()).toMatchObject({ weekly_enabled: false, weekly_day: 0, weekly_time: '10:00' });
  });
});
