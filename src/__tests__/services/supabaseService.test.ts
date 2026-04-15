import {
  fetchListings,
  fetchListingsWithCoords,
  fetchEvents,
  fetchAds,
  fetchPartnerAds,
  trackAdImpression,
  trackAdClick,
  fetchAppUser,
  fetchMyPartnerProfile,
  createPartnerProfile,
  updatePartnerProfile,
  fetchMySubscriptions,
  fetchMyInvoices,
  fetchMyAds,
  createPartnerAd,
  updatePartnerAd,
  adminFetchAllPartners,
  adminUpdatePartnerStatus,
  adminFetchAllInvoices,
  adminFetchAllPartnerAds,
  adminTogglePartnerAd,
  adminMarkInvoicePaid,
} from '../../services/supabaseService';

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

/** Creates a chainable Supabase-style query builder that resolves to `result`. */
function makeBuilder(result: { data: any; error: any }) {
  const builder: any = {};
  const chainMethods = [
    'select', 'eq', 'neq', 'ilike', 'order', 'not', 'gte', 'or',
    'insert', 'update', 'upsert',
  ];
  chainMethods.forEach((m) => {
    builder[m] = jest.fn().mockReturnValue(builder);
  });
  builder.single = jest.fn().mockResolvedValue(result);
  builder.maybeSingle = jest.fn().mockResolvedValue(result);
  // Make the builder itself awaitable (Promise-like)
  builder.then = jest.fn((resolve: any, reject: any) =>
    Promise.resolve(result).then(resolve, reject),
  );
  return builder;
}

// ---------------------------------------------------------------------------
// Module mock
// ---------------------------------------------------------------------------

jest.mock('../../config/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
    auth: {
      getUser: jest.fn(),
    },
  },
}));

// Import the mocked supabase after jest.mock is hoisted
import { supabase } from '../../config/supabase';

const mockFrom = supabase.from as jest.Mock;
const mockRpc = supabase.rpc as jest.Mock;
const mockGetUser = supabase.auth.getUser as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// fetchListings
// ---------------------------------------------------------------------------

describe('fetchListings', () => {
  it('returns listings on success', async () => {
    const listings = [{ id: '1', name: 'Test Restaurant', category: 'restaurants' }];
    mockFrom.mockReturnValue(makeBuilder({ data: listings, error: null }));

    const result = await fetchListings();
    expect(result).toEqual(listings);
    expect(mockFrom).toHaveBeenCalledWith('listings');
  });

  it('returns empty array when data is null', async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: null }));
    const result = await fetchListings();
    expect(result).toEqual([]);
  });

  it('throws on error', async () => {
    const error = new Error('DB error');
    mockFrom.mockReturnValue(makeBuilder({ data: null, error }));
    await expect(fetchListings()).rejects.toThrow('DB error');
  });

  it('applies category filter when provided', async () => {
    const builder = makeBuilder({ data: [], error: null });
    mockFrom.mockReturnValue(builder);

    await fetchListings({ category: 'restaurants' });

    expect(builder.eq).toHaveBeenCalledWith('category', 'restaurants');
  });

  it('applies search filter when provided', async () => {
    const builder = makeBuilder({ data: [], error: null });
    mockFrom.mockReturnValue(builder);

    await fetchListings({ search: 'pizza' });

    expect(builder.ilike).toHaveBeenCalledWith('name', '%pizza%');
  });

  it('applies both category and search filters', async () => {
    const builder = makeBuilder({ data: [], error: null });
    mockFrom.mockReturnValue(builder);

    await fetchListings({ category: 'restaurants', search: 'pizza' });

    expect(builder.eq).toHaveBeenCalledWith('category', 'restaurants');
    expect(builder.ilike).toHaveBeenCalledWith('name', '%pizza%');
  });
});

// ---------------------------------------------------------------------------
// fetchListingsWithCoords
// ---------------------------------------------------------------------------

describe('fetchListingsWithCoords', () => {
  it('returns listings that have coordinates', async () => {
    const listings = [{ id: '1', name: 'Museum', lat: 47.5, lon: 8.7 }];
    mockFrom.mockReturnValue(makeBuilder({ data: listings, error: null }));

    const result = await fetchListingsWithCoords();
    expect(result).toEqual(listings);
  });

  it('throws on error', async () => {
    const error = new Error('coords error');
    mockFrom.mockReturnValue(makeBuilder({ data: null, error }));
    await expect(fetchListingsWithCoords()).rejects.toThrow('coords error');
  });
});

