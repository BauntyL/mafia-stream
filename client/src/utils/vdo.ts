const VDO = 'https://vdo.ninja/';

/** Ссылка, которую игрок открывает у себя, чтобы отдать картинку с камеры. */
export function buildVdoPushUrl(roomCode: string, streamId: string, quality = '720') {
  const params = new URLSearchParams({
    push: streamId,
    room: `mafia_${roomCode}`,
    quality,
    hideheader: 'true',
    autostart: 'true',
    videodevice: '0',
  });
  return `${VDO}?${params.toString()}`;
}

/**
 * Ссылка для просмотра камеры в оверлее OBS.
 * cleanoutput + solo убирают весь интерфейс VDO.Ninja: остаётся только картинка.
 */
export function buildVdoViewUrl(streamId: string, roomCode: string) {
  const params = new URLSearchParams({
    view: streamId,
    room: `mafia_${roomCode}`,
    cleanoutput: '1',
    solo: '1',
    cover: '1',
    noaudio: '1',
    muted: '1',
    autostart: '1',
    hidemenu: '1',
    nocursor: '1',
    novideosettings: '1',
    chatbutton: '0',
    screensharebutton: '0',
    settingsbutton: '0',
    fullscreenbutton: '0',
  });
  return `${VDO}?${params.toString()}`;
}

/** Прячет интерфейс VDO.Ninja в уже готовой ссылке (в том числе вставленной вручную). */
export function toCleanViewUrl(url: string): string {
  try {
    const u = new URL(url);
    if (!/vdo\.ninja$/i.test(u.hostname)) return url;
    const forced: Record<string, string> = {
      cleanoutput: '1',
      solo: '1',
      cover: '1',
      noaudio: '1',
      muted: '1',
      autostart: '1',
      hidemenu: '1',
      nocursor: '1',
      novideosettings: '1',
      chatbutton: '0',
      screensharebutton: '0',
      settingsbutton: '0',
      fullscreenbutton: '0',
    };
    // push-ссылку превращаем во view-ссылку
    const push = u.searchParams.get('push');
    if (push && !u.searchParams.get('view')) {
      u.searchParams.delete('push');
      u.searchParams.set('view', push);
    }
    Object.entries(forced).forEach(([k, v]) => u.searchParams.set(k, v));
    ['nopreview', 'hideheader', 'videodevice', 'quality'].forEach((k) =>
      u.searchParams.delete(k),
    );
    return u.toString();
  } catch {
    return url;
  }
}

export function generateStreamId(roomCode: string, playerId: string) {
  return `${roomCode}_${playerId.slice(-8)}`;
}

export function parseVdoUrl(url: string): { streamId: string | null; viewUrl: string } {
  try {
    const u = new URL(url);
    const streamId = u.searchParams.get('push') || u.searchParams.get('view');
    return { streamId, viewUrl: toCleanViewUrl(url) };
  } catch {
    return { streamId: null, viewUrl: url };
  }
}
