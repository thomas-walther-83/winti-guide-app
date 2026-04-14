import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchListings } from '../services/supabaseService';
import { useAppTier } from '../hooks/useAppTier';
import { ListingCard } from '../components/ListingCard';
import { theme } from '../styles/theme';
import type { Listing } from '../types';

const SAVED_KEY = 'winti_saved_listings';
const FREE_SAVE_LIMIT = 5;

export function SavedScreen({ onNavigateToAccount }: { onNavigateToAccount?: () => void }) {
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [savedListings, setSavedListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const { isPremium } = useAppTier();

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const val = await AsyncStorage.getItem(SAVED_KEY);
        const ids: string[] = val ? JSON.parse(val) : [];
        setSavedIds(ids);

        if (ids.length > 0) {
          const all = await fetchListings();
          const saved = all.filter((l) => ids.includes(l.id));
          setSavedListings(saved);
        } else {
          setSavedListings([]);
        }
      } catch (err) {
        console.error('Error loading saved:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleToggleSave = async (listing: Listing) => {
    const next = savedIds.includes(listing.id)
      ? savedIds.filter((x) => x !== listing.id)
      : [...savedIds, listing.id];
    await AsyncStorage.setItem(SAVED_KEY, JSON.stringify(next));
    setSavedIds(next);
    setSavedListings((prev) =>
      next.includes(listing.id)
        ? [...prev, listing]
        : prev.filter((l) => l.id !== listing.id),
    );
  };

  // For free users, only show the first FREE_SAVE_LIMIT items
  const visibleListings = isPremium ? savedListings : savedListings.slice(0, FREE_SAVE_LIMIT);
  const hiddenCount = isPremium ? 0 : Math.max(0, savedListings.length - FREE_SAVE_LIMIT);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>❤️ Gespeichert</Text>
        </View>
        <View style={styles.center}>
          <Text style={styles.loadingText}>Laden...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>❤️ Gespeichert</Text>
        {savedListings.length > 0 && (
          <Text style={styles.count}>
            {visibleListings.length}
            {!isPremium ? `/${FREE_SAVE_LIMIT}` : ''} Einträge
          </Text>
        )}
      </View>

      {/* Free-tier limit banner */}
      {!isPremium && savedIds.length >= FREE_SAVE_LIMIT && (
        <TouchableOpacity style={styles.limitBanner} onPress={onNavigateToAccount} activeOpacity={0.8}>
          <Text style={styles.limitBannerText}>
            🔒 Limit von {FREE_SAVE_LIMIT} Einträgen erreicht · Premium für unbegrenzte Speicherung
          </Text>
        </TouchableOpacity>
      )}

      {visibleListings.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🤍</Text>
          <Text style={styles.emptyTitle}>Noch nichts gespeichert</Text>
          <Text style={styles.emptyHint}>
            Tippe auf das Herz-Symbol bei einem Eintrag, um ihn zu speichern.
          </Text>
          {!isPremium && (
            <TouchableOpacity style={styles.tip}>
              <Text style={styles.tipText}>
                💡 Free-Nutzer können bis zu {FREE_SAVE_LIMIT} Einträge speichern
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={visibleListings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ListingCard
              listing={item}
              isSaved={savedIds.includes(item.id)}
              onToggleSave={handleToggleSave}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            hiddenCount > 0 ? (
              <TouchableOpacity
                style={styles.premiumTeaser}
                onPress={onNavigateToAccount}
                activeOpacity={0.8}
              >
                <Text style={styles.premiumTeaserIcon}>🔒</Text>
                <View style={styles.premiumTeaserInfo}>
                  <Text style={styles.premiumTeaserTitle}>
                    +{hiddenCount} weitere gespeicherte Einträge
                  </Text>
                  <Text style={styles.premiumTeaserSub}>
                    Upgrade auf Premium für unbegrenzte Speicherung
                  </Text>
                </View>
                <Text style={styles.premiumTeaserArrow}>→</Text>
              </TouchableOpacity>
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
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
  },
  count: {
    fontSize: 13,
    color: theme.colors.textMuted,
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
  emptyEmoji: {
    fontSize: 56,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  tip: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
    ...theme.shadow.small,
  },
  tipText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  limitBanner: {
    backgroundColor: '#FFFBF0',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.premium,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  limitBannerText: {
    fontSize: 12,
    color: '#92400e',
    textAlign: 'center',
    lineHeight: 17,
  },
  premiumTeaser: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBF0',
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.premium,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xl,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    ...theme.shadow.small,
  },
  premiumTeaserIcon: {
    fontSize: 24,
  },
  premiumTeaserInfo: {
    flex: 1,
    gap: 3,
  },
  premiumTeaserTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  premiumTeaserSub: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  premiumTeaserArrow: {
    fontSize: 18,
    color: theme.colors.primary,
    fontWeight: '700',
  },
});
