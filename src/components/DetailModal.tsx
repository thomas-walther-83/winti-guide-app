import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import type { AppTheme } from '../styles/theme';
import { useDetail } from '../context/DetailContext';
import { useTranslation } from '../hooks/useTranslation';
import { shareItem } from '../utils/share';
import { openDirections, openInGoogleMaps, listingMapsQuery } from '../utils/maps';
import { getListingVisual, getEventVisual } from '../config/categoryVisuals';
import { AddToTourSheet } from './AddToTourSheet';
import type { Listing, Event } from '../types';

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
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
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
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const visual = getListingVisual(listing.category);
  const { t } = useTranslation();
  const [addToTourOpen, setAddToTourOpen] = useState(false);
  return (
    <>
      <View style={styles.hero}>
        {listing.image_url ? (
          <Image source={{ uri: listing.image_url }} style={styles.heroImage} resizeMode="cover" />
        ) : (
          <View style={[styles.heroImage, styles.heroFallback, { backgroundColor: visual.bg }]}>
            <Ionicons name={visual.icon} size={72} color="rgba(255,255,255,0.92)" />
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(15,11,8,0.15)', 'rgba(15,11,8,0.82)']}
          locations={[0, 0.45, 1]}
          style={styles.heroGradient}
        />
        {listing.is_premium && (
          <View style={styles.premiumBadge}>
            <Ionicons name="star" size={12} color="#FFFFFF" />
            <Text style={styles.premiumBadgeText}>{t('premium')}</Text>
          </View>
        )}
        <Text style={styles.heroName} numberOfLines={3}>{listing.name}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
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
              <Text style={styles.actionGhostText}>{t('call')}</Text>
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
              <Text style={styles.actionPrimaryText}>{t('website')}</Text>
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
              <Text style={styles.actionOutlineText}>{t('show_on_map')}</Text>
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
              <Text style={styles.actionOutlineText}>{isSaved ? t('saved_label') : t('save')}</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.actionBtn, styles.actionOutline, styles.addTourBtn]}
          onPress={() => setAddToTourOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t('add_to_tour')}
        >
          <Ionicons name="trail-sign-outline" size={16} color={theme.colors.primary} />
          <Text style={styles.actionOutlineText}>{t('add_to_tour')}</Text>
        </TouchableOpacity>

        {/* Navigation: Route + Google Maps (wenn Koordinaten oder Adresse vorhanden) */}
        {((listing.lat != null && listing.lon != null) || listing.address) && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionPrimary]}
              onPress={() =>
                openDirections(listing.lat, listing.lon, `${listing.name} ${listing.address ?? ''}`.trim())
              }
              accessibilityRole="button"
              accessibilityLabel={`Route zu ${listing.name}`}
            >
              <Ionicons name="navigate" size={16} color="#FFFFFF" />
              <Text style={styles.actionPrimaryText}>{t('route')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionGhost]}
              onPress={() =>
                openInGoogleMaps(null, null, listingMapsQuery(listing.name, listing.address))
              }
              accessibilityRole="button"
              accessibilityLabel={`${listing.name} in Google Maps öffnen`}
            >
              <Ionicons name="map" size={16} color={theme.colors.text} />
              <Text style={styles.actionGhostText}>{t('open_in_maps')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      <AddToTourSheet
        listing={listing}
        visible={addToTourOpen}
        onClose={() => setAddToTourOpen(false)}
      />
    </>
  );
}

function EventDetail({ event }: { event: Event }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const visual = getEventVisual(event.cat);
  const isFree = event.price && ['kostenlos', 'free', '0'].includes(event.price.toLowerCase());
  const { t } = useTranslation();
  return (
    <>
      <View style={styles.hero}>
        {event.image_url ? (
          <Image source={{ uri: event.image_url }} style={styles.heroImage} resizeMode="cover" />
        ) : (
          <View style={[styles.heroImage, styles.heroFallback, { backgroundColor: visual.bg }]}>
            <Ionicons name={visual.icon} size={72} color="rgba(255,255,255,0.92)" />
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(15,11,8,0.15)', 'rgba(15,11,8,0.82)']}
          locations={[0, 0.45, 1]}
          style={styles.heroGradient}
        />
        <Text style={styles.heroName} numberOfLines={3}>{event.title}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.infoBlock}>
          <InfoRow icon="calendar-outline">{formatDate(event.event_date)}</InfoRow>
          {event.event_time ? <InfoRow icon="time-outline">{event.event_time}</InfoRow> : null}
          {event.location ? <InfoRow icon="location-outline">{event.location}</InfoRow> : null}
          <InfoRow icon="pricetag-outline">{isFree ? t('free') : event.price || t('price_on_request')}</InfoRow>
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
              <Text style={styles.actionPrimaryText}>{t('more_info')}</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Ort in Google Maps öffnen (Events haben nur einen Orts-Text) */}
        {event.location ? (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionGhost]}
              onPress={() => openInGoogleMaps(null, null, `${event.location} Winterthur`)}
              accessibilityRole="button"
              accessibilityLabel={`${event.location} in Google Maps öffnen`}
            >
              <Ionicons name="map" size={16} color={theme.colors.text} />
              <Text style={styles.actionGhostText}>{t('open_in_maps')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </>
  );
}

export function DetailModal() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { payload, close } = useDetail();
  const { t } = useTranslation();
  const visible = payload !== null;

  const handleShare = () => {
    if (!payload) return;
    if (payload.kind === 'listing') {
      shareItem(payload.listing.name, payload.listing.website || undefined);
    } else {
      shareItem(payload.event.title, payload.event.url || undefined);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShare}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel={t('share')}
          >
            <Ionicons name="share-outline" size={20} color={theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={close}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel={t('close_detail')}
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

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.surface,
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
  shareButton: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md + 44,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    height: 210,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.surfaceAlt,
  },
  heroFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroName: {
    fontFamily: theme.fonts.displayBold,
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    letterSpacing: -0.3,
  },
  premiumBadge: {
    position: 'absolute',
    top: theme.spacing.md,
    left: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.premium,
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
    fontFamily: theme.fonts.displayBold,
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
  addTourBtn: {
    flex: 0,
    marginTop: theme.spacing.sm,
  },
});