// ---------------------------------------------------------------------------
// fetchEvents
// ---------------------------------------------------------------------------

describe('fetchEvents', () => {
  it('returns events on success', async () => {
    const events = [{ id: '1', title: 'Konzert', cat: 'musik', event_date: '2025-06-01' }];
    mockFrom.mockReturnValue(makeBuilder({ data: events, error: null }));

    const result = await fetchEvents();
    expect(result).toEqual(events);
  });

  it('returns empty array when data is null', async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: null }));
    const result = await fetchEvents();
    expect(result).toEqual([]);
  });

  it('throws on error', async () => {
    const error = new Error('events error');
    mockFrom.mockReturnValue(makeBuilder({ data: null, error }));
    await expect(fetchEvents()).rejects.toThrow('events error');
  });

  it('applies category filter when provided', async () => {
    const builder = makeBuilder({ data: [], error: null });
    mockFrom.mockReturnValue(builder);

    await fetchEvents({ category: 'festival' });

    expect(builder.eq).toHaveBeenCalledWith('cat', 'festival');
  });

  it('applies from date filter when provided', async () => {
    const builder = makeBuilder({ data: [], error: null });
    mockFrom.mockReturnValue(builder);

    await fetchEvents({ from: '2025-01-01' });

    expect(builder.gte).toHaveBeenCalledWith('event_date', '2025-01-01');
  });
});

// ---------------------------------------------------------------------------
// fetchAds
// ---------------------------------------------------------------------------

describe('fetchAds', () => {
  it('returns ads on success', async () => {
    const ads = [{ id: '1', title: 'Werbung', is_active: true }];
    mockFrom.mockReturnValue(makeBuilder({ data: ads, error: null }));

    const result = await fetchAds();
    expect(result).toEqual(ads);
  });

  it('throws on error', async () => {
    const error = new Error('ads error');
    mockFrom.mockReturnValue(makeBuilder({ data: null, error }));
    await expect(fetchAds()).rejects.toThrow('ads error');
  });
});

// ---------------------------------------------------------------------------
// fetchPartnerAds
// ---------------------------------------------------------------------------

describe('fetchPartnerAds', () => {
  it('returns partner ads on success', async () => {
    const partnerAds = [{ id: '1', title: 'Partner Ad', position: 'banner' }];
    mockFrom.mockReturnValue(makeBuilder({ data: partnerAds, error: null }));

    const result = await fetchPartnerAds();
    expect(result).toEqual(partnerAds);
  });

  it('applies position filter when provided', async () => {
    const builder = makeBuilder({ data: [], error: null });
    mockFrom.mockReturnValue(builder);

    await fetchPartnerAds('banner');

    expect(builder.eq).toHaveBeenCalledWith('position', 'banner');
  });

  it('returns empty array when data is null', async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: null }));
    const result = await fetchPartnerAds();
    expect(result).toEqual([]);
  });

  it('throws on error', async () => {
    const error = new Error('partner ads error');
    mockFrom.mockReturnValue(makeBuilder({ data: null, error }));
    await expect(fetchPartnerAds()).rejects.toThrow('partner ads error');
  });
});

// ---------------------------------------------------------------------------
// trackAdImpression / trackAdClick
// ---------------------------------------------------------------------------

describe('trackAdImpression', () => {
  it('calls supabase.rpc with correct arguments', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    await trackAdImpression('ad-123');

    expect(mockRpc).toHaveBeenCalledWith('increment_ad_impressions', { ad_id: 'ad-123' });
  });
});

describe('trackAdClick', () => {
  it('calls supabase.rpc with correct arguments', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    await trackAdClick('ad-456');

    expect(mockRpc).toHaveBeenCalledWith('increment_ad_clicks', { ad_id: 'ad-456' });
  });
});

// ---------------------------------------------------------------------------
// fetchAppUser
// ---------------------------------------------------------------------------

describe('fetchAppUser', () => {
  it('returns user data on success', async () => {
    const user = { id: 'user-1', tier: 'free' };
    mockFrom.mockReturnValue(makeBuilder({ data: user, error: null }));

    const result = await fetchAppUser('user-1');
    expect(result).toEqual(user);
  });

  it('returns null when user not found', async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: null }));

    const result = await fetchAppUser('nonexistent');
    expect(result).toBeNull();
  });

  it('throws on error', async () => {
    const error = new Error('user fetch error');
    mockFrom.mockReturnValue(makeBuilder({ data: null, error }));
    await expect(fetchAppUser('user-1')).rejects.toThrow('user fetch error');
  });
});

