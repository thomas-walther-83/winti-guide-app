import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Alert } from '../utils/alert';

import { useTheme } from '../context/ThemeContext';
import type { AppTheme } from '../styles/theme';
import { useIsAdmin } from '../hooks/useIsAdmin';
import {
  fetchPublicTours,
  createPublicTour,
  updatePublicTour,
  deletePublicTour,
  replacePublicTourStops,
} from '../services/publicToursService';
import { fetchListings, setListingFeatured } from '../services/supabaseService';
import { getErrorMessage } from '../utils/errors';
import type { Listing, PublicTour, PublicTourStop } from '../types';
import { AdminTourPlanner } from './AdminTourPlanner';

interface Props {
  onClose?: () => void;
}

type Mode = 'tours' | 'featured';

/**
 * Admin-Bereich. Sichtbar nur für E-Mails aus `ADMIN_EMAILS`.
 * UI bewusst auf Deutsch hardcoded (interne Tooling, ein Admin).
 */
export function AdminScreen({ onClose }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const isAdmin = useIsAdmin();
  const [mode, setMode] = useState<Mode>('tours');

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="lock-closed-outline" size={48} color={theme.colors.textMuted} />
          <Text style={styles.deniedText}>Kein Admin-Zugriff für diesen Account.</Text>
          {onClose && (
            <TouchableOpacity style={styles.primaryBtn} onPress={onClose}>
              <Text style={styles.primaryBtnText}>Zurück</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Admin</Text>
          <Text style={styles.subtitle}>Kuration öffentlicher Inhalte</Text>
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={28} color={theme.colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tabBtn, mode === 'tours' && styles.tabBtnActive]}
          onPress={() => setMode('tours')}
        >
          <Text style={[styles.tabText, mode === 'tours' && styles.tabTextActive]}>Touren</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, mode === 'featured' && styles.tabBtnActive]}
          onPress={() => setMode('featured')}
        >
          <Text style={[styles.tabText, mode === 'featured' && styles.tabTextActive]}>Empfohlen</Text>
        </TouchableOpacity>
      </View>
      {mode === 'tours' ? <ToursAdmin /> : <FeaturedAdmin />}
    </SafeAreaView>
  );
}

// ─── Touren-Admin ──────────────────────────────────────────────────────

