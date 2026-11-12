import { useTranslation } from 'react-i18next';

import { PlaceholderSheet } from '@/shell/placeholder-sheet';

/** «Registrar un Servicio» from the actions sheet. The Service form (S7) takes this route. */
export default function RecordServiceSheet() {
  const { t } = useTranslation();
  return <PlaceholderSheet testID="record-service-sheet" icon="service" title={t('actions.service.title')} body={t('placeholder.service')} />;
}
