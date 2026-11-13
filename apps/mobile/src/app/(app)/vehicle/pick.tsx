import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useMakes, useModels, yearOptions } from '@/data/vpic/queries';
import { POPULAR_BRANDS } from '@/data/vpic/schemas';
import { groupOptions, PickerList, type PickerItem } from '@/ui/picker';
import { deliverPick, type PickKind } from '@/vehicle/picker-channel';
import { exactOption, filterOptions, fold } from '@/vehicle/search';

type Params = { kind?: PickKind; value?: string; brand?: string; year?: string };
type Row = Parameters<typeof groupOptions>[0][number];

/**
 * The Vehicle form's picker, pushed inside its modal: the make, the year or
 * the model, with the system's search bar. Makes and models come from NHTSA
 * vPIC; a make or model it doesn't list (Hilux, NP300) is typed in the
 * search and taken with «Usar “…”», as the PWA's Combobox allowed.
 */
export default function PickScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const kind: PickKind = params.kind === 'year' || params.kind === 'model' ? params.kind : 'brand';
  const current = params.value ?? '';
  const brand = params.brand ?? '';
  const year = params.year ? Number(params.year) : null;
  const [query, setQuery] = useState('');

  const makes = useMakes(kind === 'brand');
  const models = useModels(kind === 'model' ? brand : '', kind === 'model' ? year : null);

  const choose = (value: string) => {
    deliverPick(kind, value);
    router.back();
  };
  const option = (label: string, extra: Partial<Extract<Row, { type: 'option' }>> = {}): Row => ({
    type: 'option',
    key: `option-${label}`,
    label,
    selected: fold(label) === fold(current) && current.length > 0,
    spoken: fold(label) === fold(current) && current.length > 0 ? t('picker.chosen', { value: label }) : label,
    onPress: () => choose(label),
    testID: `pick-option-${label}`,
    ...extra,
  });
  const typed = query.trim();
  const custom = (options: readonly string[]): Row[] =>
    typed && !exactOption(options, typed)
      ? [option(typed, { key: 'custom', label: t('picker.use', { value: typed }), spoken: t('picker.useSpoken', { value: typed }), custom: true, selected: false, onPress: () => choose(typed), testID: 'pick-custom' })]
      : [];
  const nothing: Row = { type: 'note', key: 'nothing', text: t('picker.nothing', { query: typed }) };

  let title: string;
  let placeholder: string;
  let rows: Row[];
  if (kind === 'year') {
    title = t('vehicleForm.year');
    placeholder = t('picker.searchYear');
    const found = filterOptions(yearOptions().map(String), typed);
    rows = found.length ? found.map((y) => option(y)) : [nothing];
  } else if (kind === 'brand') {
    title = t('vehicleForm.brand');
    placeholder = t('picker.searchBrand');
    const all = makes.data ?? POPULAR_BRANDS;
    if (!typed) {
      rows = [
        { type: 'header', key: 'popular', title: t('picker.popular') },
        ...POPULAR_BRANDS.map((name) => option(name, { key: `popular-${name}` })),
        ...(makes.data ? [{ type: 'header', key: 'all', title: t('picker.allBrands') } as const, ...makes.data.map((name) => option(name))] : []),
        ...(makes.isError ? [{ type: 'note', key: 'failed', text: t('picker.failed') } as const] : []),
      ];
    } else {
      rows = [...custom(all), ...filterOptions(all, typed).map((name) => option(name))];
    }
  } else {
    title = t('vehicleForm.model');
    placeholder = t('picker.searchModel');
    const all = models.data ?? [];
    const ready = brand.trim().length > 1 && year !== null;
    const listed = filterOptions(all, typed).map((name) => option(name));
    rows = [
      { type: 'note', key: 'hint', text: ready && !models.isError ? t('vehicleForm.modelHint') : models.isError ? t('picker.failed') : t('picker.typeIt') },
      ...custom(all),
      ...(listed.length && !typed ? [{ type: 'header', key: 'models', title: t('picker.models', { year }) } as const] : []),
      ...listed,
    ];
  }

  return (
    <>
      <PickerList testID={`pick-${kind}`} items={groupOptions(rows) as PickerItem[]} />
      <Stack.Screen options={{ title }} />
      <Stack.SearchBar
        placeholder={placeholder}
        onChangeText={(event) => setQuery(event.nativeEvent.text)}
        onCancelButtonPress={() => setQuery('')}
        autoCapitalize={kind === 'year' ? 'none' : 'words'}
        inputType={kind === 'year' ? 'number' : 'text'}
        autoFocus={kind !== 'year'}
        hideWhenScrolling={false}
        cancelButtonText={t('picker.cancel')}
      />
    </>
  );
}
