import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { theme } from '../styles/theme';
import type { PartnerAd } from '../types';
import { trackAdImpression } from '../services/supabaseService';

interface PartnerAdBannerProps {
  ad: PartnerAd;
}

export function PartnerAdBanner({ ad }: PartnerAdBannerProps) {
  useEffect(() => {
    // Fire-and-forget impression tracking
    trackAdImpression(ad.id).catch(console.error);
  }, [ad.id]);

  const handlePress = () => {
    if (ad.cta_url) {
      const url = ad.cta_url.startsWith('http') ? ad.cta_url : `https://${ad.cta_url}`;
      Linking.openURL(url).catch(console.error);
    }
  };

  return (
    <View style={[styles.wrapper, ad.position === 'featured' && styles.wrapperFeatured]}>
      <View style={styles.sponsoredRow}>
        <Text style={styles.sponsoredLabel}>Anzeige</Text>
      </View>
      <View style={styles.card}>
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={2}>
            {ad.title}
          </Text>
          {ad.subtitle ? (
            <Text style={styles.subtitle} numberOfLines={2}>
              {ad.subtitle}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity style={styles.cta} onPress={handlePress} activeOpacity={0.8}>
          <Text style={styles.ctaText}>{ad.cta_label ?? 'Mehr erfahren'} →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.xs,
  },
  wrapperFeatured: {
    marginVertical: theme.spacing.sm,
  },
  sponsoredRow: {
    alignItems: 'flex-end',
    marginBottom: 2,
  },
  sponsoredLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#FFFBF0',
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.premium,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    ...theme.shadow.small,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
  cta: {
    backgroundColor: theme.colors.premium,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    alignSelf: 'center',
    flexShrink: 0,
  },
  ctaText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.surface,
  },
});
