// Camera / microphone selectors (spec §9.12). Hidden on iOS.
import { useEffect, useState } from 'react';
import { isIOS } from '../platform';
import { useSettingsStore } from '../state/settings';
import type { DeviceKind, DeviceLists } from '../video/devices';
import { buildDeviceLists, refreshDevices } from '../video/devices';
import { handleDeviceChange } from '../video/video-mode';

const requested: Record<'video' | 'audio', boolean> = { video: false, audio: false };

const selectCls =
  'h-[38px] w-full min-w-[200px] appearance-none rounded border border-line bg-raised px-3 pr-8 text-sm text-fg focus:ring-2 focus:ring-accent focus:outline-none';

export function DeviceSelectors() {
  const videoId = useSettingsStore((s) => s.selectedVideoDeviceId);
  const audioId = useSettingsStore((s) => s.selectedAudioDeviceId);
  const set = useSettingsStore((s) => s.set);
  const [lists, setLists] = useState<DeviceLists>(() => buildDeviceLists([]));

  const refresh = async (perm: boolean, kind: DeviceKind = 'both'): Promise<void> => {
    const next = await refreshDevices(perm, kind);
    setLists(next);
    const s = useSettingsStore.getState();
    if (
      s.selectedVideoDeviceId &&
      !next.cameras.some((c) => c.deviceId === s.selectedVideoDeviceId)
    )
      set('selectedVideoDeviceId', null);
    if (
      s.selectedAudioDeviceId &&
      !next.microphones.some((m) => m.deviceId === s.selectedAudioDeviceId)
    )
      set('selectedAudioDeviceId', null);
  };

  useEffect(() => {
    if (isIOS()) return;
    void refresh(false);
    const md = navigator.mediaDevices;
    const onChange = (): void => void refresh(false);
    md?.addEventListener?.('devicechange', onChange);
    return () => md?.removeEventListener?.('devicechange', onChange);
  }, []);

  if (isIOS()) return <div id="devicesSelectionContainer" className="hidden" />;

  const lazyPermission = (kind: 'video' | 'audio'): void => {
    if (requested[kind]) return;
    const hasUnlabelled = (kind === 'video' ? lists.cameras : lists.microphones).some((d) =>
      /^(Camera|Microphone) \(/.test(d.label),
    );
    if (!hasUnlabelled && (kind === 'video' ? lists.cameras : lists.microphones).length > 0) return;
    requested[kind] = true;
    void refresh(true, kind);
  };

  const chevron = (
    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
      <svg
        className="h-4 w-4 text-muted"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );

  return (
    <div
      id="devicesSelectionContainer"
      className="mt-6 space-y-3 border-t border-b border-line pt-4 pb-4"
    >
      <div>
        <label htmlFor="videoDeviceSelect" className="mb-1.5 block text-xs font-medium text-muted">
          Camera Source
        </label>
        <div className="relative w-full">
          <select
            id="videoDeviceSelect"
            className={selectCls}
            value={videoId ?? ''}
            onFocus={() => lazyPermission('video')}
            onMouseDown={() => lazyPermission('video')}
            onChange={(e) => {
              set('selectedVideoDeviceId', e.target.value || null);
              void handleDeviceChange();
            }}
          >
            <option value="">{lists.cameraDefaultLabel}</option>
            {lists.cameras.map((c) => (
              <option key={c.deviceId} value={c.deviceId}>
                {c.label}
              </option>
            ))}
          </select>
          {chevron}
        </div>
      </div>
      <div>
        <label htmlFor="audioDeviceSelect" className="mb-1 block text-xs font-medium text-muted">
          Microphone Source
        </label>
        <div className="relative w-full">
          <select
            id="audioDeviceSelect"
            className={selectCls}
            value={audioId ?? ''}
            onFocus={() => lazyPermission('audio')}
            onMouseDown={() => lazyPermission('audio')}
            onChange={(e) => {
              set('selectedAudioDeviceId', e.target.value || null);
              void handleDeviceChange();
            }}
          >
            <option value="">{lists.micDefaultLabel}</option>
            {lists.microphones.map((m) => (
              <option key={m.deviceId} value={m.deviceId}>
                {m.label}
              </option>
            ))}
          </select>
          {chevron}
        </div>
        <span className="mt-1 block text-[10px] leading-normal text-muted">
          Used by Sound Scrolling and video recordings. Voice Scrolling uses your browser&apos;s
          default microphone.
        </span>
      </div>
    </div>
  );
}
