import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useListings } from '../hooks/useListings';
import { useAppTier } from '../hooks/useAppTier';
import { useFavorites } from '../hooks/useFavorites';
import { fetchPartnerAds } from '../services/supabaseService';
import { ListingCard } from '../components/ListingCard';
import { ListingRow } from '../components/ListingRow';
import { PartnerAdBanner } from '../components/PartnerAdBanner';
import { CategoryFilter } from '../components/CategoryFilter';
import { SubCategoryFilter } from '../components/SubCategoryFilter';
import { CollectionRow } from '../components/CollectionRow';
import { SearchBar } from '../components/SearchBar';
import { FeaturedRow } from '../components/FeaturedRow';
import { SectionHeader } from '../components/SectionHeader';
import { AiGuideCard } from '../components/AiGuideCard';
import { useTranslation } from '../hooks/useTranslation';
import { useLocation } from '../hooks/useLocation';
import { distanceKm, formatDistance } from '../utils/distance';
import { theme } from '../styles/theme';
import { matchesSubType } from '../config/subcategories';
import { getCollection, matchesCollection } from '../config/collections';
import { INTERESTS_KEY } from './OnboardingScreen';
import type { Listing, ListingCategory, PartnerAd } from '../types';

const AD_FREQUENCY = 5; // Show an ad every N listings
const VIEW_MODE_KEY = 'winti_view_mode';
type ViewMode = 'cards' | 'compact';

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
  | { type: 'ai-guide' }
  | { type: 'categories' }
  | { type: 'collections' }
  | { type: 'subcategories' }
  | { type: 'nearby' }
  | { type: 'view-toggle' }
  | { type: 'section-title'; title: string };

type ListItem = HeaderSection | { type: 'listing'; data: Listing } | { type: 'ad'; data: PartnerAd };

