import React, { useState, useMemo } from 'react';
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
import { ListingCard } from '../components/ListingCard';
import { CategoryFilter } from '../components/CategoryFilter';
import { SearchBar } from '../components/SearchBar';
import { FeaturedRow } from '../components/FeaturedRow';
import { SectionHeader } from '../components/SectionHeader';
import { theme } from '../styles/theme';
import type { Listing, ListingCategory } from '../types';

const SAVED_KEY = 'winti_saved_listings';

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

function getTodayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Guten Morgen';
  if (hour < 18) return 'Guten Tag';
  return 'Guten Abend';
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
  | { type: 'section-title'; title: string };

type ListItem = HeaderSection | { type: 'listing'; data: Listing };

export function HomeScreen() {
  const [category, setCategory] = useState<ListingCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [savedIds, setSavedIds] = useState<string[]>([]);

  React.useEffect(() => {
    loadSaved().then(setSavedIds);
  }, []);

  const { listings, loading, error, refresh } = useListings({
    category: category === 'all' ? undefined : category,
    search: search.trim() || undefined,
  });

  const filteredListings = useMemo(() => {
    if (!search.trim()) return listings;
    const q = search.toLowerCase();
    return listings.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        (l.address ?? '').toLowerCase().includes(q) ||
        (l.sub_type ?? '').toLowerCase().includes(q),
    );
  }, [listings, search]);

  // Pick up to 6 featured listings (premium first, then others)
  const featuredListings = useMemo(() => {
    const premium = listings.filter((l) => l.is_premium);
    const others = listings.filter((l) => !l.is_premium);
    return [...premium, ...others].slice(0, 6);
  }, [listings]);

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

    // Show featured row only when no search active
    if (!search.trim() && !loading && featuredListings.length > 0) {
      items.push({ type: 'featured' });
    }

    if (!loading && !error) {
      items.push({ type: 'section-title', title: categoryLabel });
      filteredListings.forEach((l) => items.push({ type: 'listing', data: l }));
    }

    return items;
  }, [search, loading, error, featuredListings, filteredListings, categoryLabel]);

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

      case 'listing':
        return (
          <ListingCard
            listing={(item as { type: 'listing'; data: Listing }).data}
            isSaved={savedIds.includes((item as { type: 'listing'; data: Listing }).data.id)}
            onToggleSave={handleToggleSave}
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
            return `${item.type}-${index}`;
          }}
          renderItem={renderItem}
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
