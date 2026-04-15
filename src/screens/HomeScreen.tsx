import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useListings } from '../hooks/useListings';
import { useAppTier } from '../hooks/useAppTier';
import { fetchPartnerAds } from '../services/supabaseService';
import { ListingCard } from '../components/ListingCard';
import { PartnerAdBanner } from '../components/PartnerAdBanner';
import { CategoryFilter } from '../components/CategoryFilter';
import { SubCategoryFilter } from '../components/SubCategoryFilter';
import { SearchBar } from '../components/SearchBar';
import { FeaturedRow } from '../components/FeaturedRow';
import { SectionHeader } from '../components/SectionHeader';
import { theme } from '../styles/theme';
import { SUB_CATEGORY_ALIASES } from '../config/subcategories';
import type { Listing, ListingCategory, PartnerAd } from '../types';

const SAVED_KEY = 'winti_saved_listings';
const AD_FREQUENCY = 5; // Show an ad every N listings

async function loadSaved(): Promise<string[]> {
  try {
    const val = await AsyncStorage.getItem(SAVED_KEY);
    return val ? JSON.parse(val) : [];
  } catch {
    return [];
  }
}

async function toggleSaved(id: string, current: string[]): Promise<string[]> {
  const next = current.includes(id)
    ? current.filter((x) => x !== id)
    : [...current, id];
  await AsyncStorage.setItem(SAVED_KEY, JSON.stringify(next));
  return next;
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString('de-CH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

type HeaderSection =
  | { type: 'header' }
  | { type: 'search' }
  | { type: 'featured' }
  | { type: 'categories' }
  | { type: 'subcategories' }
  | { type: 'section-title'; title: string };

type ListItem = HeaderSection | { type: 'listing'; data: Listing } | { type: 'ad'; data: PartnerAd };

export function HomeScreen({ onNavigateToAccount, onNavigateToMap }: { onNavigateToAccount?: () => void; onNavigateToMap?: (listing: Listing) => void }) {
  const [category, setCategory] = useState<ListingCategory | 'all'>('all');
  const [subType, setSubType] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [partnerAds, setPartnerAds] = useState<PartnerAd[]>([]);

  const { isPremium } = useAppTier();

  React.useEffect(() => {
    loadSaved().then(setSavedIds);
  }, []);

  // Load partner ads for free users
  useEffect(() => {
    if (!isPremium) {
      fetchPartnerAds()
        .then((ads) => {
          if (ads) setPartnerAds(ads);
        })
        .catch(console.error);
    } else {
      setPartnerAds([]);
    }
  }, [isPremium]);

  // Reset subcategory whenever the main category changes
  React.useEffect(() => {
    setSubType('all');
  }, [category]);

  const { listings, loading, error, refresh } = useListings({
    category: category === 'all' ? undefined : category,
    search: search.trim() || undefined,
  });

  const filteredListings = useMemo(() => {
    let result = listings;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          (l.address ?? '').toLowerCase().includes(q) ||
          (l.sub_type ?? '').toLowerCase().includes(q),
      );
    }
    if (subType !== 'all') {
      const aliases = SUB_CATEGORY_ALIASES[subType] ?? [subType.toLowerCase()];
      result = result.filter((l) => aliases.includes((l.sub_type ?? '').toLowerCase()));
    }
    return result;
  }, [listings, search, subType]);

  // Pick up to 6 featured listings (premium first, then others)
  const featuredListings = useMemo(() => {
    const premium = listings.filter((l) => l.is_premium);
    const others = listings.filter((l) => !l.is_premium);
    return [...premium, ...others].slice(0, 6);
  }, [listings]);

  // Interleave ads between listings for free-tier users
  const listItems: ListItem[] = useMemo(() => {
    if (isPremium || partnerAds.length === 0) {
      return filteredListings.map((l) => ({ type: 'listing', data: l }));
    }
    const result: ListItem[] = [];
    let adIndex = 0;
    filteredListings.forEach((listing, idx) => {
      result.push({ type: 'listing', data: listing });
      if ((idx + 1) % AD_FREQUENCY === 0 && partnerAds.length > 0) {
        result.push({ type: 'ad', data: partnerAds[adIndex % partnerAds.length] });
        adIndex++;
      }
    });
    return result;
  }, [filteredListings, partnerAds, isPremium]);

  const handleToggleSave = async (listing: Listing) => {
    const next = await toggleSaved(listing.id, savedIds);
    setSavedIds(next);
  };

  const categoryLabel = category === 'all' ? 'Alle Orte' : {
    restaurants: 'Restaurants',
    cafes: 'Cafés',
    bars: 'Bars',
    hotels: 'Hotels',
    sightseeing: 'Sightseeing',
    kultur: 'Kultur',
    geschaefte: 'Geschäfte',
    sport: 'Sport',
    touren: 'Touren',
  }[category] ?? 'Orte';

  // Build FlatList data with header sections injected
  const listData = useMemo<ListItem[]>(() => {
    const items: ListItem[] = [
      { type: 'header' },
      { type: 'search' },
      { type: 'categories' },
    ];

    // Show subcategory chips when a specific category is selected
    if (category !== 'all') {
      items.push({ type: 'subcategories' });
    }

    // Show featured row only when no search active
    if (!search.trim() && !loading && featuredListings.length > 0) {
      items.push({ type: 'featured' });
    }

    if (!loading && !error) {
      items.push({ type: 'section-title', title: categoryLabel });
      let adIndex = 0;
      filteredListings.forEach((l, idx) => {
        items.push({ type: 'listing', data: l });
        if (!isPremium && partnerAds.length > 0 && (idx + 1) % AD_FREQUENCY === 0) {
          items.push({ type: 'ad', data: partnerAds[adIndex % partnerAds.length] });
          adIndex++;
        }
      });
    }

    return items;
  }, [search, loading, error, featuredListings, filteredListings, categoryLabel, category, isPremium, partnerAds]);

  const renderItem = ({ item }: { item: ListItem }) => {
    switch (item.type) {
      case 'header':
        return (
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.logo}>🦁</Text>
              <View>
                <Text style={styles.appName}>Winti Guide</Text>
                <Text style={styles.headerDate}>{getFormattedDate()}</Text>
              </View>
            </View>
            {!isPremium && (
              <TouchableOpacity onPress={onNavigateToAccount} style={styles.premiumHint}>
                <Text style={styles.premiumHintText}>⭐ Premium</Text>
              </TouchableOpacity>
            )}
          </View>
        );

      case 'search':
        return (
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Restaurants, Cafés, Hotels..."
          />
        );

      case 'categories':
        return <CategoryFilter selected={category} onSelect={setCategory} />;

      case 'subcategories':
        return category !== 'all' ? (
          <SubCategoryFilter
            category={category}
            selected={subType}
            onSelect={setSubType}
          />
        ) : null;

      case 'featured':
        return (
          <>
            <SectionHeader title="Empfohlen für dich" />
            <FeaturedRow
              listings={featuredListings}
              savedIds={savedIds}
              onToggleSave={handleToggleSave}
            />
          </>
        );

      case 'section-title':
        return (
          <SectionHeader
            title={(item as { type: 'section-title'; title: string }).title}
          />
        );

      case 'ad':
        return <PartnerAdBanner ad={(item as { type: 'ad'; data: PartnerAd }).data} />;

      case 'listing':
        return (
          <ListingCard
            listing={(item as { type: 'listing'; data: Listing }).data}
            isSaved={savedIds.includes((item as { type: 'listing'; data: Listing }).data.id)}
            onToggleSave={handleToggleSave}
            onShowOnMap={onNavigateToMap}
          />
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Laden...</Text>
        </View>
      )}

      {error && !loading && (
        <View style={styles.center}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={refresh}>
            <Text style={styles.retryText}>Erneut versuchen</Text>
          </TouchableOpacity>
        </View>
      )}

      {!error && (
        <FlatList
          data={listData}
          keyExtractor={(item, index) => {
            if (item.type === 'listing') return (item as { type: 'listing'; data: Listing }).data.id;
            if (item.type === 'ad') return `ad_${(item as { type: 'ad'; data: PartnerAd }).data.id}_${index}`;
            return `${item.type}-${index}`;
          }}
          renderItem={renderItem}
          extraData={{ category, subType, savedIds }}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onRefresh={refresh}
          refreshing={loading}
          ListFooterComponent={
            !loading && !error && filteredListings.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🔍</Text>
                <Text style={styles.emptyTitle}>Keine Einträge gefunden</Text>
                <Text style={styles.emptyHint}>Probiere eine andere Kategorie oder Suche</Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  logo: {
    fontSize: 34,
  },
  appName: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: -0.5,
  },
  headerDate: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 1,
    textTransform: 'capitalize',
  },
  premiumHint: {
    backgroundColor: theme.colors.premium,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
  },
  premiumHintText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.surface,
  },
  list: {
    paddingBottom: theme.spacing.xl,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    gap: theme.spacing.md,
    zIndex: 10,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 15,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
