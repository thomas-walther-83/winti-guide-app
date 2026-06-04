import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
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
import { theme } from '../styles/theme';
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
import type { UserTour, TourStop, Listing } from '../types';
import type { MapTour } from './MapScreen';

interface Props {
  onNavigateToAccount?: () => void;
  onNavigateToMap?: (listing: Listing) => void;
  onShowTour?: (tour: MapTour) => void;
}

export function ToursScreen({ onNavigateToAccount, onShowTour }: Props) {
  const { user } = useAuth();
  const { isPremium } = useAppTier();
  const { t } = useTranslation();
  const { open } = useDetail();

  const [tours, setTours] = useState<UserTour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openTour, setOpenTour] = useState<UserTour | null>(null);

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

  // ── Nicht eingeloggt ───────────────────────────────────────────────
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('tours_title')}</Text>
        </View>
        <View style={styles.center}>
          <Ionicons name="trail-sign-outline" size={56} color={theme.colors.textMuted} />
          <Text style={styles.emptyTitle}>{t('tours_login_title')}</Text>
          <Text style={styles.emptyHint}>{t('tours_login_hint')}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={onNavigateToAccount}>
            <Text style={styles.primaryBtnText}>{t('to_login')}</Text>
          </TouchableOpacity>
        </View>
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
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      ) : tours.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🧭</Text>
          <Text style={styles.emptyTitle}>{t('tours_empty_title')}</Text>
          <Text style={styles.emptyHint}>{t('tours_empty_hint')}</Text>
        </View>
      ) : (
        <FlatList
          data={tours}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.tourRow} onPress={() => setOpenTour(item)} activeOpacity={0.7}>
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
          )}
        />
      )}

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

      {mapStops.length >= 2 && onShowTour && (
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => onShowTour({ id: tour.id, name: tour.name, stops: mapStops, savedWaypoints })}
          activeOpacity={0.85}
        >
          <Ionicons name="map" size={18} color="#FFFFFF" />
          <Text style={styles.createBtnText}>{t('show_on_map')}</Text>
        </TouchableOpacity>
      )}

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  title: { fontSize: 26, fontWeight: '700', color: theme.colors.text },
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
  list: { paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.lg },
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
  modalCard: { backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, gap: theme.spacing.md },
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
