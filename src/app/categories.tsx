import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Card } from '@/components/Card';
import { CategoryIcon } from '@/components/CategoryIcon';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { CATEGORY_COLORS, CATEGORY_ICONS, MISC_CATEGORY_ID } from '@/data/defaultCategories';
import { errorMessage } from '@/lib/api';
import { haptics } from '@/lib/haptics';
import { useAppColors } from '@/lib/theme';
import { useCategories } from '@/store/useCategories';
import { useTransactions } from '@/store/useTransactions';
import type { Category, IconName } from '@/types';

interface Draft {
  id: string | null;
  name: string;
  icon: IconName;
  color: string;
}

const NEW_DRAFT: Draft = { id: null, name: '', icon: 'sparkles-outline', color: CATEGORY_COLORS[7] };

export default function CategoriesScreen() {
  const categories = useCategories((s) => s.categories);
  const add = useCategories((s) => s.add);
  const update = useCategories((s) => s.update);
  const remove = useCategories((s) => s.remove);
  const transactions = useTransactions((s) => s.transactions);
  const colors = useAppColors();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of transactions) {
      if (tx.categoryId) map.set(tx.categoryId, (map.get(tx.categoryId) ?? 0) + 1);
    }
    return map;
  }, [transactions]);

  const openEdit = (c: Category) => setDraft({ id: c.id, name: c.name, icon: c.icon, color: c.color });
  const close = () => setDraft(null);

  const trimmedName = draft?.name.trim() ?? '';
  const nameTaken =
    !!draft && categories.some((c) => c.id !== draft.id && c.name.toLowerCase() === trimmedName.toLowerCase());
  const canSave = !!draft && trimmedName.length > 0 && !nameTaken;

  const save = async () => {
    if (!draft || !canSave || saving) return;
    const values = { name: trimmedName, icon: draft.icon, color: draft.color };
    if (draft.id) {
      update(draft.id, values);
    } else {
      setSaving(true);
      try {
        await add(values);
      } catch (err) {
        haptics.warning();
        Alert.alert('Couldn’t create the category', errorMessage(err));
        return;
      } finally {
        setSaving(false);
      }
    }
    haptics.success();
    close();
  };

  const confirmDelete = () => {
    if (!draft?.id) return;
    const id = draft.id;
    const count = counts.get(id) ?? 0;
    Alert.alert(
      `Delete "${draft.name}"?`,
      count > 0 ? `${count} ${count === 1 ? 'transaction' : 'transactions'} will move to Misc.` : undefined,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            haptics.warning();
            remove(id);
            close();
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => setDraft(NEW_DRAFT)} hitSlop={10}>
              <Ionicons name="add-circle" size={28} color={colors.brand} />
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerClassName="px-4 pb-16 pt-2">
        <Card className="overflow-hidden p-0">
          {categories.map((c, i) => (
            <Pressable
              key={c.id}
              onPress={() => openEdit(c)}
              className={`flex-row items-center px-4 py-3 active:bg-slate-100 dark:active:bg-white/5 ${
                i > 0 ? 'border-t border-slate-100 dark:border-white/5' : ''
              }`}>
              <CategoryIcon category={c} size={38} />
              <View className="ml-3 flex-1">
                <Text className="text-base font-semibold text-slate-900 dark:text-slate-50">{c.name}</Text>
                <Text className="text-xs text-slate-500 dark:text-slate-400">
                  {counts.get(c.id) ?? 0} transactions{c.isDefault ? '' : ' · Custom'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.subtle} />
            </Pressable>
          ))}
        </Card>
        <Pressable
          onPress={() => setDraft(NEW_DRAFT)}
          className="mt-4 flex-row items-center justify-center rounded-2xl border border-dashed border-brand-300 py-3.5 active:opacity-70 dark:border-brand-700">
          <Ionicons name="add" size={18} color={colors.brand} />
          <Text className="ml-1 font-semibold text-brand-600 dark:text-brand-400">New category</Text>
        </Pressable>
      </ScrollView>

      <Sheet
        visible={draft !== null}
        title={draft?.id ? 'Edit category' : 'New category'}
        onClose={close}
        footer={
          <View className="gap-2">
            <Pressable
              onPress={save}
              disabled={!canSave}
              className={`items-center rounded-2xl py-3.5 ${
                canSave ? 'bg-brand-600 active:opacity-80 dark:bg-brand-500' : 'bg-slate-200 dark:bg-white/10'
              }`}>
              <Text className={`font-bold ${canSave ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                {nameTaken ? 'Name already used' : saving ? 'Saving…' : 'Save'}
              </Text>
            </Pressable>
            {draft?.id && draft.id !== MISC_CATEGORY_ID ? (
              <Pressable onPress={confirmDelete} className="items-center py-2.5">
                <Text className="font-semibold text-rose-600 dark:text-rose-400">Delete category</Text>
              </Pressable>
            ) : null}
          </View>
        }>
        {draft ? (
          <>
            <View className="mb-4 mt-1 flex-row items-center">
              <CategoryIcon
                category={{ id: 'preview', name: draft.name, icon: draft.icon, color: draft.color, isDefault: false }}
                size={48}
              />
              <TextInput
                value={draft.name}
                onChangeText={(name) => setDraft({ ...draft, name })}
                placeholder="Category name"
                placeholderTextColor={colors.subtle}
                maxLength={24}
                autoFocus={!draft.id}
                className="ml-3 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900 dark:border-white/10 dark:text-slate-50"
              />
            </View>

            <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Colour
            </Text>
            <View className="flex-row flex-wrap gap-2.5">
              {CATEGORY_COLORS.map((color) => (
                <Pressable
                  key={color}
                  onPress={() => setDraft({ ...draft, color })}
                  className="h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: color }}>
                  {draft.color === color ? <Ionicons name="checkmark" size={18} color="#FFFFFF" /> : null}
                </Pressable>
              ))}
            </View>

            <Text className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Icon
            </Text>
            <View className="flex-row flex-wrap gap-2.5">
              {CATEGORY_ICONS.map((icon) => {
                const selected = draft.icon === icon;
                return (
                  <Pressable
                    key={icon}
                    onPress={() => setDraft({ ...draft, icon })}
                    className={`h-11 w-11 items-center justify-center rounded-xl ${
                      selected ? '' : 'bg-slate-100 dark:bg-white/5'
                    }`}
                    style={selected ? { backgroundColor: `${draft.color}2A`, borderWidth: 2, borderColor: draft.color } : undefined}>
                    <Ionicons name={icon} size={20} color={selected ? draft.color : colors.muted} />
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}
      </Sheet>
    </Screen>
  );
}