function ToursAdmin() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [tours, setTours] = useState<PublicTour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<PublicTour | null>(null);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const rows = await fetchPublicTours({ includeUnpublished: true });
      setTours(rows);
    } catch (err) {
      setError(getErrorMessage(err, 'Konnte Touren nicht laden'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const handleNew = () => {
    setEditing({
      id: '',
      slug: '',
      name: 'Neue Tour',
      description: '',
      emoji: '🗺️',
      sort_order: (tours.at(-1)?.sort_order ?? 0) + 10,
      published: true,
      stops: [],
    });
  };

  const handleSaved = async () => {
    setEditing(null);
    await reload();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {error && <Text style={styles.errorText}>⚠️ {error}</Text>}
        <TouchableOpacity style={styles.primaryBtn} onPress={handleNew}>
          <Ionicons name="add-circle-outline" size={18} color="#fff" />
          <Text style={styles.primaryBtnText}>Neue Tour</Text>
        </TouchableOpacity>
        {tours.map((t) => (
          <TouchableOpacity key={t.id} style={styles.row} onPress={() => setEditing(t)} activeOpacity={0.7}>
            <Text style={styles.rowEmoji}>{t.emoji || '🗺️'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>{t.name}</Text>
              <Text style={styles.rowSubtle} numberOfLines={1}>
                {t.stops.length} Stops · {t.published ? 'sichtbar' : 'versteckt'} · #{t.sort_order ?? 0}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        ))}
        {tours.length === 0 && (
          <Text style={styles.muted}>Noch keine öffentlichen Touren angelegt.</Text>
        )}
      </ScrollView>
      <Modal visible={!!editing} animationType="slide" onRequestClose={() => setEditing(null)}>
        {editing && <TourEditor initial={editing} onCancel={() => setEditing(null)} onSaved={handleSaved} />}
      </Modal>
    </View>
  );
}

// ─── Tour-Editor (Modal) ───────────────────────────────────────────────

function TourEditor({
  initial,
  onCancel,
  onSaved,
}: {
  initial: PublicTour;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  // `tourId` ist mutable: bei einer neuen Tour wird beim ersten Persist eine
  // ID vergeben (createPublicTour), danach läuft alles als Update.
  const [tourId, setTourId] = useState<string>(initial.id);
  const isNew = !tourId;
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description ?? '');
  const [emoji, setEmoji] = useState(initial.emoji ?? '');
  const [slug, setSlug] = useState(initial.slug);
  const [sortOrder, setSortOrder] = useState(String(initial.sort_order ?? 0));
  const [published, setPublished] = useState(initial.published ?? true);
  const [stops, setStops] = useState<PublicTourStop[]>(initial.stops);
  const [saving, setSaving] = useState(false);
  const [planner, setPlanner] = useState<PublicTour | null>(null);

  // Automatischer Slug-Vorschlag bei neuen Touren, solange der User nichts
  // Eigenes eingegeben hat (entspricht dem Tour-Namen ohne Sonderzeichen).
  const autoSlug = name
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/[äàá]/g, 'a')
    .replace(/[öòó]/g, 'o')
    .replace(/[üùú]/g, 'u')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  useEffect(() => {
    if (isNew && (!slug || slug === '')) setSlug(autoSlug);
  }, [autoSlug, isNew, slug]);

  const addStop = () => {
    setStops((prev) => [...prev, { position: prev.length + 1, lat: 47.5, lon: 8.73, name: '' }]);
  };
  const removeStop = (idx: number) => {
    setStops((prev) => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, position: i + 1 })));
  };
  const moveStop = (idx: number, dir: -1 | 1) => {
    setStops((prev) => {
      const next = prev.slice();
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next.map((s, i) => ({ ...s, position: i + 1 }));
    });
  };
  const setStopField = (idx: number, patch: Partial<PublicTourStop>) => {
    setStops((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Fehlt', 'Name ist Pflicht.');
      return;
    }
    if (!slug.trim()) {
      Alert.alert('Fehlt', 'Slug ist Pflicht.');
      return;
    }
    for (const s of stops) {
      if (!s.name.trim()) {
        Alert.alert('Fehlt', 'Jeder Stop braucht einen Namen.');
        return;
      }
      if (!Number.isFinite(s.lat) || !Number.isFinite(s.lon)) {
        Alert.alert('Ungültig', `Stop "${s.name}" hat keine gültigen Koordinaten.`);
        return;
      }
    }
    try {
      setSaving(true);
      const id = await persistMetadata();
      await replacePublicTourStops(id, stops);
      onSaved();
    } catch (err) {
      Alert.alert('Fehler', getErrorMessage(err, 'Speichern fehlgeschlagen'));
    } finally {
      setSaving(false);
    }
  };

  // Schreibt Tour-Metadaten (Name, Slug, …) zurück und vergibt – falls neu –
  // eine ID. Wird sowohl von Speichern als auch vom Map-Planer-Eintritt genutzt.
  const persistMetadata = async (): Promise<string> => {
    const meta = {
      slug: slug.trim(),
      name: name.trim(),
      description: description.trim(),
      emoji: emoji.trim(),
      sort_order: parseInt(sortOrder, 10) || 0,
      published,
    };
    if (!tourId) {
      const created = await createPublicTour(meta);
      setTourId(created.id);
      return created.id;
    }
    await updatePublicTour(tourId, meta);
    return tourId;
  };

  const openPlanner = async () => {
    if (!name.trim() || !slug.trim()) {
      Alert.alert('Fehlt', 'Name und Slug müssen vor dem Map-Planer ausgefüllt sein.');
      return;
    }
    try {
      // Sicherstellen, dass die Tour eine ID hat – der Planer schreibt direkt
      // in `public_tour_stops` und braucht dafür einen FK.
      const id = await persistMetadata();
      setPlanner({
        id,
        slug: slug.trim(),
        name: name.trim(),
        description: description.trim(),
        emoji: emoji.trim(),
        sort_order: parseInt(sortOrder, 10) || 0,
        published,
        stops,
      });
    } catch (err) {
      Alert.alert('Fehler', getErrorMessage(err, 'Map-Planer konnte nicht geöffnet werden'));
    }
  };

  const handleDelete = () => {
    if (isNew) {
      onCancel();
      return;
    }
    Alert.alert('Tour löschen?', `"${initial.name}" wird endgültig gelöscht.`, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePublicTour(initial.id);
            onSaved();
          } catch (err) {
            Alert.alert('Fehler', getErrorMessage(err, 'Löschen fehlgeschlagen'));
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.linkText}>Abbrechen</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{isNew ? 'Neue Tour' : 'Tour bearbeiten'}</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={[styles.linkText, { fontWeight: '700' }]}>{saving ? '…' : 'Speichern'}</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholderTextColor={theme.colors.textMuted} />

          <Text style={styles.fieldLabel}>Beschreibung</Text>
          <TextInput
            style={[styles.input, { minHeight: 64 }]}
            value={description}
            onChangeText={setDescription}
            multiline
            placeholderTextColor={theme.colors.textMuted}
          />

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Emoji</Text>
              <TextInput style={styles.input} value={emoji} onChangeText={setEmoji} maxLength={4} placeholderTextColor={theme.colors.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Sortierung</Text>
              <TextInput
                style={styles.input}
                value={sortOrder}
                onChangeText={setSortOrder}
                keyboardType="number-pad"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
          </View>

          <Text style={styles.fieldLabel}>Slug (URL-Schlüssel, eindeutig)</Text>
          <TextInput
            style={styles.input}
            value={slug}
            onChangeText={setSlug}
            autoCapitalize="none"
            placeholderTextColor={theme.colors.textMuted}
          />

          <View style={styles.toggleRow}>
            <Text style={styles.fieldLabel}>Veröffentlicht</Text>
            <Switch value={published} onValueChange={setPublished} />
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Stops</Text>
          {stops.map((s, idx) => (
            <View key={idx} style={styles.stopCard}>
              <View style={styles.stopHeaderRow}>
                <Text style={styles.stopBadge}>{idx + 1}</Text>
                <TouchableOpacity onPress={() => moveStop(idx, -1)} disabled={idx === 0}>
                  <Ionicons name="chevron-up" size={20} color={idx === 0 ? theme.colors.textMuted : theme.colors.text} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => moveStop(idx, 1)} disabled={idx === stops.length - 1}>
                  <Ionicons
                    name="chevron-down"
                    size={20}
                    color={idx === stops.length - 1 ? theme.colors.textMuted : theme.colors.text}
                  />
                </TouchableOpacity>
                <View style={{ flex: 1 }} />
                <TouchableOpacity onPress={() => removeStop(idx)}>
                  <Ionicons name="trash-outline" size={20} color="#C0392B" />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                value={s.name}
                onChangeText={(v) => setStopField(idx, { name: v })}
                placeholder="Name des Stops"
                placeholderTextColor={theme.colors.textMuted}
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Latitude</Text>
                  <TextInput
                    style={styles.input}
                    value={String(s.lat)}
                    onChangeText={(v) => setStopField(idx, { lat: parseFloat(v.replace(',', '.')) })}
                    keyboardType="numeric"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Longitude</Text>
                  <TextInput
                    style={styles.input}
                    value={String(s.lon)}
                    onChangeText={(v) => setStopField(idx, { lon: parseFloat(v.replace(',', '.')) })}
                    keyboardType="numeric"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.primaryBtn} onPress={openPlanner}>
            <Ionicons name="map-outline" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>Auf Karte planen</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={addStop}>
            <Ionicons name="add" size={18} color={theme.colors.primary} />
            <Text style={styles.secondaryBtnText}>Freier Punkt (lat/lon)</Text>
          </TouchableOpacity>

          {!isNew && (
            <TouchableOpacity style={styles.dangerBtn} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={18} color="#fff" />
              <Text style={styles.dangerBtnText}>Tour löschen</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
        <Modal visible={!!planner} animationType="slide" onRequestClose={() => setPlanner(null)}>
          {planner && (
            <AdminTourPlanner
              tour={planner}
              onClose={() => setPlanner(null)}
              onSaved={(newStops) => {
                setStops(newStops);
                setPlanner(null);
              }}
            />
          )}
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Featured-Admin ────────────────────────────────────────────────────

function FeaturedAdmin() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Listing | null>(null);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setListings(await fetchListings());
    } catch (err) {
      setError(getErrorMessage(err, 'Konnte Listings nicht laden'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    // Featured zuerst, dann der Rest
    const sorted = listings.slice().sort((a, b) => {
      const af = a.is_featured ? 0 : 1;
      const bf = b.is_featured ? 0 : 1;
      if (af !== bf) return af - bf;
      return a.name.localeCompare(b.name);
    });
    if (!q) return sorted.slice(0, 200);
    return sorted.filter((l) => l.name.toLowerCase().includes(q)).slice(0, 200);
  }, [listings, search]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={theme.colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Listings durchsuchen…"
          placeholderTextColor={theme.colors.textMuted}
        />
      </View>
      {error && <Text style={styles.errorText}>⚠️ {error}</Text>}
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => setEditing(item)} activeOpacity={0.7}>
            <View style={[styles.featBadge, item.is_featured && styles.featBadgeOn]}>
              <Ionicons
                name={item.is_featured ? 'star' : 'star-outline'}
                size={16}
                color={item.is_featured ? '#fff' : theme.colors.textMuted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.rowSubtle} numberOfLines={1}>
                {item.category}
                {item.featured_until ? ` · bis ${item.featured_until.slice(0, 10)}` : ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
      <Modal visible={!!editing} animationType="slide" onRequestClose={() => setEditing(null)}>
        {editing && (
          <FeaturedEditor
            listing={editing}
            onCancel={() => setEditing(null)}
            onSaved={async () => {
              setEditing(null);
              await reload();
            }}
          />
        )}
      </Modal>
    </View>
  );
}

function FeaturedEditor({
  listing,
  onCancel,
  onSaved,
}: {
  listing: Listing;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [isFeatured, setIsFeatured] = useState(!!listing.is_featured);
  const [until, setUntil] = useState(listing.featured_until ? listing.featured_until.slice(0, 10) : '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    let untilIso: string | null = null;
    if (isFeatured && until.trim()) {
      const d = new Date(until + 'T23:59:59');
      if (!Number.isFinite(d.getTime())) {
        Alert.alert('Ungültig', 'Datum bitte als YYYY-MM-DD eingeben.');
        return;
      }
      untilIso = d.toISOString();
    }
    try {
      setSaving(true);
      await setListingFeatured(listing.id, isFeatured, untilIso);
      onSaved();
    } catch (err) {
      Alert.alert('Fehler', getErrorMessage(err, 'Speichern fehlgeschlagen'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.linkText}>Abbrechen</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{listing.name}</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[styles.linkText, { fontWeight: '700' }]}>{saving ? '…' : 'Speichern'}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.toggleRow}>
          <Text style={styles.fieldLabel}>In „Empfohlen für dich" anzeigen</Text>
          <Switch value={isFeatured} onValueChange={setIsFeatured} />
        </View>
        <Text style={styles.fieldLabel}>Empfohlen bis (optional, YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={until}
          onChangeText={setUntil}
          placeholder="z.B. 2026-12-31"
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="none"
        />
        <Text style={styles.muted}>
          Leer lassen für unbegrenzt. Nach dem Datum verschwindet das Listing automatisch wieder aus der Empfehlung.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
    header: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    title: { fontSize: 22, fontFamily: 'Fraunces_700Bold', color: theme.colors.text },
    subtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
    tabs: { flexDirection: 'row', padding: 12, gap: 8 },
    tabBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
    },
    tabBtnActive: { backgroundColor: theme.colors.primary },
    tabText: { color: theme.colors.text, fontWeight: '600' },
    tabTextActive: { color: '#fff' },
    scroll: { padding: 16, gap: 12, paddingBottom: 48 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      backgroundColor: theme.colors.surface,
      borderRadius: 10,
    },
    rowEmoji: { fontSize: 26 },
    rowTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
    rowSubtle: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
    muted: { color: theme.colors.textMuted, fontSize: 12, marginTop: 8 },
    errorText: { color: '#C0392B', fontSize: 13 },
    fieldLabel: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 12, marginBottom: 4 },
    input: {
      backgroundColor: theme.colors.surface,
      color: theme.colors.text,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 8,
      fontSize: 15,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 12,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 4,
    },
    stopCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 10,
      padding: 10,
      gap: 8,
    },
    stopHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    stopBadge: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: theme.colors.primary,
      color: '#fff',
      textAlign: 'center',
      lineHeight: 26,
      fontWeight: '700',
      fontSize: 13,
      overflow: 'hidden',
    },
    primaryBtn: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    primaryBtnText: { color: '#fff', fontWeight: '700' },
    secondaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    secondaryBtnText: { color: theme.colors.primary, fontWeight: '600' },
    dangerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: '#C0392B',
      marginTop: 20,
    },
    dangerBtnText: { color: '#fff', fontWeight: '700' },
    linkText: { color: theme.colors.primary, fontSize: 15 },
    deniedText: { color: theme.colors.textSecondary, textAlign: 'center' },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      marginHorizontal: 16,
      marginVertical: 8,
      backgroundColor: theme.colors.surface,
      borderRadius: 10,
    },
    searchInput: { flex: 1, paddingVertical: 10, color: theme.colors.text },
    featBadge: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    featBadgeOn: { backgroundColor: theme.colors.primary },
  });
