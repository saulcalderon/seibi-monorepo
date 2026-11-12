import { useTranslation } from 'react-i18next';

import { PlaceholderSheet } from '@/shell/placeholder-sheet';

/** «Actualizar Kilometraje» from the actions sheet. The Mileage form (S8) takes this route. */
export default function UpdateMileageSheet() {
  const { t } = useTranslation();
  return <PlaceholderSheet testID="update-mileage-sheet" icon="mileage" title={t('actions.mileage.title')} body={t('placeholder.mileage')} />;
}
