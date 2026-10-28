import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/** QR code drawn in the browser (no third-party image service), so it shows even on a flaky venue network. */
export const QrImage: React.FC<{ value: string; className?: string; label?: string }> = ({ value, className, label = 'Mã QR' }) => {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(value, { margin: 1, width: 480, errorCorrectionLevel: 'M' })
      .then((url) => alive && setSrc(url))
      .catch(() => alive && setSrc(''));
    return () => {
      alive = false;
    };
  }, [value]);
  return src ? <img src={src} alt={label} className={className} /> : <span className={`block bg-white ${className ?? ''}`} />;
};
