export function GoogleG({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

// Simplified stand-in for the Google Meet icon. Swap in Google's official asset before launch.
export function MeetIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 40" aria-hidden="true">
      <rect x="4" y="6" width="26" height="9" rx="3" fill="#EA4335" />
      <rect x="4" y="15" width="8" height="11" fill="#FFBA00" />
      <rect x="4" y="26" width="26" height="9" rx="3" fill="#2684FC" />
      <rect x="22" y="15" width="8" height="11" fill="#00AC47" />
      <path d="M32 17l12-8v22l-12-8z" fill="#00AC47" />
    </svg>
  );
}

export function AppMark({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label="GenMeet">
      <rect width="120" height="120" rx="30" fill="#2457F5" />
      <rect x="16" y="30" width="64" height="48" rx="16" fill="#fff" />
      <path d="M30 76L28 95L50 78Z" fill="#fff" />
      <path d="M82 48L102 36Q106 34 106 39V69Q106 74 102 72L82 60Z" fill="#fff" />
      <path d="M48 44C42 40 34 40 30 41V66C34 65 42 65 48 69C54 65 62 65 66 66V41C62 40 54 40 48 44Z" fill="#2457F5" />
      <path d="M48 45V68" stroke="#fff" strokeWidth="2.5" />
    </svg>
  );
}
