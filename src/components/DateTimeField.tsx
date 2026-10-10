import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { dayLabel, timeLabel } from '@/lib/dates';
import { useAppColors } from '@/lib/theme';

import { Sheet } from './Sheet';

interface DateTimeFieldProps {
  value: Date;
  onChange: (date: Date) => void;
}

export function DateTimeField({ value, onChange }: DateTimeFieldProps) {
  const colors = useAppColors();
  const [iosOpen, setIosOpen] = useState(false);

  const openAndroid = (mode: 'date' | 'time') => {
    DateTimePickerAndroid.open({
      value,
      mode,
      maximumDate: mode === 'date' ? new Date() : undefined,
      onValueChange: (_event, picked) => {
        const next = new Date(value);
        if (mode === 'date') next.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
        else next.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
        onChange(next);
      },
    });
  };

  const fieldClass =
    'flex-1 flex-row items-center rounded-xl border border-slate-200 bg-card-light px-3 py-3 active:opacity-70 dark:border-white/10 dark:bg-card-dark';

  return (
    <>
      <View className="flex-row gap-3">
        <Pressable
          className={fieldClass}
          onPress={() => (Platform.OS === 'android' ? openAndroid('date') : setIosOpen(true))}>
          <Ionicons name="calendar-outline" size={18} color={colors.muted} />
          <Text className="ml-2 text-base text-slate-800 dark:text-slate-100">{dayLabel(value)}</Text>
        </Pressable>
        <Pressable
          className={fieldClass}
          onPress={() => (Platform.OS === 'android' ? openAndroid('time') : setIosOpen(true))}>
          <Ionicons name="time-outline" size={18} color={colors.muted} />
          <Text className="ml-2 text-base text-slate-800 dark:text-slate-100">{timeLabel(value)}</Text>
        </Pressable>
      </View>

      {Platform.OS === 'ios' ? (
        <Sheet visible={iosOpen} title="Date & time" onClose={() => setIosOpen(false)}>
          <View className="items-center">
            <DateTimePicker
              value={value}
              mode="datetime"
              display="inline"
              maximumDate={new Date()}
              onValueChange={(_event, picked) => onChange(picked)}
            />
          </View>
        </Sheet>
      ) : null}
    </>
  );
}
