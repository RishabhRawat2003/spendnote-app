import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { SOURCE_LIST } from '@/data/sources';
import { DATE_RANGE_LABELS } from '@/lib/dates';
import { haptics } from '@/lib/haptics';
import { EMPTY_FILTERS, UNTAGGED_KEY } from '@/lib/selectors';
import { useAppColors } from '@/lib/theme';
import { useCategories } from '@/store/useCategories';
import type { DateRange, IconName, TransactionFilters } from '@/types';

import { Sheet } from './Sheet';

type SheetKind = 'type' | 'range' | 'source' | 'category' | null;

interface FilterBarProps {
  filters: TransactionFilters;
  onChange: (filters: TransactionFilters) => void;
}

const TYPE_LABELS: Record<TransactionFilters['type'], string> = {
  all: 'Money in & out',
  debit: 'Money out',
  credit: 'Money in',
};

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

export function FilterBar({ filters, onChange }: FilterBarProps) {
  const [open, setOpen] = useState<SheetKind>(null);
  const categories = useCategories((s) => s.categories);
  const isFiltered =
    filters.type !== 'all' || filters.range !== 'all' || filters.sources.length > 0 || filters.categoryIds.length > 0;

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 px-5 pb-2"
        keyboardShouldPersistTaps="handled">
        {isFiltered ? (
          <FilterChip
            icon="close"
            label="Clear"
            active={false}
            onPress={() => onChange({ ...EMPTY_FILTERS, query: filters.query })}
          />
        ) : null}
        <FilterChip
          label={filters.type === 'all' ? 'Type' : TYPE_LABELS[filters.type]}
          active={filters.type !== 'all'}
          onPress={() => setOpen('type')}
        />
        <FilterChip
          label={filters.range === 'all' ? 'Date' : DATE_RANGE_LABELS[filters.range]}
          active={filters.range !== 'all'}
          onPress={() => setOpen('range')}
        />
        <FilterChip
          label={filters.categoryIds.length ? `Category · ${filters.categoryIds.length}` : 'Category'}
          active={filters.categoryIds.length > 0}
          onPress={() => setOpen('category')}
        />
        <FilterChip
          label={filters.sources.length ? `Paid via · ${filters.sources.length}` : 'Paid via'}
          active={filters.sources.length > 0}
          onPress={() => setOpen('source')}
        />
      </ScrollView>

      <Sheet visible={open === 'type'} title="Type" onClose={() => setOpen(null)}>
        {(Object.keys(TYPE_LABELS) as TransactionFilters['type'][]).map((type) => (
          <OptionRow
            key={type}
            label={TYPE_LABELS[type]}
            selected={filters.type === type}
            onPress={() => {
              onChange({ ...filters, type });
              setOpen(null);
            }}
          />
        ))}
      </Sheet>

      <Sheet visible={open === 'range'} title="Date" onClose={() => setOpen(null)}>
        {(Object.keys(DATE_RANGE_LABELS) as DateRange[]).map((range) => (
          <OptionRow
            key={range}
            label={DATE_RANGE_LABELS[range]}
            selected={filters.range === range}
            onPress={() => {
              onChange({ ...filters, range });
              setOpen(null);
            }}
          />
        ))}
      </Sheet>

      <Sheet visible={open === 'category'} title="Category" onClose={() => setOpen(null)}>
        <OptionRow
          label="Untagged"
          icon="help-circle-outline"
          iconColor="#D97706"
          multi
          selected={filters.categoryIds.includes(UNTAGGED_KEY)}
          onPress={() => onChange({ ...filters, categoryIds: toggle(filters.categoryIds, UNTAGGED_KEY) })}
        />
        {categories.map((c) => (
          <OptionRow
            key={c.id}
            label={c.name}
            icon={c.icon}
            iconColor={c.color}
            multi
            selected={filters.categoryIds.includes(c.id)}
            onPress={() => onChange({ ...filters, categoryIds: toggle(filters.categoryIds, c.id) })}
          />
        ))}
      </Sheet>

      <Sheet visible={open === 'source'} title="Paid via" onClose={() => setOpen(null)}>
        {SOURCE_LIST.map((s) => (
          <OptionRow
            key={s.id}
            label={s.label}
            icon={s.icon}
            iconColor={s.color}
            multi
            selected={filters.sources.includes(s.id)}
            onPress={() => onChange({ ...filters, sources: toggle(filters.sources, s.id) })}
          />
        ))}
      </Sheet>
    </>
  );
}

function FilterChip({
  label,
  active,
  onPress,
  icon,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  icon?: IconName;
}) {
  const colors = useAppColors();
  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      className={`flex-row items-center rounded-full border px-3 py-1.5 ${
        active
          ? 'border-brand-600 bg-brand-600 dark:border-brand-500 dark:bg-brand-500'
          : 'border-slate-200 bg-card-light dark:border-white/10 dark:bg-card-dark'
      }`}>
      {icon ? <Ionicons name={icon} size={14} color={active ? '#FFFFFF' : colors.muted} /> : null}
      <Text
        className={`text-sm font-semibold ${icon ? 'ml-1' : ''} ${
          active ? 'text-white' : 'text-slate-700 dark:text-slate-200'
        }`}>
        {label}
      </Text>
      {!icon ? (
        <Ionicons
          name="chevron-down"
          size={14}
          color={active ? '#FFFFFF' : colors.subtle}
          style={{ marginLeft: 4 }}
        />
      ) : null}
    </Pressable>
  );
}

function OptionRow({
  label,
  selected,
  onPress,
  icon,
  iconColor,
  multi = false,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: IconName;
  iconColor?: string;
  multi?: boolean;
}) {
  const colors = useAppColors();
  const checkIcon: IconName = multi
    ? selected
      ? 'checkbox'
      : 'square-outline'
    : selected
      ? 'radio-button-on'
      : 'radio-button-off';
  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      className="flex-row items-center border-b border-slate-100 py-3.5 dark:border-white/5">
      {icon ? (
        <View className="mr-3 h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: `${iconColor}22` }}>
          <Ionicons name={icon} size={16} color={iconColor} />
        </View>
      ) : null}
      <Text className="flex-1 text-base text-slate-800 dark:text-slate-100">{label}</Text>
      <Ionicons name={checkIcon} size={22} color={selected ? colors.brand : colors.subtle} />
    </Pressable>
  );
}
