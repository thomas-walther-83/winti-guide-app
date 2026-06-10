import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../hooks/useTranslation';
import { useDetail } from '../context/DetailContext';
import type { AppTheme } from '../styles/theme';
import { primaryImage, isLogoUrl } from '../utils/listingImage';
import type { Listing } from '../types';

const CATEGORY_LABEL: Record<string, string> = {
  restaurants: 'Restaurant',
  cafes: 'Café',
  bars: 'Bar',
  hotels: 'Hotel',
  sightseeing: 'Sightseeing',
  kultur: 'Kultur',
  geschaefte: 'Geschäft',
  sport: 'Sport',
  touren: 'Tour',
};

// Placeholder gradient colors per category (used when no real image is available)
const CATEGORY_BG: Record<string, string> = {
  restaurants: '#C0392B',
  cafes: '#8B6914',
  bars: '#6C3483',
  hotels: '#1A5276',
  sightseeing: '#1E8449',
  kultur: '#C0392B',
  geschaefte: '#A04000',
  sport: '#117A65',
  touren: '#2E4057',
};

interface HeroCardProps {
  listing: Listing;
  isSaved: boolean;
  onToggleSave: (listing: Listing) => void;
  width?: number;
  height?: number;
  style?: ViewStyle;
}

export function HeroCard({
  listing,
  isSaved,
  onToggleSave,
  width = 280,
  height = 180,
  style,
}: HeroCardProps) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { open } = useDetail();
  const { t } = useTranslation();
  const bgColor = CATEGORY_BG[listing.category] ?? '#CC0000';
  const categoryLabel = CATEGORY_LABEL[listing.category] ?? listing.category;
  // Image-Loadfehler (Hotlink-Protection, 404 …) → Fallback auf farbigen Block.
  const [imgFailed, setImgFailed] = useState(false);
  const image = primaryImage(listing);
  const showImage = !!image && !imgFailed;
  const openDetail = () =>
    open({ listing, kind: 'listing', isSaved, onToggleSave });

  const cardContent = (
    <View style={[styles.overlay, { width, height }]}>
      {/* Bottom gradient overlay */}
      <View style={styles.gradient} />

      {/* Category badge top-left */}
      <View style={styles.categoryBadge}>
        <Text style={styles.categoryBadgeText}>{categoryLabel}</Text>
      </View>

      {/* Save button top-right */}
      <TouchableOpacity
        style={styles.saveButton}
        onPress={(e) => {
          (e as unknown as { stopPropagation?: () => void })?.stopPropagation?.();
          onToggleSave(listing);
        }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons
          name={isSaved ? 'heart' : 'heart-outline'}
          size={22}
          color={isSaved ? theme.colors.primary : '#FFFFFF'}
        />
      </TouchableOpacity>

      {/* Bottom text */}
      <View style={styles.bottomText}>
        <Text style={styles.cardName} numberOfLines={1}>
          {listing.name}
        </Text>
        {listing.address ? (
          <Text style={styles.cardAddress} numberOfLines={1}>
            {listing.address}
          </Text>
        ) : null}
      </View>
    </View>
  );

  return (
    <TouchableOpacity
      style={[styles.card, { width, height }, style]}
      onPress={openDetail}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={t('a11y_open_details').replace('{name}', listing.name)}
    >
      {showImage ? (
        <ImageBackground
          source={{ uri: image! }}
          style={[styles.colorBackground, { backgroundColor: bgColor }]}
          imageStyle={styles.imageRadius}
          resizeMode={isLogoUrl(image) ? 'contain' : 'cover'}
          onError={() => setImgFailed(true)}
        >
          {cardContent}
        </ImageBackground>
      ) : (
        <View style={[styles.colorBackground, { backgroundColor: bgColor }]}>
          {cardContent}
        </View>
      )}
    </TouchableOpacity>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  card: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadow.medium,
  },
  colorBackground: {
    flex: 1,
  },
  imageRadius: {
    borderRadius: theme.borderRadius.lg,
  },
  overlay: {
    position: 'relative',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '65%',
    backgroundColor: theme.colors.heroBannerOverlay,
  },
  categoryBadge: {
    position: 'absolute',
    top: theme.spacing.sm,
    left: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
  },
  categoryBadgeText: {
    color: theme.colors.onPrimary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  saveButton: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomText: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing.md,
    gap: 2,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 20,
  },
  cardAddress: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
  },
});
