/**
 * PlatformBackdrop — atmospheric depth foundation for Anna.
 *
 * Renders the 4-layer depth system: paper noise (fixed) + 4 page-scale meshes
 * (fixed, breathing on independent cycles). Mount as the first child of the
 * page <main> wrapper. Subsequent content must use `relative z-10` to sit
 * above the decorative layers.
 */
export function PlatformBackdrop() {
  return (
    <>
      <div className="anna-paper-texture" aria-hidden />
      <div className="anna-mesh--page-tl" aria-hidden />
      <div className="anna-mesh--page-tr" aria-hidden />
      <div className="anna-mesh--page-mid" aria-hidden />
      <div className="anna-mesh--page-bl" aria-hidden />
    </>
  );
}
