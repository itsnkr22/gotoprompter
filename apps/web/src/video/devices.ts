// Camera / microphone enumeration and labelling (spec §9.12).
export interface DeviceOption {
  deviceId: string;
  label: string;
}

export interface DeviceLists {
  cameras: DeviceOption[];
  microphones: DeviceOption[];
  cameraDefaultLabel: string;
  micDefaultLabel: string;
}

export type DeviceKind = 'video' | 'audio' | 'both';

export function shortId(id: string): string {
  return `${id.slice(0, 5)}…`;
}

export function stripDefaultPrefix(label: string): string {
  return label.startsWith('Default - ') ? label.slice('Default - '.length) : label;
}

/** Pure labelling step, exported for tests. */
export function buildDeviceLists(devices: readonly MediaDeviceInfo[]): DeviceLists {
  const cams = devices.filter((d) => d.kind === 'videoinput' && d.deviceId);
  const mics = devices.filter((d) => d.kind === 'audioinput' && d.deviceId);
  const firstCamera = cams.find((d) => d.label);
  const defaultMic =
    mics.find((d) => d.deviceId === 'default' && d.label) ?? mics.find((d) => d.label);
  const micLabel = defaultMic ? stripDefaultPrefix(defaultMic.label) : '';
  return {
    cameras: cams.map((d) => ({
      deviceId: d.deviceId,
      label: d.label || `Camera (${shortId(d.deviceId)})`,
    })),
    microphones: mics.map((d) => ({
      deviceId: d.deviceId,
      label: d.label || `Microphone (${shortId(d.deviceId)})`,
    })),
    cameraDefaultLabel: firstCamera ? `Default Camera (${firstCamera.label})` : 'Default Camera',
    micDefaultLabel: micLabel ? `Default Microphone (${micLabel})` : 'Default Microphone',
  };
}

/** Enumerate devices, optionally requesting permission once so labels become available. */
export async function refreshDevices(
  requestPermissionIfNeeded: boolean,
  kind: DeviceKind = 'both',
): Promise<DeviceLists> {
  const md = navigator.mediaDevices;
  if (!md?.enumerateDevices) return buildDeviceLists([]);
  let devices = await md.enumerateDevices();
  const unlabelled = devices.some(
    (d) =>
      !d.label &&
      ((kind !== 'audio' && d.kind === 'videoinput') ||
        (kind !== 'video' && d.kind === 'audioinput')),
  );
  if (unlabelled && requestPermissionIfNeeded) {
    try {
      const constraints: MediaStreamConstraints = {};
      if (kind !== 'audio') constraints.video = true;
      if (kind !== 'video') constraints.audio = true;
      const tmp = await md.getUserMedia(constraints);
      tmp.getTracks().forEach((t) => t.stop());
      devices = await md.enumerateDevices();
    } catch {
      /* permission refused: keep unlabelled devices */
    }
  }
  return buildDeviceLists(devices);
}
