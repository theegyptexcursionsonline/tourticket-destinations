import { canRenderMapLibre, supportsWebGL2 } from '../webglSupport';

describe('WebGL support probes', () => {
  const realGetContext = HTMLCanvasElement.prototype.getContext;
  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = realGetContext;
  });

  function stubGetContext(impl: (kind: string) => unknown) {
    HTMLCanvasElement.prototype.getContext = jest.fn(impl) as unknown as typeof realGetContext;
  }

  it('is false when the browser cannot create any WebGL context', () => {
    stubGetContext(() => null);
    expect(supportsWebGL2()).toBe(false);
    expect(canRenderMapLibre()).toBe(false);
  });

  it('is false when asking for a context throws', () => {
    stubGetContext(() => { throw new Error('blocked'); });
    expect(supportsWebGL2()).toBe(false);
    expect(canRenderMapLibre()).toBe(false);
  });

  it('is true for a WebGL2 context and releases the probe context', () => {
    const loseContext = jest.fn();
    stubGetContext((kind) => (kind === 'webgl2' ? { getExtension: () => ({ loseContext }) } : null));
    expect(supportsWebGL2()).toBe(true);
    expect(loseContext).toHaveBeenCalledTimes(1);
  });

  it('asks only for WebGL2 in supportsWebGL2, never falling back to WebGL1', () => {
    const kinds: string[] = [];
    stubGetContext((kind) => { kinds.push(kind); return kind === 'webgl' ? { getExtension: () => null } : null; });
    expect(supportsWebGL2()).toBe(false);
    expect(kinds).toEqual(['webgl2']);
  });

  it('still allows the map on a WebGL1-only browser, which MapLibre 5 accepts', () => {
    const kinds: string[] = [];
    stubGetContext((kind) => { kinds.push(kind); return kind === 'webgl' ? { getExtension: () => null } : null; });
    expect(canRenderMapLibre()).toBe(true);
    expect(kinds).toEqual(['webgl2', 'webgl']);
  });
});
