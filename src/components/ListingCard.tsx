import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { theme } from '../styles/theme';
import type { Listing } from '../types';

const CATEGORY_EMOJI: Record<string, string> = {
  restaurants: '🍽️',
  cafes: '☕',
  bars: '🍸',
  hotels: '🏨',
  sightseeing: '🏛️',
  kultur: '🎨',
  geschaefte: '🛍️',
  sport: '🏊',
  touren: '🗺️',
};

interface ListingCardProps {
  listing: Listing;
  isSaved: boolean;
  onToggleSave: (listing: Listing) => void;
}

export function ListingCard({ listing, isSaved, onToggleSave }: ListingCardProps) {
  const emoji = CATEGORY_EMOJI[listing.category] ?? '📍';

  const handleWebsite = () => {
    if (listing.website) {
      const url = listing.website.startsWith('http')
        ? listing.website
        : `https://${listing.website}`;
      Linking.openURL(url).catch(console.error);
    }
  };

  const handlePhone = () => {
    if (listing.phone) {
      Linking.openURL(`tel:${listing.phone}`).catch(console.error);
    }
  };

  return (
    <View style={[styles.card, listing.is_premium && styles.cardPremium]}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Text style={styles.emoji}>{emoji}</Text>
        </View>
        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={1}>
              {listing.name}
            </Text>
            {listing.is_premium && (
              <View style={styles.premiumBadge}>
                <Text style={styles.premiumText}>⭐</Text>
              </View>
            )}
          </View>
          {listing.sub_type ? (
            <Text style={styles.subType} numberOfLines={1}>
              {listing.sub_type}
            </Text>
          ) : null}
          {listing.address ? (
            <Text style={styles.address} numberOfLines={1}>
              📍 {listing.address}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={() => onToggleSave(listing)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.saveIcon}>{isSaved ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
      </View>

      {listing.hours ? (
        <Text style={styles.detail}>🕐 {listing.hours}</Text>
      ) : null}

      {listing.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {listing.description}
        </Text>
      ) : null}

      {(listing.website || listing.phone) && (
        <View style={styles.actions}>
          {listing.phone && (
            <TouchableOpacity style={styles.actionBtn} onPress={handlePhone}>
              <Text style={styles.actionText}>📞 Anrufen</Text>
            </TouchableOpacity>
          )}
          {listing.website && (
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={handleWebsite}>
              <Text style={styles.actionTextPrimary}>🌐 Website</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.sm,
    ...theme.shadow.medium,
  },
  cardPremium: {
    borderWidth: 1.5,
    borderColor: theme.colors.premium,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  emoji: {
    fontSize: 22,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    flex: 1,
  },
  premiumBadge: {
    backgroundColor: theme.colors.premium,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  premiumText: {
    fontSize: 10,
  },
  subType: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  address: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  saveButton: {
    padding: theme.spacing.xs,
    marginLeft: theme.spacing.xs,
  },
  saveIcon: {
    fontSize: 20,
  },
  detail: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  description: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  actionBtnPrimary: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.text,
  },
  actionTextPrimary: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.surface,
  },
});
