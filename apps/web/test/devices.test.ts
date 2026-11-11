import { describe, expect, it, vi } from 'vitest';
import { buildDeviceLists, refreshDevices, stripDefaultPrefix } from '../src/video/devices';

const dev = (kind: MediaDeviceKind, deviceId: string, label: string): MediaDeviceInfo =>
  ({ kind, deviceId, label, groupId: 'g', toJSON: () => ({}) }) as MediaDeviceInfo;

describe('device labelling', () => {
  it('formats default labels and strips "Default - "', () => {
    expect(stripDefaultPrefix('Default - MacBook Mic')).toBe('MacBook Mic');
    const lists = buildDeviceLists([
      dev('videoinput', 'cam1', 'FaceTime HD'),
      dev('audioinput', 'default', 'Default - MacBook Pro Microphone'),
      dev('audioinput', 'mic2', 'USB Mic'),
      dev('audiooutput', 'spk', 'Speakers'),
    ]);
    expect(lists.cameraDefaultLabel).toBe('Default Camera (FaceTime HD)');
    expect(lists.micDefaultLabel).toBe('Default Microphone (MacBook Pro Microphone)');
    expect(lists.cameras).toHaveLength(1);
    expect(lists.microphones).toHaveLength(2);
  });

  it('falls back to generic labels before permission', () => {
    const lists = buildDeviceLists([
      dev('videoinput', 'abcdefgh', ''),
      dev('audioinput', 'zyxwvuts', ''),
    ]);
    expect(lists.cameraDefaultLabel).toBe('Default Camera');
    expect(lists.micDefaultLabel).toBe('Default Microphone');
    expect(lists.cameras[0]!.label).toBe('Camera (abcde…)');
    expect(lists.microphones[0]!.label).toBe('Microphone (zyxwv…)');
  });

  it('requests permission once to obtain labels and stops the tracks', async () => {
    const stop = vi.fn();
    const enumerate = vi
      .fn()
      .mockResolvedValueOnce([dev('audioinput', 'm', '')])
      .mockResolvedValueOnce([dev('audioinput', 'm', 'Built-in')])
      .mockResolvedValue([dev('audioinput', 'm', 'Built-in')]);
    const getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { enumerateDevices: enumerate, getUserMedia },
    });
    const lists = await refreshDevices(true, 'audio');
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(stop).toHaveBeenCalled();
    expect(lists.micDefaultLabel).toBe('Default Microphone (Built-in)');
    await refreshDevices(false, 'audio');
    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });
});
