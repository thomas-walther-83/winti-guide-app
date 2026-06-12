import React, { useState, useMemo, useRef, useEffect, createContext, useContext } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  FlatList,
  Dimensions,
  Animated,
  PanResponder,
  Pressable,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import type { AppTheme } from '../styles/theme';
import { useDetail } from '../context/DetailContext';

// Reicht den onScroll-Handler von der äußeren DetailModal-Shell an die
// inneren ScrollViews durch (Swipe-down-Geste erkennt damit, ob die
// Liste am Top steht, ohne props durch zwei Detail-Komponenten zu
// pipen).
const ScrollSyncContext = createContext<((e: NativeSyntheticEvent<NativeScrollEvent>) => void) | undefined>(undefined);
import { useTranslation } from '../hooks/useTranslation';
import { dateLocale } from '../utils/locale';
import { shareItem } from '../utils/share';
import { openDirections, openInGoogleMaps, listingMapsQuery } from '../utils/maps';
import { getListingVisual, getEventVisual } from '../config/categoryVisuals';
import { isLogoUrl } from '../utils/listingImage';
import { AddToTourSheet } from './AddToTourSheet';
import type { Listing, Event } from '../types';

function openUrl(raw?: string) {
  if (!raw) return;
  // Nur echte http(s)-URLs öffnen; alles andere (inkl. exotischer Schemes
  // aus gescrapten Daten) wird als Hostname interpretiert und mit https://
  // präfixiert.
  const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw.replace(/^[a-z+.-]+:\/*/i, '')}`;
  Linking.openURL(url).catch(() => undefined);
}

function formatDate(dateStr: string, locale: string): string {
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString(locale, {
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

/**
 * Wischbarer Bilder-Carousel im Hero-Bereich. Bei einem einzelnen Bild
 * verhält er sich wie ein normales Image (ohne Dots). Die Breite wird
 * über `onLayout` ermittelt, damit Web (responsive Modal-Breite) und
 * Native (volle Geräte-Breite) korrekt darstellen.
 */
function HeroCarousel({
  images,
  fallback,
}: {
  images: string[];
  /** Kategorie-Farbe/-Icon für Slides, deren Bild nicht lädt (403/404). */
  fallback: { bg: string; icon: keyof typeof Ionicons.glyphMap };
}) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<Set<number>>(new Set());

  // Bei nur einem Bild komplett auf ScrollView/FlatList verzichten — das
  // war der eigentliche Bug: die FlatList hing bei width=0 fest. Ein
  // einzelnes Bild braucht keine Carousel-Mechanik.
  if (images.length === 1) {
    const only = images[0];
    return (
      <View style={[styles.heroImage, { backgroundColor: fallback.bg }]}>
        {failed.has(0) ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={fallback.icon} size={72} color="rgba(255,255,255,0.92)" />
          </View>
        ) : (
          <Image
            source={{ uri: only }}
            style={{ width: '100%', height: '100%', transform: isLogoUrl(only) ? [{ scale: 0.6 }] : undefined }}
            resizeMode={isLogoUrl(only) ? 'contain' : 'cover'}
            onError={() => setFailed(new Set([0]))}
          />
        )}
      </View>
    );
  }

  // Mehrere Bilder → horizontal scrollender Carousel mit Snap pro Seite.
  // ScrollView (statt FlatList) braucht keine width-Berechnung im Voraus —
  // jede Slide bekommt einfach `flex: 1` Sheet-Breite per onLayout vom
  // Container. Auch bei width === 0 im ersten Render sind die Slides
  // sichtbar (mit Background), sobald der Layout-Pass durch ist.
  const [width, setWidth] = useState(() => Dimensions.get('window').width || 360);
  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width <= 0) return;
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  };
  const markFailed = (i: number) =>
    setFailed((prev) => {
      const next = new Set(prev);
      next.add(i);
      return next;
    });

  return (
    <View
      style={styles.heroImage}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0 && Math.abs(w - width) > 1) setWidth(w);
      }}
    >
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {images.map((item, i) => (
          <View key={`${i}-${item}`} style={{ width, height: '100%', backgroundColor: fallback.bg }}>
            {failed.has(i) ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={fallback.icon} size={72} color="rgba(255,255,255,0.92)" />
              </View>
            ) : (
              <Image
                source={{ uri: item }}
                style={{ width: '100%', height: '100%', transform: isLogoUrl(item) ? [{ scale: 0.6 }] : undefined }}
                resizeMode={isLogoUrl(item) ? 'contain' : 'cover'}
                onError={() => markFailed(i)}
              />
            )}
          </View>
        ))}
      </ScrollView>
      <View style={styles.carouselDots}>
        {images.map((_, i) => (
          <View key={i} style={[styles.carouselDot, i === index && styles.carouselDotActive]} />
        ))}
      </View>
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

  // Bildergalerie: bevorzugt das neue `image_urls`-Array; falls leer, fällt
  // auf das alte Einzel-`image_url` zurück.
  const galleryImages = useMemo(() => {
    if (listing.image_urls && listing.image_urls.length > 0) return listing.image_urls;
    return listing.image_url ? [listing.image_url] : [];
  }, [listing.image_urls, listing.image_url]);
  const tags = listing.tags ?? [];

  return (
    <>
      <View style={styles.hero}>
        {galleryImages.length === 0 ? (
          <View style={[styles.heroImage, styles.heroFallback, { backgroundColor: visual.bg }]}>
            <Ionicons name={visual.icon} size={72} color="rgba(255,255,255,0.92)" />
          </View>
        ) : (
          <HeroCarousel images={galleryImages} fallback={{ bg: visual.bg, icon: visual.icon }} />
        )}
        <LinearGradient
          colors={['transparent', 'rgba(15,11,8,0.15)', 'rgba(15,11,8,0.82)']}
          locations={[0, 0.45, 1]}
          style={styles.heroGradient}
          pointerEvents="none"
        />
        {listing.is_premium && (
          <View style={styles.premiumBadge}>
            <Ionicons name="star" size={12} color="#FFFFFF" />
            <Text style={styles.premiumBadgeText}>{t('premium')}</Text>
          </View>
        )}
        <Text style={styles.heroName} numberOfLines={3}>{listing.name}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} onScroll={useContext(ScrollSyncContext)} scrollEventThrottle={16}>
        <View style={styles.tagRow}>
          {listing.sub_type ? <Text style={styles.tag}>{listing.sub_type}</Text> : null}
          {listing.stars ? <Text style={styles.tag}>⭐ {listing.stars}</Text> : null}
          {tags.map((tg) => (
            <Text key={tg} style={[styles.tag, styles.tagAccent]}>{tg}</Text>
          ))}
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
              accessibilityLabel={t('a11y_call').replace('{name}', listing.name)}
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
              accessibilityLabel={t('a11y_open_website').replace('{name}', listing.name)}
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
              accessibilityLabel={t('a11y_show_on_map').replace('{name}', listing.name)}
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
              accessibilityLabel={t('a11y_route_to').replace('{name}', listing.name)}
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
              accessibilityLabel={t('a11y_open_gmaps').replace('{name}', listing.name)}
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
  const { t, language } = useTranslation();
  const locale = dateLocale(language);
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
      <ScrollView contentContainerStyle={styles.body} onScroll={useContext(ScrollSyncContext)} scrollEventThrottle={16}>
        <View style={styles.infoBlock}>
          <InfoRow icon="calendar-outline">{formatDate(event.event_date, locale)}</InfoRow>
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
              accessibilityLabel={t('a11y_more_about').replace('{name}', event.title)}
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
              accessibilityLabel={t('a11y_open_gmaps').replace('{name}', event.location ?? '')}
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

  // Swipe-down zum Schließen vom GANZEN Sheet aus — nicht nur dem Drag-Handle.
  // Damit der Drag nicht mit der Body-ScrollView kollidiert, nimmt das
  // PanResponder die Geste nur an, wenn die Liste oben steht (atTop) UND
  // klar nach unten gewischt wird. So scrollt der Body normal, sobald er
  // weg vom Top ist, und gibt erst beim Top wieder die Drag-Geste frei.
  const translateY = useRef(new Animated.Value(0)).current;
  const atTopRef = useRef(true);
  useEffect(() => {
    if (visible) {
      translateY.setValue(0);
      atTopRef.current = true;
    }
  }, [visible, translateY]);
  const dismiss = () => {
    Animated.timing(translateY, { toValue: 700, duration: 180, useNativeDriver: true }).start(() => {
      translateY.setValue(0);
      close();
    });
  };
  const pan = useRef(
    PanResponder.create({
      // Tap (kein Move) NIE als Geste beanspruchen → Buttons im Body bleiben klickbar.
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_e, g) =>
        atTopRef.current && g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_e, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_e, g) => {
        if (g.dy > 90 || g.vy > 0.7) dismiss();
        else Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
      },
    }),
  ).current;
  const handleBodyScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    atTopRef.current = e.nativeEvent.contentOffset.y <= 2;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={styles.backdrop}>
        {/* Tap auf den freien Bereich über dem Sheet schließt ebenfalls. */}
        <Pressable style={styles.backdropTouch} onPress={close} accessibilityRole="button" accessibilityLabel={t('close_detail')} />
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY }] }]}
          {...pan.panHandlers}
        >
          <View style={styles.dragZone} pointerEvents="none">
            <View style={styles.dragHandle} />
          </View>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShare}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel={t('share')}
          >
            <Ionicons name="share-outline" size={20} color="#1C1A17" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={close}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel={t('close_detail')}
          >
            <Ionicons name="close" size={22} color="#1C1A17" />
          </TouchableOpacity>

          <ScrollSyncContext.Provider value={handleBodyScroll}>
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
          </ScrollSyncContext.Provider>
        </Animated.View>
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
  backdropTouch: {
    // Füllt den freien Bereich über dem Sheet (Tap = schließen).
    flex: 1,
  },
  dragZone: {
    // Greifzone für Swipe-down — großzügige 44px Höhe; seitlich ausgespart,
    // damit Share-/Close-Buttons (oben rechts) klickbar bleiben.
    position: 'absolute',
    top: 0,
    left: 104,
    right: 104,
    height: 44,
    zIndex: 11,
    alignItems: 'center',
    paddingTop: 8,
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.85)',
    ...theme.shadow.small,
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: '90%',
    overflow: 'hidden',
    // Desktop-Browser: Sheet nicht über die volle Fensterbreite strecken.
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
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
    backgroundColor: theme.colors.surfaceAlt,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    overflow: 'hidden',
  },
  tagAccent: {
    color: theme.colors.onPrimary,
    backgroundColor: theme.colors.primary,
    fontWeight: '600',
  },
  carouselDots: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  carouselDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  carouselDotActive: {
    backgroundColor: '#fff',
    width: 18,
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
    color: theme.colors.onPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  actionGhost: {
    backgroundColor: theme.colors.surfaceAlt,
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
