function getOrigin(value: string) {
  try {
    const url = new URL(value);

    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

export function preconnectToOrigin(value: string | undefined) {
  if (!value || typeof document === 'undefined') {
    return;
  }

  const origin = getOrigin(value);

  if (!origin || document.head.querySelector(`link[rel="preconnect"][href="${origin}"]`)) {
    return;
  }

  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = origin;
  link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
}
