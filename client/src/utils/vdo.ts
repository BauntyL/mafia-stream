export function buildVdoPushUrl(roomCode: string, streamId: string, quality = '720') {
  const params = new URLSearchParams({
    push: streamId,
    room: `mafia_${roomCode}`,
    quality,
    nopreview: 'false',
    hideheader: 'true',
    autostart: 'true',
    noaudio: 'false',
    videodevice: '0',
  });
  return `https://vdo.ninja/?${params.toString()}`;
}

export function buildVdoViewUrl(streamId: string, roomCode: string) {
  const params = new URLSearchParams({
    view: streamId,
    room: `mafia_${roomCode}`,
    muted: 'true',
    autoplay: 'true',
    cleanoutput: 'true',
    noaudio: 'true',
  });
  return `https://vdo.ninja/?${params.toString()}`;
}

export function generateStreamId(roomCode: string, playerId: string) {
  return `${roomCode}_${playerId.slice(-8)}`;
}

export function parseVdoUrl(url: string): { streamId: string | null; viewUrl: string } {
  try {
    const u = new URL(url);
    const streamId = u.searchParams.get('push') || u.searchParams.get('view');
    return { streamId, viewUrl: url };
  } catch {
    return { streamId: null, viewUrl: url };
  }
}
