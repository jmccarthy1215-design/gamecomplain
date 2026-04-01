(function () {
  // Prefer manually injected window.NEXT_PUBLIC_API_URL (set inline before this script)
  var envUrl =
    (typeof window !== 'undefined' && window.NEXT_PUBLIC_API_URL) || null;

  // Fallback: hardcoded production backend on Render
  var fallbackUrl = 'https://gamecomplain.onrender.com';

  window.API_URL = envUrl || fallbackUrl;

  // Google OAuth Client ID — set window.NEXT_PUBLIC_GOOGLE_CLIENT_ID before this script
  window.GOOGLE_CLIENT_ID =
    (typeof window !== 'undefined' && window.NEXT_PUBLIC_GOOGLE_CLIENT_ID) || '';

  console.log('API_URL:', window.API_URL);
}());