export function HomeScreen({ onNavigateToAccount, onNavigateToMap }: { onNavigateToAccount?: () => void; onNavigateToMap?: (listing: Listing) => void }) {
  const [category, setCategory] = useState<ListingCategory | 'all'>('all');
  const [subType, setSubType] = useState<string>('all');
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const { savedIds, toggle: handleToggleSave } = useFavorites();
  const [partnerAds, setPartnerAds] = useState<PartnerAd[]>([]);

  const [nearby, setNearby] = useState(false);
  const [interests, setInterests] = useState<ListingCategory[]>([]);

  // Ansicht: grosse Foto-Karten oder kompakte Liste (persistiert).
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  useEffect(() => {
    AsyncStorage.getItem(VIEW_MODE_KEY).then((v) => {
      if (v === 'cards' || v === 'compact') setViewMode(v);
    });
  }, []);
  const toggleViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    AsyncStorage.setItem(VIEW_MODE_KEY, mode).catch(() => undefined);
  };

  // Scroll-to-top: Liste-Ref + Sichtbarkeit des schwebenden Buttons.
  const listRef = useRef<FlatList>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const { isPremium } = useAppTier();
  const { t } = useTranslation();
  const { coords, status: locStatus, request: requestLocation } = useLocation();

  const toggleNearby = () => {
    if (!nearby && !coords) requestLocation();
    setNearby((v) => !v);
  };

  // Kategorie wählen → Kollektion zurücksetzen (Filter dürfen sich nicht widersprechen).
  const handleSelectCategory = (cat: ListingCategory | 'all') => {
    setActiveCollection(null);
    setCategory(cat);
  };

  // Kollektion wählen → normale Kategorie-/Sub-Filter zurücksetzen.
  const handleSelectCollection = (id: string | null) => {
    if (id) {
      setCategory('all');
      setSubType('all');
    }
    setActiveCollection(id);
  };

  // Im Onboarding gewählte Interessen laden (für Personalisierung der Reihenfolge)
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(INTERESTS_KEY)
      .then((raw) => {
        if (!active || !raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setInterests(parsed.filter((c): c is ListingCategory => typeof c === 'string'));
        }
      })
      .catch(() => {
        // ignorieren – Fallback ist die unveränderte Reihenfolge
      });
    return () => {
      active = false;
    };
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

  const interestSet = useMemo(() => new Set(interests), [interests]);

  // Stabile Sortierung: Einträge passender Interessen zuerst (sonst Reihenfolge unverändert).
  const prioritizeByInterest = (items: Listing[]): Listing[] => {
    if (interestSet.size === 0) return items;
    return items
      .map((listing, index) => ({ listing, index }))
      .sort((a, b) => {
        const aMatch = interestSet.has(a.listing.category) ? 0 : 1;
        const bMatch = interestSet.has(b.listing.category) ? 0 : 1;
        if (aMatch !== bMatch) return aMatch - bMatch;
        return a.index - b.index;
      })
      .map((entry) => entry.listing);
  };

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
      result = result.filter((l) => matchesSubType(l.sub_type, subType));
    }
    const collection = getCollection(activeCollection);
    if (collection) {
      result = result.filter((l) => matchesCollection(l, collection));
    }
    if (nearby && coords) {
      // Einträge mit Koordinaten nach Distanz sortieren; ohne Koordinaten ans Ende.
      result = [...result].sort((a, b) => {
        const da = a.lat != null && a.lon != null
          ? distanceKm(coords, { lat: a.lat, lon: a.lon }) : Infinity;
        const db = b.lat != null && b.lon != null
          ? distanceKm(coords, { lat: b.lat, lon: b.lon }) : Infinity;
        return da - db;
      });
    } else if (category === 'all' && !search.trim()) {
      // Ohne aktiven Standort-/Such-/Kategoriefilter nach Interessen gewichten.
      result = prioritizeByInterest(result);
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listings, search, subType, nearby, coords, category, interestSet, activeCollection]);

  // Distanz pro Eintrag (nur wenn "In der Nähe" aktiv und Standort vorhanden)
  const distances = useMemo(() => {
    const map = new Map<string, number>();
    if (nearby && coords) {
      for (const l of filteredListings) {
        if (l.lat != null && l.lon != null) {
          map.set(l.id, distanceKm(coords, { lat: l.lat, lon: l.lon }));
        }
      }
    }
    return map;
  }, [nearby, coords, filteredListings]);

  // Pick up to 6 featured listings (premium first, then others)
  const featuredListings = useMemo(() => {
    const premium = prioritizeByInterest(listings.filter((l) => l.is_premium));
    const others = prioritizeByInterest(listings.filter((l) => !l.is_premium));
    return [...premium, ...others].slice(0, 6);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listings, interestSet]);

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

  const activeCollectionDef = getCollection(activeCollection);
  const categoryLabel = activeCollectionDef
    ? t(activeCollectionDef.labelKey as 'restaurants')
    : category === 'all'
      ? t('all_places')
      : t(category as 'restaurants');

  // Build FlatList data with header sections injected
  const listData = useMemo<ListItem[]>(() => {
    const items: ListItem[] = [
      { type: 'header' },
      { type: 'search' },
      { type: 'nearby' },
      { type: 'categories' },
      { type: 'collections' },
    ];

    // Show subcategory chips when a specific category is selected
    if (category !== 'all') {
      items.push({ type: 'subcategories' });
    }

    // Show featured row only when no search active
    if (!search.trim() && !loading && featuredListings.length > 0) {
      items.push({ type: 'featured' });
    }

    // AI Guide card (always visible when no active search)
    if (!search.trim()) {
      items.push({ type: 'ai-guide' });
    }

    if (!loading && !error) {
      items.push({ type: 'section-title', title: categoryLabel });
      if (filteredListings.length > 0) items.push({ type: 'view-toggle' });
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
  }, [search, loading, error, featuredListings, filteredListings, categoryLabel, category, isPremium, partnerAds, activeCollection]);

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
                <Text style={styles.premiumHintText}>⭐ {t('premium')}</Text>
              </TouchableOpacity>
            )}
          </View>
        );

      case 'search':
        return (
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder={t('search_examples_placeholder')}
          />
        );

      case 'nearby':
        return (
          <View style={styles.nearbyRow}>
            <TouchableOpacity
              style={[styles.nearbyBtn, nearby && styles.nearbyBtnActive]}
              onPress={toggleNearby}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ selected: nearby }}
              accessibilityLabel={t('nearby')}
            >
              <Ionicons
                name={nearby ? 'navigate' : 'navigate-outline'}
                size={16}
                color={nearby ? '#FFFFFF' : theme.colors.primary}
              />
              <Text style={[styles.nearbyText, nearby && styles.nearbyTextActive]}>
                {t('nearby')}
              </Text>
              {nearby && locStatus === 'requesting' && (
                <ActivityIndicator size="small" color="#FFFFFF" style={{ marginLeft: 4 }} />
              )}
            </TouchableOpacity>
            {nearby && (locStatus === 'denied' || locStatus === 'unavailable') && (
              <Text style={styles.nearbyHint}>{t('location_unavailable')}</Text>
            )}
          </View>
        );

      case 'categories':
        return <CategoryFilter selected={category} onSelect={handleSelectCategory} />;

      case 'collections':
        return (
          <CollectionRow
            selected={activeCollection}
            onSelect={handleSelectCollection}
          />
        );

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
            <SectionHeader title={t('recommended_for_you')} />
            <FeaturedRow
              listings={featuredListings}
              savedIds={savedIds}
              onToggleSave={handleToggleSave}
            />
          </>
        );

      case 'ai-guide':
        return <AiGuideCard />;

      case 'section-title':
        return (
          <SectionHeader
            title={(item as { type: 'section-title'; title: string }).title}
          />
        );

      case 'view-toggle':
        return (
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.viewBtn, viewMode === 'cards' && styles.viewBtnActive]}
              onPress={() => toggleViewMode('cards')}
              accessibilityRole="button"
              accessibilityLabel={t('view_cards')}
              accessibilityState={{ selected: viewMode === 'cards' }}
            >
              <Ionicons
                name="image"
                size={16}
                color={viewMode === 'cards' ? '#FFFFFF' : theme.colors.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewBtn, viewMode === 'compact' && styles.viewBtnActive]}
              onPress={() => toggleViewMode('compact')}
              accessibilityRole="button"
              accessibilityLabel={t('view_list')}
              accessibilityState={{ selected: viewMode === 'compact' }}
            >
              <Ionicons
                name="list"
                size={18}
                color={viewMode === 'compact' ? '#FFFFFF' : theme.colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        );

      case 'ad':
        return <PartnerAdBanner ad={(item as { type: 'ad'; data: PartnerAd }).data} />;

      case 'listing': {
        const l = (item as { type: 'listing'; data: Listing }).data;
        const cardProps = {
          listing: l,
          isSaved: savedIds.includes(l.id),
          onToggleSave: handleToggleSave,
          onShowOnMap: onNavigateToMap,
          distanceKm: distances.get(l.id),
        };
        return viewMode === 'compact' ? <ListingRow {...cardProps} /> : <ListingCard {...cardProps} />;
      }

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>{t('loading')}</Text>
        </View>
      )}

      {error && !loading && (
        <View style={styles.center}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={refresh}>
            <Text style={styles.retryText}>{t('retry')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {!error && (
        <FlatList
          ref={listRef}
          data={listData}
          keyExtractor={(item, index) => {
            if (item.type === 'listing') return (item as { type: 'listing'; data: Listing }).data.id;
            if (item.type === 'ad') return `ad_${(item as { type: 'ad'; data: PartnerAd }).data.id}_${index}`;
            return `${item.type}-${index}`;
          }}
          renderItem={renderItem}
          extraData={{ category, subType, savedIds, activeCollection, viewMode }}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(e) => {
            const y = e.nativeEvent.contentOffset.y;
            setShowScrollTop((prev) => (prev !== y > 700 ? y > 700 : prev));
          }}
          onRefresh={refresh}
          refreshing={loading}
          ListFooterComponent={
            !loading && !error && filteredListings.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🔍</Text>
                <Text style={styles.emptyTitle}>{t('no_results')}</Text>
                <Text style={styles.emptyHint}>{t('try_different_search')}</Text>
              </View>
            ) : null
          }
        />
      )}

      {showScrollTop && (
        <TouchableOpacity
          style={styles.scrollTopBtn}
          onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t('scroll_to_top')}
        >
          <Ionicons name="arrow-up" size={22} color="#FFFFFF" />
        </TouchableOpacity>
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
  viewToggle: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    gap: 4,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.xs,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.borderRadius.full,
    padding: 3,
  },
  viewBtn: {
    width: 36,
    height: 30,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewBtnActive: {
    backgroundColor: theme.colors.primary,
  },
  scrollTopBtn: {
    position: 'absolute',
    right: theme.spacing.md,
    bottom: theme.spacing.lg,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.medium,
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
    fontFamily: theme.fonts.displayBold,
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
  nearbyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  nearbyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    minHeight: 40,
  },
  nearbyBtnActive: {
    backgroundColor: theme.colors.primary,
  },
  nearbyText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  nearbyTextActive: {
    color: '#FFFFFF',
  },
  nearbyHint: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textMuted,
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
