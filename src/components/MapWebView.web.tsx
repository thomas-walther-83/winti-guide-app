import React from 'react';
import { useTranslation } from '../hooks/useTranslation';

interface Props {
  html: string;
  loading?: boolean;
  onError?: (e: { nativeEvent: { description: string } }) => void;
}

export function MapWebView({ html }: Props) {
  const { t } = useTranslation();
  return (
    <iframe
      srcDoc={html}
      style={{
        flex: 1,
        border: 'none',
        width: '100%',
        height: '100%',
      }}
      title={t('map')}
      sandbox="allow-scripts allow-same-origin"
    />
  );
}
