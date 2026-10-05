export function applyViewportScale(pathname?: string): void {
  const path = pathname ?? location.pathname;
  let designWidth = 1280;
  let designHeight = 0;
  if (/^\/s\/[^/]+\/display(\/|$)/.test(path)) {
    designWidth = 0;
  } else if (/^\/s\/[^/]+\/input(\/|$)/.test(path)) {
    designWidth = 1180;
    designHeight = 820;
  } else if (/^\/s\/[^/]+\/admin(\/|$)/.test(path) || /^\/admin(\/(?!login)|$)/.test(path)) {
    designWidth = 1440;
  }

  const width = window.innerWidth;
  let zoom = 1;
  if (designWidth > 0 && width > designWidth) {
    zoom = width / designWidth;
    if (designHeight > 0) zoom = Math.min(zoom, window.innerHeight / designHeight);
    zoom = Math.max(1, Math.min(3, Math.round(zoom * 1000) / 1000));
  }

  const root = document.documentElement;
  root.style.zoom = zoom === 1 ? "" : String(zoom);
  root.style.setProperty("--zoom", String(zoom));
}
