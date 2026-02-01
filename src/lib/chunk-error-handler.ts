/**
 * Chunk Loading Error Handler
 * Handles Next.js chunk loading failures by automatically reloading the page
 * when webpack chunks fail to load (typically after deployments)
 */

let isReloading = false;

export function setupChunkErrorHandler() {
  if (typeof window === 'undefined') return;

  window.addEventListener('error', (event) => {
    const isChunkError = 
      event.message?.includes('Loading chunk') ||
      event.message?.includes('ChunkLoadError') ||
      (event.error?.name === 'ChunkLoadError');

    if (isChunkError && !isReloading) {
      isReloading = true;
      console.warn('Chunk loading failed, reloading page...');
      window.location.reload();
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const isChunkError = 
      event.reason?.name === 'ChunkLoadError' ||
      event.reason?.message?.includes('Loading chunk') ||
      String(event.reason).includes('Loading chunk');

    if (isChunkError && !isReloading) {
      isReloading = true;
      console.warn('Chunk loading failed (unhandled rejection), reloading page...');
      event.preventDefault();
      window.location.reload();
    }
  });
}
