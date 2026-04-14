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
import { ListingCard } from '../components/ListingCard';
import { theme } from '../styles/theme';
import type { Listing } from '../types';

const SAVED_KEY = 'winti_saved_listings';

export function SavedScreen() {
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [savedListings, setSavedListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

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
          <Text style={styles.count}>{savedListings.length} Einträge</Text>
        )}
      </View>

      {savedListings.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🤍</Text>
          <Text style={styles.emptyTitle}>Noch nichts gespeichert</Text>
          <Text style={styles.emptyHint}>
            Tippe auf das Herz-Symbol bei einem Eintrag, um ihn zu speichern.
          </Text>
          <TouchableOpacity style={styles.tip}>
            <Text style={styles.tipText}>
              💡 Gespeicherte Einträge sind auch offline verfügbar
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={savedListings}
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
});
