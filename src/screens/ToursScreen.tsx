import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useAppTier } from '../hooks/useAppTier';
import { useTranslation } from '../hooks/useTranslation';
import { useDetail } from '../context/DetailContext';
import { useTheme } from '../context/ThemeContext';
import type { AppTheme } from '../styles/theme';
import { getErrorMessage } from '../utils/errors';
import { FREE_MAX_TOURS } from '../config/tourLimits';
import {
  fetchUserTours,
  createTour,
  renameTour,
  deleteTour,
  fetchTourStops,
  removeStop,
  reorderStops,
} from '../services/toursService';
import { distanceKm } from '../utils/distance';
import { CURATED_TOURS } from '../config/curatedTours';
import { fetchPublicTours } from '../services/publicToursService';
import type { UserTour, TourStop, Listing, PublicTour } from '../types';
import type { MapTour } from './MapScreen';

// Statische Touren in das DB-Schema mappen, damit der Fallback dieselben
// Felder hat wie die Live-Daten (Konsumenten merken keinen Unterschied).
const STATIC_FALLBACK: PublicTour[] = CURATED_TOURS.map((ct, idx) => ({
  id: `static_${ct.id}`,
  slug: ct.id,
  name: ct.name,
  description: ct.description,
  emoji: ct.emoji,
  sort_order: (idx + 1) * 10,
  published: true,
  stops: ct.stops.map((s, i) => ({ position: i + 1, lat: s.lat, lon: s.lon, name: s.name })),
}));

interface Props {
  onNavigateToAccount?: () => void;
  onNavigateToMap?: (listing: Listing) => void;
  onShowTour?: (tour: MapTour) => void;
}