// ---------------------------------------------------------------------------
// fetchMyPartnerProfile
// ---------------------------------------------------------------------------

describe('fetchMyPartnerProfile', () => {
  it('returns null when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await fetchMyPartnerProfile();
    expect(result).toBeNull();
  });

  it('returns partner profile when authenticated', async () => {
    const partner = { id: 'p-1', company_name: 'Acme GmbH', user_id: 'user-1' };
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockFrom.mockReturnValue(makeBuilder({ data: partner, error: null }));

    const result = await fetchMyPartnerProfile();
    expect(result).toEqual(partner);
  });

  it('throws on DB error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const error = new Error('partner fetch error');
    mockFrom.mockReturnValue(makeBuilder({ data: null, error }));
    await expect(fetchMyPartnerProfile()).rejects.toThrow('partner fetch error');
  });
});

// ---------------------------------------------------------------------------
// createPartnerProfile
// ---------------------------------------------------------------------------

describe('createPartnerProfile', () => {
  it('throws when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await expect(
      createPartnerProfile({
        company_name: 'Test GmbH',
        contact_email: 'test@test.com',
        tier: 'starter',
        status: 'pending',
      }),
    ).rejects.toThrow('Nicht eingeloggt');
  });

  it('creates partner profile when authenticated', async () => {
    const newPartner = { id: 'p-new', company_name: 'Test GmbH', user_id: 'user-1' };
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockFrom.mockReturnValue(makeBuilder({ data: newPartner, error: null }));

    const result = await createPartnerProfile({
      company_name: 'Test GmbH',
      contact_email: 'test@test.com',
      tier: 'starter',
      status: 'pending',
    });

    expect(result).toEqual(newPartner);
  });
});

// ---------------------------------------------------------------------------
// updatePartnerProfile
// ---------------------------------------------------------------------------

describe('updatePartnerProfile', () => {
  it('resolves without error on success', async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: null }));

    await expect(
      updatePartnerProfile('p-1', { company_name: 'Updated Name' }),
    ).resolves.toBeUndefined();
  });

  it('throws on DB error', async () => {
    const error = new Error('update error');
    mockFrom.mockReturnValue(makeBuilder({ data: null, error }));
    await expect(updatePartnerProfile('p-1', {})).rejects.toThrow('update error');
  });
});

// ---------------------------------------------------------------------------
// fetchMySubscriptions
// ---------------------------------------------------------------------------

describe('fetchMySubscriptions', () => {
  it('returns subscriptions on success', async () => {
    const subs = [{ id: 's-1', partner_id: 'p-1', plan: 'starter', status: 'active' }];
    mockFrom.mockReturnValue(makeBuilder({ data: subs, error: null }));

    const result = await fetchMySubscriptions('p-1');
    expect(result).toEqual(subs);
  });

  it('returns empty array when data is null', async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: null }));
    const result = await fetchMySubscriptions('p-1');
    expect(result).toEqual([]);
  });

  it('throws on error', async () => {
    const error = new Error('subs error');
    mockFrom.mockReturnValue(makeBuilder({ data: null, error }));
    await expect(fetchMySubscriptions('p-1')).rejects.toThrow('subs error');
  });
});

// ---------------------------------------------------------------------------
// fetchMyInvoices
// ---------------------------------------------------------------------------

describe('fetchMyInvoices', () => {
  it('returns invoices on success', async () => {
    const invoices = [{ id: 'i-1', partner_id: 'p-1', amount_chf: 100, status: 'paid' }];
    mockFrom.mockReturnValue(makeBuilder({ data: invoices, error: null }));

    const result = await fetchMyInvoices('p-1');
    expect(result).toEqual(invoices);
  });

  it('returns empty array when data is null', async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: null }));
    const result = await fetchMyInvoices('p-1');
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// fetchMyAds
// ---------------------------------------------------------------------------

describe('fetchMyAds', () => {
  it('returns partner ads on success', async () => {
    const ads = [{ id: 'a-1', partner_id: 'p-1', title: 'My Ad', position: 'banner' }];
    mockFrom.mockReturnValue(makeBuilder({ data: ads, error: null }));

    const result = await fetchMyAds('p-1');
    expect(result).toEqual(ads);
  });
});

// ---------------------------------------------------------------------------
// createPartnerAd
// ---------------------------------------------------------------------------

