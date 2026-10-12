import React, { useState } from 'react';
import { Copy, Check, ExternalLink, QrCode } from 'lucide-react';

interface QRCodeDisplayProps {
  url: string;
  size?: number;
  title?: string;
  subtitle?: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  url,
  size = 200,
  title = 'Scan to Join Session',
  subtitle = 'Point camera at QR code to enter queue immediately',
}) => {
  const [copied, setCopied] = useState(false);

  const qrSvgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
    url
  )}&bgcolor=FFFFFF&color=0F172A&margin=8`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="flex flex-col items-center clay-card p-6 rounded-3xl text-center max-w-sm mx-auto">
      <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-3 clay-subcard">
        <QrCode className="w-6 h-6 text-emerald-700" />
      </div>

      <h3 className="text-lg font-black text-slate-900 tracking-tight">{title}</h3>
      <p className="text-xs text-slate-500 mt-1 mb-4 font-medium">{subtitle}</p>

      {/* QR Code Container */}
      <div
        className="p-3 bg-white rounded-2xl clay-subcard flex items-center justify-center border-2 border-emerald-100"
        style={{ width: size + 24, height: size + 24 }}
      >
        <img
          src={qrSvgUrl}
          alt="Session QR Code"
          width={size}
          height={size}
          className="rounded-xl object-contain"
          loading="eager"
        />
      </div>

      {/* URL Link and Copy Action */}
      <div className="mt-4 w-full flex items-center gap-2 clay-inset p-2 rounded-2xl text-xs text-slate-700">
        <span className="truncate flex-1 font-mono text-left select-all px-1 font-bold">{url}</span>
        <button
          onClick={handleCopy}
          type="button"
          className="px-2.5 py-1.5 rounded-xl clay-btn clay-btn-secondary text-slate-700 flex items-center gap-1 font-bold shrink-0"
          title="Copy Link"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          <span className="text-[11px]">{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3.5 text-xs text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5 font-bold"
      >
        <span>Open Player Link Directly</span>
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
};
