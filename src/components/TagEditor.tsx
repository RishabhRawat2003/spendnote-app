import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { useAppColors } from '@/lib/theme';

interface TagEditorProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

function normalizeTag(input: string): string {
  return input
    .trim()
    .replace(/^#+/, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export function TagEditor({ tags, onChange }: TagEditorProps) {
  const colors = useAppColors();
  const [draft, setDraft] = useState('');

  const addDraft = () => {
    const tag = normalizeTag(draft);
    setDraft('');
    if (tag && !tags.includes(tag)) onChange([...tags, tag]);
  };

  return (
    <View className="flex-row flex-wrap items-center gap-2">
      {tags.map((tag) => (
        <View key={tag} className="flex-row items-center rounded-full bg-brand-50 py-1.5 pl-3 pr-2 dark:bg-brand-900/40">
          <Text className="text-sm font-semibold text-brand-700 dark:text-brand-300">#{tag}</Text>
          <Pressable onPress={() => onChange(tags.filter((t) => t !== tag))} hitSlop={8} className="ml-1">
            <Ionicons name="close" size={14} color={colors.brand} />
          </Pressable>
        </View>
      ))}
      <TextInput
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={addDraft}
        onBlur={addDraft}
        placeholder={tags.length ? 'Add tag' : 'e.g. goa-trip'}
        placeholderTextColor={colors.subtle}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        submitBehavior="submit"
        className="min-w-[110px] rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-800 dark:border-white/15 dark:text-slate-100"
      />
    </View>
  );
}
