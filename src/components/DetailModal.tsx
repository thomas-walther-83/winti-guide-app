import React from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { useDetail } from '../context/DetailContext';
import type { Listing, Event } from '../types';

const LISTING_EMOJI: Record<string, string> = {
  restaurants: '🍽️', cafes: '☕', bars: '🍸', hotels: '🏨', sightseeing: '🏛️',
  kultur: '🎨', geschaefte: '🛍️', sport: '🏊', touren: '🗺️',
};
const LISTING_BG: Record<string, string> = {
  restaurants: '#C0392B', cafes: '#8B6914', bars: '#6C3483', hotels: '#1A5276',
  sightseeing: '#1E8449', kultur: '#C0392B', geschaefte: '#A04000', sport: '#117A65',
  touren: '#2E4057',
};
const EVENT_EMOJI: Record<string, string> = {
  festival: '🎪', musik: '🎵', kultur: '🎨', markt: '🛍️', theater: '🎭',
  tour: '🗺️', kulinarik: '🍷', sport: '🏅',
};

function openUrl(raw?: string) {
  if (!raw) return;
  const url = raw.startsWith('http') ? raw : `https://${raw}`;
  Linking.openURL(url).catch(() => undefined);
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('de-CH', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function InfoRow({ icon, children }: { icon: keyof typeof Ionicons.glyphMap; children: React.ReactNode }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={theme.colors.textSecondary} style={styles.infoIcon} />
      <Text style={styles.infoText}>{children}</Text>
    </View>
  );
}

function ListingDetail({
  listing, isSaved, onToggleSave, onShowOnMap, onClose,
}: {
  listing: Listing;
  isSaved?: boolean;
  onToggleSave?: (l: Listing) => void;
  onShowOnMap?: (l: Listing) => void;
  onClose: () => void;
}) {
  const emoji = LISTING_EMOJI[listing.category] ?? '📍';
  const bg = LISTING_BG[listing.category] ?? theme.colors.primary;
  return (
    <>
      <View style={[styles.hero, { backgroundColor: bg }]}>
        <Text style={styles.heroEmoji}>{emoji}</Text>
        {listing.is_premium && (
          <View style={styles.premiumBadge}>
            <Ionicons name="star" size={12} color="#FFFFFF" />
            <Text style={styles.premiumBadgeText}>Premium</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.name}>{listing.name}</Text>
        <View style={styles.tagRow}>
          {listing.sub_type ? <Text style={styles.tag}>{listing.sub_type}</Text> : null}
          {listing.stars ? <Text style={styles.tag}>⭐ {listing.stars}</Text> : null}
        </View>

        {listing.description ? <Text style={styles.description}>{listing.description}</Text> : null}

        <View style={styles.infoBlock}>
          {listing.address ? <InfoRow icon="location-outline">{listing.address}</InfoRow> : null}
          {listing.hours ? <InfoRow icon="time-outline">{listing.hours}</InfoRow> : null}
          {listing.phone ? <InfoRow icon="call-outline">{listing.phone}</InfoRow> : null}
          {listing.website ? <InfoRow icon="globe-outline">{listing.website}</InfoRow> : null}
        </View>

        <View style={styles.actions}>
          {listing.phone && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionGhost]}
              onPress={() => openUrl(`tel:${listing.phone}`)}
              accessibilityRole="button"
              accessibilityLabel={`${listing.name} anrufen`}
            >
              <Ionicons name="call-outline" size={16} color={theme.colors.text} />
              <Text style={styles.actionGhostText}>Anrufen</Text>
            </TouchableOpacity>
          )}
          {listing.website && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionPrimary]}
              onPress={() => openUrl(listing.website)}
              accessibilityRole="button"
              accessibilityLabel={`Website von ${listing.name} öffnen`}
            >
              <Ionicons name="globe-outline" size={16} color="#FFFFFF" />
              <Text style={styles.actionPrimaryText}>Website</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.actions}>
          {onShowOnMap && listing.lat != null && listing.lon != null && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionOutline]}
              onPress={() => { onShowOnMap(listing); onClose(); }}
              accessibilityRole="button"
              accessibilityLabel={`${listing.name} auf Karte zeigen`}
            >
              <Ionicons name="map-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.actionOutlineText}>Auf Karte zeigen</Text>
            </TouchableOpacity>
          )}
          {onToggleSave && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionOutline]}
              onPress={() => onToggleSave(listing)}
              accessibilityRole="button"
              accessibilityLabel={isSaved ? `${listing.name} aus Gespeicherten entfernen` : `${listing.name} speichern`}
            >
              <Ionicons name={isSaved ? 'heart' : 'heart-outline'} size={16} color={theme.colors.primary} />
              <Text style={styles.actionOutlineText}>{isSaved ? 'Gespeichert' : 'Speichern'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </>
  );
}

function EventDetail({ event }: { event: Event }) {
  const emoji = EVENT_EMOJI[event.cat] ?? '📅';
  const isFree = event.price && ['kostenlos', 'free', '0'].includes(event.price.toLowerCase());
  return (
    <>
      <View style={[styles.hero, { backgroundColor: theme.colors.primary }]}>
        <Text style={styles.heroEmoji}>{emoji}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.name}>{event.title}</Text>

        <View style={styles.infoBlock}>
          <InfoRow icon="calendar-outline">{formatDate(event.event_date)}</InfoRow>
          {event.event_time ? <InfoRow icon="time-outline">{event.event_time}</InfoRow> : null}
          {event.location ? <InfoRow icon="location-outline">{event.location}</InfoRow> : null}
          <InfoRow icon="pricetag-outline">{isFree ? 'Kostenlos' : event.price || 'Preis auf Anfrage'}</InfoRow>
        </View>

        {event.description ? <Text style={styles.description}>{event.description}</Text> : null}

        {event.url ? (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionPrimary]}
              onPress={() => openUrl(event.url)}
              accessibilityRole="button"
              accessibilityLabel={`Mehr über ${event.title} erfahren`}
            >
              <Text style={styles.actionPrimaryText}>Mehr erfahren</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </>
  );
}

export function DetailModal() {
  const { payload, close } = useDetail();
  const visible = payload !== null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={close}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Detail schliessen"
          >
            <Ionicons name="close" size={22} color={theme.colors.text} />
          </TouchableOpacity>

          {payload?.kind === 'listing' && (
            <ListingDetail
              listing={payload.listing}
              isSaved={payload.isSaved}
              onToggleSave={payload.onToggleSave}
              onShowOnMap={payload.onShowOnMap}
              onClose={close}
            />
          )}
          {payload?.kind === 'event' && <EventDetail event={payload.event} />}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEmoji: {
    fontSize: 56,
  },
  premiumBadge: {
    position: 'absolute',
    bottom: theme.spacing.sm,
    left: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  premiumBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  body: {
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  tag: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    overflow: 'hidden',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  infoBlock: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  infoIcon: {
    marginTop: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    minHeight: 44,
    flex: 1,
  },
  actionPrimary: {
    backgroundColor: theme.colors.primary,
  },
  actionPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  actionGhost: {
    backgroundColor: theme.colors.surface,
  },
  actionGhostText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  actionOutline: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  actionOutlineText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
