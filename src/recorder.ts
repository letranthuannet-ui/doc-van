export const canRecord = typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

export async function startRecording(): Promise<() => Promise<Blob>> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const rec = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  rec.start();
  return () =>
    new Promise((resolve) => {
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        resolve(new Blob(chunks, { type: rec.mimeType.split(';')[0] || 'audio/webm' }));
      };
      rec.stop();
    });
}

export const extOf = (mime: string) => (mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : mime.includes('mpeg') ? 'mp3' : 'webm');
