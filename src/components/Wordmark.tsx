import { Link } from 'react-router-dom'

export function LogoMark({ size = 34, dark = false }: { size?: number; dark?: boolean }) {
  const bg = dark ? '#F7F2E8' : '#151513'
  const fg = dark ? '#151513' : '#F7F2E8'
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="CONEXUs logo">
      <rect width="64" height="64" rx="16" fill={bg} />
      <path d="M18 18 L46 46 M46 18 L18 46" stroke="#B69A62" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="32" cy="32" r="5.5" fill={fg} />
      <circle cx="18" cy="18" r="3" fill="#D3BC8A" />
      <circle cx="46" cy="18" r="3" fill="#D3BC8A" />
      <circle cx="18" cy="46" r="3" fill="#D3BC8A" />
      <circle cx="46" cy="46" r="3" fill="#D3BC8A" />
    </svg>
  )
}

export function Wordmark({ to = '/', light = false, size = 'md' }: { to?: string; light?: boolean; size?: 'sm' | 'md' | 'lg' }) {
  const text = size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-lg' : 'text-2xl'
  return (
    <Link to={to} className="inline-flex items-center gap-3" aria-label="CONEXUs home">
      <LogoMark size={size === 'lg' ? 44 : size === 'sm' ? 28 : 36} dark={light} />
      <span className={`font-display ${text} leading-none tracking-[0.04em] ${light ? 'text-ivory' : 'text-ink'}`}>
        CONE<span className="text-gold">X</span>US
      </span>
    </Link>
  )
}
