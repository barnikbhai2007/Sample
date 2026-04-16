export const getClientData = async () => {
  let ip = 'unknown';
  let country = 'unknown';
  
  const fetchIP = async (url: string) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      return await res.json();
    } catch (e) {
      clearTimeout(timeoutId);
      throw e;
    }
  };

  try {
    // Primary: ipapi.co (includes country)
    const data = await fetchIP('https://ipapi.co/json/');
    ip = data.ip || 'unknown';
    country = data.country_name || 'unknown';
  } catch (e) {
    console.warn('Primary IP service failed, trying fallback 1...');
    try {
      // Fallback 1: ipify (IPv4/IPv6)
      const data = await fetchIP('https://api64.ipify.org?format=json');
      ip = data.ip || 'unknown';
    } catch (e2) {
      console.warn('Fallback 1 failed, trying fallback 2...');
      try {
        // Fallback 2: icanhazip
        const res = await fetch('https://icanhazip.com');
        ip = (await res.text()).trim();
      } catch (e3) {
        console.error('All IP services failed', e3);
      }
    }
  }

  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    navigator.platform,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    (navigator as any).hardwareConcurrency || 'unknown',
    (navigator as any).deviceMemory || 'unknown'
  ].join('|');

  // Simple but robust hash for fingerprint
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const fpId = Math.abs(hash).toString(36);
  console.log('Client Data Generated:', { ip, country, fpId });

  return { ip, country, fingerprint, fpId };
};
