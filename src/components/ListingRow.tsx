import React, { useMemo } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import type { AppTheme } from '../styles/theme';
import { useDetail } from '../context/DetailContext';
import { useTranslation } from '../hooks/useTranslation';
import { formatDistance } from '../utils/distance';
import { getListingVisual } from '../config/categoryVisuals';
import { primaryImage } from '../utils/listingImage';
import type { Listing } from '../types';

interface Props {
  listing: Listing;
  isSaved: boolean;
  onToggleSave: (listing: Listing) => void;
  onShowOnMap?: (listing: Listing) => void;
  distanceKm?: number;
}

/** Kompakte Listenzeile (Alternative zur grossen Foto-Karte). */
export function ListingRow({ listing, isSaved, onToggleSave, onShowOnMap, distanceKm }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const visual = getListingVisual(listing.category);
  const { open } = useDetail();
  const { t } = useTranslation();

  const openDetail = () => open({ kind: 'listing', listing, isSaved, onToggleSave, onShowOnMap });

  const sub = [listing.sub_type, listing.address].filter(Boolean).join(' · ');

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={openDetail}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${listing.name} – Details öffnen`}
    >
      {primaryImage(listing) ? (
        <Image source={{ uri: primaryImage(listing)! }} style={styles.thumb} resizeMode="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback, { backgroundColor: visual.bg }]}>
          <Ionicons name={visual.icon} size={22} color="rgba(255,255,255,0.95)" />
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>{listing.name}</Text>
        {sub ? <Text style={styles.sub} numberOfLines={1}>{sub}</Text> : null}
        {distanceKm != null && (
          <View style={styles.distanceRow}>
            <Ionicons name="navigate" size={11} color={theme.colors.primary} />
            <Text style={styles.distance}>{formatDistance(distanceKm)}</Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.save}
        onPress={() => onToggleSave(listing)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel={isSaved ? t('saved_label') : t('save')}
      >
        <Ionicons
          name={isSaved ? 'heart' : 'heart-outline'}
          size={20}
          color={isSaved ? theme.colors.primary : theme.colors.textMuted}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    marginVertical: 5,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm + 2,
    ...theme.shadow.small,
  },
  thumb: {
    width: 54,
    height: 54,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceAlt,
  },
  thumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  sub: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  distance: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  save: {
    padding: 2,
  },
});
