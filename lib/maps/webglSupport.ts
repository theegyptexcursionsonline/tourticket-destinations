/**
 * MapLibre renders only through WebGL. On a browser or device that cannot give
 * it a context the map is useless, so check first and let the page show its
 * designed fallback instead of an endless "Loading route map…".
 *
 * MapLibre 5 asks for `webgl2` and falls back to `webgl`; MapLibre 6 requires
 * `webgl2` outright. `canRenderMapLibre()` mirrors what the installed major
 * actually accepts, so a WebGL1-only browser is never refused a map it could
 * still render. `supportsWebGL2()` is kept separate for the eventual upgrade.
 */
export function supportsWebGL2(): boolean {
  return hasContext('webgl2');
}

/** True when the browser can give MapLibre a rendering context of any kind it accepts. */
export function canRenderMapLibre(): boolean {
  return supportsWebGL2() || hasContext('webgl');
}

function hasContext(kind: 'webgl2' | 'webgl'): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext(kind) as WebGLRenderingContext | WebGL2RenderingContext | null;
    if (!context) return false;
    context.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}
