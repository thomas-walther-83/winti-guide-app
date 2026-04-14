import React from 'react';

interface Props {
  html: string;
  loading?: boolean;
  onError?: (e: { nativeEvent: { description: string } }) => void;
}

export function MapWebView({ html }: Props) {
  return (
    <iframe
      srcDoc={html}
      style={{
        flex: 1,
        border: 'none',
        width: '100%',
        height: '100%',
      }}
      title="Karte"
      sandbox="allow-scripts allow-same-origin"
    />
  );
}