describe('createPartnerAd', () => {
  it('creates partner ad as inactive', async () => {
    const newAd = { id: 'a-new', partner_id: 'p-1', title: 'New Ad', is_active: false };
    const builder = makeBuilder({ data: newAd, error: null });
    mockFrom.mockReturnValue(builder);

    const result = await createPartnerAd({
      partner_id: 'p-1',
      title: 'New Ad',
      position: 'banner',
    });

    expect(result).toEqual(newAd);
    // Verify is_active is forced to false on insert
    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ is_active: false }),
    );
  });

  it('throws on DB error', async () => {
    const error = new Error('ad insert error');
    mockFrom.mockReturnValue(makeBuilder({ data: null, error }));
    await expect(
      createPartnerAd({ partner_id: 'p-1', title: 'Fail Ad', position: 'inline' }),
    ).rejects.toThrow('ad insert error');
  });
});

// ---------------------------------------------------------------------------
// updatePartnerAd
// ---------------------------------------------------------------------------

describe('updatePartnerAd', () => {
  it('resolves without error on success', async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: null }));
    await expect(updatePartnerAd('a-1', { title: 'Updated' })).resolves.toBeUndefined();
  });

  it('throws on DB error', async () => {
    const error = new Error('ad update error');
    mockFrom.mockReturnValue(makeBuilder({ data: null, error }));
    await expect(updatePartnerAd('a-1', {})).rejects.toThrow('ad update error');
  });
});

// ---------------------------------------------------------------------------
// Admin functions
// ---------------------------------------------------------------------------

describe('adminFetchAllPartners', () => {
  it('returns all partners', async () => {
    const partners = [{ id: 'p-1', company_name: 'Acme' }];
    mockFrom.mockReturnValue(makeBuilder({ data: partners, error: null }));

    const result = await adminFetchAllPartners();
    expect(result).toEqual(partners);
  });

  it('returns empty array when data is null', async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: null }));
    const result = await adminFetchAllPartners();
    expect(result).toEqual([]);
  });
});

describe('adminUpdatePartnerStatus', () => {
  it('resolves without error on success', async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: null }));
    await expect(adminUpdatePartnerStatus('p-1', 'active')).resolves.toBeUndefined();
  });

  it('throws on DB error', async () => {
    const error = new Error('admin update error');
    mockFrom.mockReturnValue(makeBuilder({ data: null, error }));
    await expect(adminUpdatePartnerStatus('p-1', 'suspended')).rejects.toThrow('admin update error');
  });
});

describe('adminFetchAllInvoices', () => {
  it('returns all invoices', async () => {
    const invoices = [{ id: 'i-1', amount_chf: 200, status: 'sent' }];
    mockFrom.mockReturnValue(makeBuilder({ data: invoices, error: null }));

    const result = await adminFetchAllInvoices();
    expect(result).toEqual(invoices);
  });

  it('returns empty array when data is null', async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: null }));
    const result = await adminFetchAllInvoices();
    expect(result).toEqual([]);
  });
});

describe('adminFetchAllPartnerAds', () => {
  it('returns all partner ads', async () => {
    const ads = [{ id: 'a-1', title: 'Ad 1', is_active: true }];
    mockFrom.mockReturnValue(makeBuilder({ data: ads, error: null }));

    const result = await adminFetchAllPartnerAds();
    expect(result).toEqual(ads);
  });
});

describe('adminTogglePartnerAd', () => {
  it('resolves without error on success', async () => {
    const builder = makeBuilder({ data: null, error: null });
    mockFrom.mockReturnValue(builder);

    await expect(adminTogglePartnerAd('a-1', true)).resolves.toBeUndefined();
    expect(builder.update).toHaveBeenCalledWith({ is_active: true });
  });

  it('throws on DB error', async () => {
    const error = new Error('toggle error');
    mockFrom.mockReturnValue(makeBuilder({ data: null, error }));
    await expect(adminTogglePartnerAd('a-1', false)).rejects.toThrow('toggle error');
  });
});

describe('adminMarkInvoicePaid', () => {
  it('resolves without error on success', async () => {
    const builder = makeBuilder({ data: null, error: null });
    mockFrom.mockReturnValue(builder);

    await expect(adminMarkInvoicePaid('i-1', '2025-01-15T10:00:00Z')).resolves.toBeUndefined();
    expect(builder.update).toHaveBeenCalledWith({ status: 'paid', paid_at: '2025-01-15T10:00:00Z' });
  });

  it('throws on DB error', async () => {
    const error = new Error('paid error');
    mockFrom.mockReturnValue(makeBuilder({ data: null, error }));
    await expect(adminMarkInvoicePaid('i-1', '2025-01-15T10:00:00Z')).rejects.toThrow('paid error');
  });
});
