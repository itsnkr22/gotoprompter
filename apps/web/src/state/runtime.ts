// Non-persisted runtime state (spec §2.4).
import { create } from 'zustand';

export type Phase = 'setup' | 'prompter';
export type VideoLayout = 'split' | 'overlay';
export type Facing = 'user' | 'environment';
export type ModalId =
  'browserUnsupported' | 'ipadPwaBlocked' | 'androidVideoLimit' | 'googleDocImport';
export type ToastId = 'langDetectionWarning' | 'swUpdate' | 'generic';

export interface Toast {
  id: ToastId;
  message: string;
  /** Epoch ms when the toast auto-hides; Infinity = sticky. */
  until: number;
  action?: { label: string; onClick: () => void };
}

export interface PrompterRuntime {
  phase: Phase;
  scriptText: string;
  listening: boolean;
  autoscrollRunning: boolean;
  isStarting: boolean;
  videoMode: boolean;
  videoLayout: VideoLayout;
  facingMode: Facing;
  recording: boolean;
  googleDocUrl: string | null;
  detectedLanguage: string | null;
  selectedLanguage: string;
  currentIndex: number;
  settingsOpen: boolean;
  openModal: ModalId | null;
  toasts: Toast[];
}

export interface RuntimeStore extends PrompterRuntime {
  setPhase(p: Phase): void;
  setScriptText(t: string): void;
  setListening(b: boolean): void;
  setAutoscrollRunning(b: boolean): void;
  setIsStarting(b: boolean): void;
  enterVideo(): void;
  exitVideo(): void;
  setVideoLayout(l: VideoLayout): void;
  setFacing(f: Facing): void;
  setRecording(b: boolean): void;
  setGoogleDocUrl(u: string | null): void;
  setLanguages(l: { detected: string | null; selected: string }): void;
  setCurrentIndex(i: number): void;
  toggleSettings(open?: boolean): void;
  openModalId(id: ModalId): void;
  closeModal(): void;
  showToast(id: ToastId, message: string, ms: number, action?: Toast['action']): void;
  dismissToast(id: ToastId): void;
  reset(): void;
}

const initial: PrompterRuntime = {
  phase: 'setup',
  scriptText: '',
  listening: false,
  autoscrollRunning: false,
  isStarting: false,
  videoMode: false,
  videoLayout: 'split',
  facingMode: 'user',
  recording: false,
  googleDocUrl: null,
  detectedLanguage: null,
  selectedLanguage: 'en-US',
  currentIndex: 0,
  settingsOpen: false,
  openModal: null,
  toasts: [],
};

export const useRuntimeStore = create<RuntimeStore>()((set, get) => ({
  ...initial,
  setPhase: (phase) => set({ phase }),
  setScriptText: (scriptText) => set({ scriptText }),
  setListening: (listening) => set({ listening }),
  setAutoscrollRunning: (autoscrollRunning) => set({ autoscrollRunning }),
  setIsStarting: (isStarting) => set({ isStarting }),
  enterVideo: () => set({ videoMode: true, videoLayout: 'split' }),
  exitVideo: () => set({ videoMode: false, recording: false }),
  setVideoLayout: (videoLayout) => set({ videoLayout }),
  setFacing: (facingMode) => set({ facingMode }),
  setRecording: (recording) => set({ recording }),
  setGoogleDocUrl: (googleDocUrl) => set({ googleDocUrl }),
  setLanguages: ({ detected, selected }) =>
    set({ detectedLanguage: detected, selectedLanguage: selected }),
  setCurrentIndex: (currentIndex) => set({ currentIndex }),
  toggleSettings: (open) => set({ settingsOpen: open ?? !get().settingsOpen }),
  openModalId: (openModal) => set({ openModal }),
  closeModal: () => set({ openModal: null }),
  showToast: (id, message, ms, action) =>
    set({
      toasts: [
        ...get().toasts.filter((t) => t.id !== id),
        {
          id,
          message,
          until: Number.isFinite(ms) ? Date.now() + ms : Infinity,
          ...(action ? { action } : {}),
        },
      ],
    }),
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  reset: () => set({ ...initial }),
}));
