import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { HeroCard } from './HeroCard';
import { theme } from '../styles/theme';
import type { Listing } from '../types';

interface FeaturedRowProps {
  listings: Listing[];
  savedIds: string[];
  onToggleSave: (listing: Listing) => void;
}

const CARD_WIDTH = 240;
const CARD_HEIGHT = 160;

export function FeaturedRow({ listings, savedIds, onToggleSave }: FeaturedRowProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={CARD_WIDTH + theme.spacing.sm}
      decelerationRate="fast"
      contentContainerStyle={styles.scrollContent}
      style={styles.scroll}
    >
      {listings.map((item) => (
        <HeroCard
          key={item.id}
          listing={item}
          isSaved={savedIds.includes(item.id)}
          onToggleSave={onToggleSave}
          width={CARD_WIDTH}
          height={CARD_HEIGHT}
          style={styles.card}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    gap: theme.spacing.sm,
  },
  card: {
    marginRight: 0,
  },
});
