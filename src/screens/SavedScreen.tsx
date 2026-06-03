import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { fetchListings } from '../services/supabaseService';
import { useAppTier } from '../hooks/useAppTier';
import { useFavorites } from '../hooks/useFavorites';
import { ListingCard } from '../components/ListingCard';
import { useTranslation } from '../hooks/useTranslation';
import { theme } from '../styles/theme';
import type { Listing } from '../types';

const FREE_SAVE_LIMIT = 5;

export function SavedScreen({ onNavigateToAccount, onNavigateToMap }: { onNavigateToAccount?: () => void; onNavigateToMap?: (listing: Listing) => void }) {
  const { savedIds, toggle: handleToggleSave } = useFavorites();
  const [savedListings, setSavedListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const { isPremium } = useAppTier();
  const { t } = useTranslation();

  // Lädt die vollständigen Listing-Daten zu den gespeicherten IDs nach,
  // wann immer sich die (lokal + Cloud gemergten) Favoriten ändern.
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        if (savedIds.length > 0) {
          const all = await fetchListings();
          const saved = all.filter((l) => savedIds.includes(l.id));
          if (active) setSavedListings(saved);
        } else if (active) {
          setSavedListings([]);
        }
      } catch (err) {
        console.error('Error loading saved:', err);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [savedIds]);

  // For free users, only show the first FREE_SAVE_LIMIT items
  const visibleListings = isPremium ? savedListings : savedListings.slice(0, FREE_SAVE_LIMIT);
  const hiddenCount = isPremium ? 0 : Math.max(0, savedListings.length - FREE_SAVE_LIMIT);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('saved')}</Text>
        </View>
        <View style={styles.center}>
          <Text style={styles.loadingText}>{t('loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('saved')}</Text>
        {savedListings.length > 0 && (
          <Text style={styles.count}>
            {visibleListings.length}
            {!isPremium ? `/${FREE_SAVE_LIMIT}` : ''} {t('entries')}
          </Text>
        )}
      </View>

      {/* Free-tier limit banner */}
      {!isPremium && savedIds.length >= FREE_SAVE_LIMIT && (
        <TouchableOpacity style={styles.limitBanner} onPress={onNavigateToAccount} activeOpacity={0.8}>
          <Text style={styles.limitBannerText}>
            {t('save_limit_prefix')} {FREE_SAVE_LIMIT} {t('save_limit_suffix')}
          </Text>
        </TouchableOpacity>
      )}

      {visibleListings.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🤍</Text>
          <Text style={styles.emptyTitle}>{t('nothing_saved_yet')}</Text>
          <Text style={styles.emptyHint}>
            {t('tap_heart_hint')}
          </Text>
          {!isPremium && (
            <TouchableOpacity style={styles.tip}>
              <Text style={styles.tipText}>
                {t('free_save_hint_prefix')} {FREE_SAVE_LIMIT} {t('free_save_hint_suffix')}
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
              onShowOnMap={onNavigateToMap}
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
                    +{hiddenCount} {t('more_saved_suffix')}
                  </Text>
                  <Text style={styles.premiumTeaserSub}>
                    {t('upgrade_unlimited_save')}
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
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.5,
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
