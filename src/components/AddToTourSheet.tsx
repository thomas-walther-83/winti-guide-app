import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useAppTier } from '../hooks/useAppTier';
import { useTranslation } from '../hooks/useTranslation';
import { theme } from '../styles/theme';
import { FREE_MAX_TOURS, FREE_MAX_STOPS } from '../config/tourLimits';
import { fetchUserTours, createTour, addStop } from '../services/toursService';
import type { Listing, UserTour } from '../types';

interface Props {
  listing: Listing;
  visible: boolean;
  onClose: () => void;
}

export function AddToTourSheet({ listing, visible, onClose }: Props) {
  const { user } = useAuth();
  const { isPremium } = useAppTier();
  const { t } = useTranslation();

  const [tours, setTours] = useState<UserTour[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      setTours(await fetchUserTours());
    } catch {
      setTours([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (visible) {
      setMessage(null);
      load();
    }
  }, [visible, load]);

  const addToTour = async (tour: UserTour) => {
    if (!isPremium && (tour.stopCount ?? 0) >= FREE_MAX_STOPS) {
      setMessage(t('tours_stop_limit'));
      return;
    }
    try {
      setBusy(true);
      await addStop(tour.id, listing.id);
      setMessage(t('tours_added'));
      setTimeout(onClose, 700);
    } catch {
      setMessage(t('error_loading'));
    } finally {
      setBusy(false);
    }
  };

  const createAndAdd = async () => {
    if (!user) return;
    if (!isPremium && tours.length >= FREE_MAX_TOURS) {
      setMessage(t('tours_free_limit').replace('{n}', String(FREE_MAX_TOURS)));
      return;
    }
    try {
      setBusy(true);
      const tour = await createTour(user.id, t('tours_default_name'));
      await addStop(tour.id, listing.id);
      setMessage(t('tours_added'));
      setTimeout(onClose, 700);
    } catch {
      setMessage(t('error_loading'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>{t('tours_pick')}</Text>

          {!user ? (
            <Text style={styles.hint}>{t('tours_login_hint')}</Text>
          ) : loading ? (
            <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 20 }} />
          ) : (
            <>
              <FlatList
                data={tours}
                keyExtractor={(item) => item.id}
                style={{ maxHeight: 240 }}
                ListEmptyComponent={<Text style={styles.hint}>{t('tours_empty_title')}</Text>}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.row} onPress={() => addToTour(item)} disabled={busy}>
                    <Ionicons name="trail-sign-outline" size={18} color={theme.colors.primary} />
                    <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.rowMeta}>{item.stopCount ?? 0}</Text>
                  </TouchableOpacity>
                )}
              />
              <TouchableOpacity style={styles.createRow} onPress={createAndAdd} disabled={busy}>
                <Ionicons name="add-circle-outline" size={20} color={theme.colors.primary} />
                <Text style={styles.createText}>{t('tours_new')}</Text>
              </TouchableOpacity>
            </>
          )}

          {message ? <Text style={styles.message}>{message}</Text> : null}

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>{t('cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.lg + 16,
    gap: theme.spacing.sm,
  } as object,
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.border,
    alignSelf: 'center', marginBottom: theme.spacing.sm,
  },
  title: { fontSize: 18, fontWeight: '700', color: theme.colors.text, marginBottom: 4 },
  hint: { fontSize: 14, color: theme.colors.textSecondary, paddingVertical: 12 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  rowName: { flex: 1, fontSize: 15, color: theme.colors.text },
  rowMeta: { fontSize: 13, color: theme.colors.textMuted },
  createRow: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingVertical: 14,
  },
  createText: { fontSize: 15, fontWeight: '600', color: theme.colors.primary },
  message: { fontSize: 14, color: theme.colors.primary, textAlign: 'center', paddingVertical: 4 },
  closeBtn: { alignItems: 'center', paddingVertical: 10 },
  closeText: { fontSize: 15, color: theme.colors.textSecondary, fontWeight: '600' },
});