export function ToursScreen({ onNavigateToAccount, onShowTour }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { user } = useAuth();
  const { isPremium } = useAppTier();
  const { t } = useTranslation();
  const { open } = useDetail();

  const [tours, setTours] = useState<UserTour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openTour, setOpenTour] = useState<UserTour | null>(null);
  const [publicTours, setPublicTours] = useState<PublicTour[]>(STATIC_FALLBACK);

  // Öffentliche (redaktionelle) Touren aus der DB laden; bei Fehler
  // bleibt die statische Fallback-Liste (z. B. offline, vor Migration).
  useEffect(() => {
    fetchPublicTours()
      .then((rows) => {
        if (rows.length > 0) setPublicTours(rows);
      })
      .catch(() => {
        // still STATIC_FALLBACK
      });
  }, []);

  // Namens-Eingabe (neu/umbenennen)
  const [prompt, setPrompt] = useState<{ mode: 'create' | 'rename'; value: string } | null>(null);

  const loadTours = useCallback(async () => {
    if (!user) {
      setTours([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setTours(await fetchUserTours());
    } catch (err) {
      setError(getErrorMessage(err, t('error_loading')));
    } finally {
      setLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    loadTours();
  }, [loadTours]);

  const atTourLimit = !isPremium && tours.length >= FREE_MAX_TOURS;

  const submitPrompt = async () => {
    const name = (prompt?.value ?? '').trim() || t('tours_default_name');
    try {
      if (prompt?.mode === 'create' && user) {
        const created = await createTour(user.id, name);
        setTours((prev) => [created, ...prev]);
      } else if (prompt?.mode === 'rename' && openTour) {
        await renameTour(openTour.id, name);
        setOpenTour({ ...openTour, name });
        setTours((prev) => prev.map((x) => (x.id === openTour.id ? { ...x, name } : x)));
      }
    } catch (err) {
      Alert.alert(t('error'), getErrorMessage(err, t('error_loading')));
    }
    setPrompt(null);
  };

  const handleDeleteTour = (tour: UserTour) => {
    Alert.alert(t('tours_delete_title'), tour.name, [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTour(tour.id);
            setTours((prev) => prev.filter((x) => x.id !== tour.id));
            if (openTour?.id === tour.id) setOpenTour(null);
          } catch (err) {
            Alert.alert(t('error'), getErrorMessage(err, t('error_loading')));
          }
        },
      },
    ]);
  };

  const renderCurated = () => (
    <View>
      <Text style={styles.sectionTitle}>{t('tours_curated')}</Text>
      {publicTours.map((ct) => (
        <TouchableOpacity
          key={ct.id}
          style={styles.curatedCard}
          activeOpacity={0.85}
          onPress={() =>
            onShowTour?.({ id: `curated_${ct.slug}`, name: ct.name, stops: ct.stops.map((s) => ({ lat: s.lat, lon: s.lon, name: s.name })), savedWaypoints: null })
          }
        >
          <Text style={styles.curatedEmoji}>{ct.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.curatedName} numberOfLines={1}>{ct.name}</Text>
            <Text style={styles.curatedDesc} numberOfLines={2}>{ct.description}</Text>
            <Text style={styles.curatedMeta}>{ct.stops.length} {t('tours_stops_label')}</Text>
          </View>
          <Ionicons name="map" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      ))}
    </View>
  );

  // ── Nicht eingeloggt ───────────────────────────────────────────────
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('tours_title')}</Text>
          <Text style={styles.subtitle}>{t('tours_subtitle')}</Text>
        </View>
        <ScrollView contentContainerStyle={styles.scroll}>
          {renderCurated()}
          <Text style={styles.sectionTitle}>{t('tours_my')}</Text>
          <View style={styles.loginCard}>
            <Ionicons name="trail-sign-outline" size={40} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>{t('tours_login_title')}</Text>
            <Text style={styles.emptyHint}>{t('tours_login_hint')}</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={onNavigateToAccount}>
              <Text style={styles.primaryBtnText}>{t('to_login')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Tour-Detail (Stops verwalten) ──────────────────────────────────
  if (openTour) {
    return (
      <TourDetail
        tour={openTour}
        isPremium={isPremium}
        onBack={() => {
          setOpenTour(null);
          loadTours();
        }}
        onRename={() => setPrompt({ mode: 'rename', value: openTour.name })}
        onDelete={() => handleDeleteTour(openTour)}
        onOpenListing={(l) => open({ kind: 'listing', listing: l })}
        onShowTour={onShowTour}
        promptNode={renderPrompt()}
      />
    );
  }

  // ── Touren-Übersicht ───────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('tours_title')}</Text>
        <Text style={styles.subtitle}>{t('tours_subtitle')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {renderCurated()}

        <Text style={styles.sectionTitle}>{t('tours_my')}</Text>

        {!isPremium && (
          <TouchableOpacity style={styles.limitBanner} onPress={onNavigateToAccount} activeOpacity={0.8}>
            <Ionicons name="star" size={14} color={theme.colors.primary} />
            <Text style={styles.limitText}>
              {t('tours_free_limit').replace('{n}', String(FREE_MAX_TOURS))}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.createBtn, atTourLimit && styles.createBtnDisabled]}
          onPress={() => (atTourLimit ? onNavigateToAccount?.() : setPrompt({ mode: 'create', value: '' }))}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.createBtnText}>
            {atTourLimit ? t('tours_upgrade_for_more') : t('tours_new')}
          </Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: theme.spacing.lg }} />
        ) : error ? (
          <Text style={styles.errorText}>⚠️ {error}</Text>
        ) : tours.length === 0 ? (
          <View style={styles.emptyInline}>
            <Text style={styles.emptyEmoji}>🧭</Text>
            <Text style={styles.emptyTitle}>{t('tours_empty_title')}</Text>
            <Text style={styles.emptyHint}>{t('tours_empty_hint')}</Text>
          </View>
        ) : (
          tours.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.tourRow}
              onPress={() => setOpenTour(item)}
              activeOpacity={0.7}
            >
              <View style={styles.tourIcon}>
                <Ionicons name="trail-sign" size={20} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tourName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.tourMeta}>
                  {(item.stopCount ?? 0)} {t('tours_stops_label')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleDeleteTour(item)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash-outline" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {renderPrompt()}
    </SafeAreaView>
  );

  function renderPrompt() {
    return (
      <Modal visible={prompt != null} transparent animationType="fade" onRequestClose={() => setPrompt(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {prompt?.mode === 'rename' ? t('tours_rename') : t('tours_new')}
            </Text>
            <TextInput
              style={styles.input}
              value={prompt?.value ?? ''}
              onChangeText={(v) => setPrompt((p) => (p ? { ...p, value: v } : p))}
              placeholder={t('tours_default_name')}
              placeholderTextColor={theme.colors.textMuted}
              autoFocus
              maxLength={60}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnGhost} onPress={() => setPrompt(null)}>
                <Text style={styles.modalBtnGhostText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnPrimary} onPress={submitPrompt}>
                <Text style={styles.modalBtnPrimaryText}>{t('save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }
}

// ── Tour-Detailansicht (Stops) ───────────────────────────────────────────────
function TourDetail({
  tour,
  isPremium,
  onBack,
  onRename,
  onDelete,
  onOpenListing,
  onShowTour,
  promptNode,
}: {
  tour: UserTour;
  isPremium: boolean;
  onBack: () => void;
  onRename: () => void;
  onDelete: () => void;
  onOpenListing: (l: Listing) => void;
  onShowTour?: (tour: MapTour) => void;
  promptNode: React.ReactNode;
}) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t } = useTranslation();
  const [stops, setStops] = useState<TourStop[]>([]);
  const [loading, setLoading] = useState(true);
  // Gespeicherte (gezogene) Route; wird verworfen, sobald sich die Stops ändern.
  const [savedWaypoints, setSavedWaypoints] = useState(tour.route_waypoints ?? null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setStops(await fetchTourStops(tour.id));
    } finally {
      setLoading(false);
    }
  }, [tour.id]);

  useEffect(() => {
    load();
  }, [load]);

  const move = async (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= stops.length) return;
    const reordered = [...stops];
    [reordered[index], reordered[next]] = [reordered[next], reordered[index]];
    setStops(reordered);
    setSavedWaypoints(null);
    await reorderStops(tour.id, reordered.map((s) => s.id));
  };

  const remove = async (stop: TourStop) => {
    setStops((prev) => prev.filter((s) => s.id !== stop.id));
    setSavedWaypoints(null);
    await removeStop(stop.id);
  };

  // Reihenfolge optimieren: kürzester Fußweg (Luftlinie) ab dem ersten Stop –
  // Nearest-Neighbor + 2-opt. Stops ohne Koordinaten bleiben am Ende.
  const hasCoord = (s: TourStop) => s.listing?.lat != null && s.listing?.lon != null;
  const canOptimize = stops.filter(hasCoord).length >= 3;
  const optimize = async () => {
    const pt = (s: TourStop) => ({ lat: s.listing!.lat as number, lon: s.listing!.lon as number });
    const withCoords = stops.filter(hasCoord);
    const without = stops.filter((s) => !hasCoord(s));
    if (withCoords.length < 3) return;

    // Nearest-Neighbor ab erstem Stop.
    const remaining = [...withCoords];
    const ordered: TourStop[] = [remaining.shift()!];
    while (remaining.length) {
      const last = pt(ordered[ordered.length - 1]);
      let bi = 0;
      let bd = Infinity;
      remaining.forEach((s, i) => {
        const d = distanceKm(last, pt(s));
        if (d < bd) { bd = d; bi = i; }
      });
      ordered.push(remaining.splice(bi, 1)[0]);
    }

    // 2-opt (erster Stop bleibt Start).
    const dist = (a: TourStop, b: TourStop) => distanceKm(pt(a), pt(b));
    let improved = true;
    while (improved) {
      improved = false;
      for (let i = 1; i < ordered.length - 1; i++) {
        for (let k = i + 1; k < ordered.length; k++) {
          const a = ordered[i - 1];
          const b = ordered[i];
          const c = ordered[k];
          const d = ordered[k + 1];
          const before = dist(a, b) + (d ? dist(c, d) : 0);
          const after = dist(a, c) + (d ? dist(b, d) : 0);
          if (after + 1e-9 < before) {
            const seg = ordered.slice(i, k + 1).reverse();
            ordered.splice(i, seg.length, ...seg);
            improved = true;
          }
        }
      }
    }

    const finalOrder = [...ordered, ...without];
    setStops(finalOrder);
    setSavedWaypoints(null);
    await reorderStops(tour.id, finalOrder.map((s) => s.id));
  };

  const mapStops = stops
    .filter((s) => s.listing?.lat != null && s.listing?.lon != null)
    .map((s) => ({
      lat: s.listing!.lat as number,
      lon: s.listing!.lon as number,
      name: s.listing!.name,
    }));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.detailHeader}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={26} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.detailTitle} numberOfLines={1}>{tour.name}</Text>
        <TouchableOpacity onPress={onRename} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="create-outline" size={22} color={theme.colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="trash-outline" size={20} color={theme.colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.detailActions}>
        {mapStops.length >= 2 && onShowTour && (
          <TouchableOpacity
            style={[styles.createBtn, styles.detailActionFlex]}
            onPress={() => onShowTour({ id: tour.id, name: tour.name, stops: mapStops, savedWaypoints })}
            activeOpacity={0.85}
          >
            <Ionicons name="map" size={18} color="#FFFFFF" />
            <Text style={styles.createBtnText}>{t('show_on_map')}</Text>
          </TouchableOpacity>
        )}
        {canOptimize && (
          <TouchableOpacity
            style={[styles.optimizeBtn, styles.detailActionFlex]}
            onPress={optimize}
            activeOpacity={0.85}
          >
            <Ionicons name="git-compare-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.optimizeBtnText}>{t('tours_optimize')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : stops.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>📍</Text>
          <Text style={styles.emptyTitle}>{t('tours_no_stops_title')}</Text>
          <Text style={styles.emptyHint}>{t('tours_no_stops_hint')}</Text>
        </View>
      ) : (
        <FlatList
          data={stops}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <View style={styles.stopRow}>
              <View style={styles.stopNumber}>
                <Text style={styles.stopNumberText}>{index + 1}</Text>
              </View>
              <TouchableOpacity
                style={{ flex: 1 }}
                onPress={() => item.listing && onOpenListing(item.listing)}
                activeOpacity={0.7}
              >
                <Text style={styles.stopName} numberOfLines={1}>
                  {item.listing?.name ?? '—'}
                </Text>
                {item.listing?.address ? (
                  <Text style={styles.stopAddr} numberOfLines={1}>{item.listing.address}</Text>
                ) : null}
              </TouchableOpacity>
              <View style={styles.stopActions}>
                <TouchableOpacity onPress={() => move(index, -1)} disabled={index === 0}>
                  <Ionicons name="chevron-up" size={20} color={index === 0 ? theme.colors.border : theme.colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => move(index, 1)} disabled={index === stops.length - 1}>
                  <Ionicons name="chevron-down" size={20} color={index === stops.length - 1 ? theme.colors.border : theme.colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => remove(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={20} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
      {promptNode}
    </SafeAreaView>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  title: { fontSize: 26, fontWeight: '700', fontFamily: theme.fonts.displayBold, color: theme.colors.text },
  subtitle: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.lg, gap: 8 },
  emptyEmoji: { fontSize: 44 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text, marginTop: 6 },
  emptyHint: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  errorText: { color: theme.colors.primary, fontSize: 15 },
  primaryBtn: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
  },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  limitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.sm,
    backgroundColor: '#FBEAEA',
    borderRadius: theme.borderRadius.sm,
  },
  limitText: { fontSize: 12, color: theme.colors.primary, flex: 1 },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
  },
  createBtnDisabled: { backgroundColor: theme.colors.textMuted },
  createBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  detailActions: { flexDirection: 'row', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.md },
  detailActionFlex: { flex: 1, marginHorizontal: 0 },
  optimizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: theme.spacing.sm,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surface,
  },
  optimizeBtnText: { color: theme.colors.primary, fontWeight: '700', fontSize: 15 },
  list: { paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.lg },
  scroll: { paddingBottom: theme.spacing.xxl },
  sectionTitle: {
    fontFamily: theme.fonts.displayBold,
    fontSize: 19,
    fontWeight: '700',
    color: theme.colors.text,
    paddingHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  curatedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    ...theme.shadow.small,
  },
  curatedEmoji: { fontSize: 30 },
  curatedName: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  curatedDesc: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 1 },
  curatedMeta: { fontSize: 12, color: theme.colors.primary, fontWeight: '700', marginTop: 3 },
  loginCard: {
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadow.small,
  },
  emptyInline: { alignItems: 'center', gap: 6, paddingVertical: theme.spacing.lg },
  tourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginVertical: theme.spacing.xs,
    ...theme.shadow.small,
  },
  tourIcon: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#FBEAEA',
    alignItems: 'center', justifyContent: 'center',
  },
  tourName: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  tourMeta: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  // Detail
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  detailTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: theme.colors.text },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginVertical: theme.spacing.xs,
    ...theme.shadow.small,
  },
  stopNumber: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  stopNumberText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  stopName: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  stopAddr: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 1 },
  stopActions: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: theme.spacing.lg },
  modalCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, gap: theme.spacing.md },
  modalTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  input: {
    borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.md, paddingVertical: 10, fontSize: 16, color: theme.colors.text,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: theme.spacing.sm },
  modalBtnGhost: { paddingHorizontal: theme.spacing.md, paddingVertical: 10 },
  modalBtnGhostText: { color: theme.colors.textSecondary, fontWeight: '600' },
  modalBtnPrimary: {
    backgroundColor: theme.colors.primary, paddingHorizontal: theme.spacing.lg, paddingVertical: 10,
    borderRadius: theme.borderRadius.sm,
  },
  modalBtnPrimaryText: { color: '#FFFFFF', fontWeight: '700' },
});
