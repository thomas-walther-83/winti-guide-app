import React, { useMemo, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import type { AppTheme } from '../styles/theme';
import { useDetail } from '../context/DetailContext';
import { useTranslation } from '../hooks/useTranslation';
import { formatDistance } from '../utils/distance';
import { getListingVisual } from '../config/categoryVisuals';
import { primaryImage } from '../utils/listingImage';
import type { Listing } from '../types';

interface ListingCardProps {
  listing: Listing;
  isSaved: boolean;
  onToggleSave: (listing: Listing) => void;
  onShowOnMap?: (listing: Listing) => void;
  distanceKm?: number;
}

export function ListingCard({ listing, isSaved, onToggleSave, onShowOnMap, distanceKm }: ListingCardProps) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const visual = getListingVisual(listing.category);
  const { open } = useDetail();
  const { t } = useTranslation();
  const [imgFailed, setImgFailed] = useState(false);
  const image = primaryImage(listing);
  const showImage = !!image && !imgFailed;

  const openDetail = () =>
    open({ kind: 'listing', listing, isSaved, onToggleSave, onShowOnMap });

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={openDetail}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={t('a11y_open_details').replace('{name}', listing.name)}
    >
      {/* Foto-Hero (oder farbiger Fallback) mit Verlauf und Titel-Overlay */}
      <View style={styles.hero}>
        {showImage ? (
          <Image
            source={{ uri: image! }}
            style={styles.image}
            resizeMode="cover"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <View style={[styles.image, styles.fallback, { backgroundColor: visual.bg }]}>
            <Ionicons name={visual.icon} size={56} color="rgba(255,255,255,0.9)" />
          </View>
        )}

        <LinearGradient
          colors={['transparent', 'rgba(15,11,8,0.05)', 'rgba(15,11,8,0.78)']}
          locations={[0, 0.5, 1]}
          style={styles.gradient}
        />

        {/* Kategorie/Subtyp-Chip oben links */}
        {(listing.sub_type || listing.is_premium) && (
          <View style={styles.chipRow}>
            {listing.is_premium && (
              <View style={[styles.chip, styles.chipPremium]}>
                <Ionicons name="star" size={11} color="#FFFFFF" />
                <Text style={styles.chipPremiumText}>{t('premium')}</Text>
              </View>
            )}
            {listing.sub_type ? (
              <View style={styles.chip}>
                <Text style={styles.chipText} numberOfLines={1}>{listing.sub_type}</Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Speichern oben rechts */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={() => onToggleSave(listing)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={isSaved ? t('saved_label') : t('save')}
        >
          <Ionicons
            name={isSaved ? 'heart' : 'heart-outline'}
            size={20}
            color={isSaved ? theme.colors.primary : '#FFFFFF'}
          />
        </TouchableOpacity>

        {/* Titel-Overlay unten */}
        <Text style={styles.name} numberOfLines={2}>{listing.name}</Text>
      </View>

      {/* Meta-Zeile auf weisser Fläche */}
      <View style={styles.meta}>
        {distanceKm != null && (
          <View style={styles.metaItem}>
            <Ionicons name="navigate" size={13} color={theme.colors.primary} />
            <Text style={[styles.metaText, styles.metaAccent]}>{formatDistance(distanceKm)}</Text>
          </View>
        )}
        {listing.address ? (
          <View style={[styles.metaItem, styles.metaFlex]}>
            <Ionicons name="location-outline" size={13} color={theme.colors.textMuted} />
            <Text style={styles.metaText} numberOfLines={1}>{listing.address}</Text>
          </View>
        ) : null}
        {!listing.address && listing.hours ? (
          <View style={[styles.metaItem, styles.metaFlex]}>
            <Ionicons name="time-outline" size={13} color={theme.colors.textMuted} />
            <Text style={styles.metaText} numberOfLines={1}>{listing.hours}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadow.small,
  },
  hero: {
    height: 170,
    justifyContent: 'flex-end',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.surfaceAlt,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  chipRow: {
    position: 'absolute',
    top: theme.spacing.sm,
    left: theme.spacing.sm,
    flexDirection: 'row',
    gap: 6,
    maxWidth: '72%',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  chipText: {
    // Chip-Hintergrund ist immer weiss → Text fix dunkel (auch im Dark Mode lesbar).
    fontSize: 11,
    fontWeight: '700',
    color: '#1C1A17',
    letterSpacing: 0.2,
  },
  chipPremium: {
    backgroundColor: theme.colors.premium,
  },
  chipPremiumText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  saveButton: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(20,16,12,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontFamily: theme.fonts.displayBold,
    fontSize: 21,
    fontWeight: '700',
    color: '#FFFFFF',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    letterSpacing: -0.2,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaFlex: {
    flex: 1,
  },
  metaText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  metaAccent: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
});
