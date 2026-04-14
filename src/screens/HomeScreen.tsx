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
import { SearchBar } from '../components/SearchBar';
import { theme } from '../styles/theme';
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

type ListItem =
  | { type: 'listing'; data: Listing }
  | { type: 'ad'; data: PartnerAd };

export function HomeScreen({ onNavigateToAccount }: { onNavigateToAccount?: () => void }) {
  const [category, setCategory] = useState<ListingCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [partnerAds, setPartnerAds] = useState<PartnerAd[]>([]);

  const { isPremium } = useAppTier();

  // Load saved IDs on mount
  React.useEffect(() => {
    loadSaved().then(setSavedIds);
  }, []);

  // Load partner ads for free users
  useEffect(() => {
    if (!isPremium) {
      fetchPartnerAds().catch(console.error).then((ads) => {
        if (ads) setPartnerAds(ads);
      });
    } else {
      setPartnerAds([]);
    }
  }, [isPremium]);

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>🦁</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Winti Guide</Text>
          <Text style={styles.subtitle}>Winterthur entdecken</Text>
        </View>
        {!isPremium && (
          <TouchableOpacity onPress={onNavigateToAccount} style={styles.premiumHint}>
            <Text style={styles.premiumHintText}>⭐ Premium</Text>
          </TouchableOpacity>
        )}
      </View>

      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Restaurants, Cafés, Hotels..."
      />

      <CategoryFilter selected={category} onSelect={setCategory} />

      {loading && (
        <View style={styles.center}>
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

      {!loading && !error && filteredListings.length === 0 && (
        <View style={styles.center}>
          <Text style={styles.emptyText}>🔍 Keine Einträge gefunden</Text>
        </View>
      )}

      {!loading && !error && (
        <FlatList
          data={listItems}
          keyExtractor={(item, index) =>
            item.type === 'listing' ? item.data.id : `ad_${item.data.id}_${index}`
          }
          renderItem={({ item }) => {
            if (item.type === 'ad') {
              return <PartnerAdBanner ad={item.data} />;
            }
            return (
              <ListingCard
                listing={item.data}
                isSaved={savedIds.includes(item.data.id)}
                onToggleSave={handleToggleSave}
              />
            );
          }}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onRefresh={refresh}
          refreshing={loading}
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
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  logo: {
    fontSize: 36,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
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
    color: theme.colors.surface,
    fontWeight: '600',
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
  },
});
