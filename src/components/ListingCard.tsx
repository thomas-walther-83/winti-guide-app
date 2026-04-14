import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

interface ListingCardProps {
  listing: Listing;
  isSaved: boolean;
  onToggleSave: (listing: Listing) => void;
}

export function ListingCard({ listing, isSaved, onToggleSave }: ListingCardProps) {
  const emoji = CATEGORY_EMOJI[listing.category] ?? '📍';
  const bgColor = CATEGORY_BG[listing.category] ?? theme.colors.primary;

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
    <View style={styles.card}>
      {/* Left: colored emoji block */}
      <View style={[styles.iconBlock, { backgroundColor: bgColor }]}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>

      {/* Right: content */}
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>
            {listing.name}
          </Text>
          {listing.is_premium && (
            <View style={styles.premiumDot} />
          )}
        </View>

        {listing.sub_type ? (
          <Text style={styles.subType} numberOfLines={1}>
            {listing.sub_type}
          </Text>
        ) : null}

        {listing.address ? (
          <Text style={styles.address} numberOfLines={1}>
            {listing.address}
          </Text>
        ) : null}

        {listing.hours ? (
          <Text style={styles.hours} numberOfLines={1}>
            {listing.hours}
          </Text>
        ) : null}

        {(listing.website || listing.phone) && (
          <View style={styles.actions}>
            {listing.phone && (
              <TouchableOpacity style={styles.actionBtn} onPress={handlePhone}>
                <Ionicons name="call-outline" size={13} color={theme.colors.text} />
                <Text style={styles.actionText}>Anrufen</Text>
              </TouchableOpacity>
            )}
            {listing.website && (
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={handleWebsite}>
                <Ionicons name="globe-outline" size={13} color={theme.colors.surface} />
                <Text style={styles.actionTextPrimary}>Website</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Save button */}
      <TouchableOpacity
        style={styles.saveButton}
        onPress={() => onToggleSave(listing)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons
          name={isSaved ? 'heart' : 'heart-outline'}
          size={20}
          color={isSaved ? theme.colors.primary : theme.colors.textMuted}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.background,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    ...theme.shadow.small,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  iconBlock: {
    width: 52,
    height: 52,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
    flexShrink: 0,
  },
  emoji: {
    fontSize: 24,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    flex: 1,
  },
  premiumDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    flexShrink: 0,
  },
  subType: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  address: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  hours: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  saveButton: {
    padding: theme.spacing.xs,
    marginLeft: theme.spacing.xs,
    flexShrink: 0,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionBtnPrimary: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.text,
  },
  actionTextPrimary: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});
