// Renders the active modal and the toast stack from runtime state (spec §13).
import { useRuntimeStore } from '../state/runtime';
import { GoogleDocImportModal } from './GoogleDocImportModal';
import { Modal } from './Modal';
import { Toast } from './Toast';
import { COPY } from './copy';

const button =
  'mt-4 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-contrast hover:bg-accent-strong';

export function Modals() {
  const openModal = useRuntimeStore((r) => r.openModal);
  const closeModal = useRuntimeStore((r) => r.closeModal);
  const toasts = useRuntimeStore((r) => r.toasts);
  const dismissToast = useRuntimeStore((r) => r.dismissToast);

  let modal: React.ReactNode = null;
  if (openModal === 'browserUnsupported') {
    modal = (
      <Modal id="browserUnsupported" title={COPY.browserUnsupported.title} onClose={closeModal}>
        <p className="text-sm leading-relaxed text-fg/90">{COPY.browserUnsupported.body}</p>
        <button type="button" className={button} onClick={closeModal}>
          {COPY.browserUnsupported.button}
        </button>
      </Modal>
    );
  } else if (openModal === 'ipadPwaBlocked') {
    modal = (
      <Modal id="ipadPwaBlocked" title={COPY.ipadPwaBlocked.title} onClose={closeModal}>
        <p className="text-sm leading-relaxed text-fg/90">{COPY.ipadPwaBlocked.body}</p>
        <button type="button" className={button} onClick={closeModal}>
          {COPY.ipadPwaBlocked.button}
        </button>
      </Modal>
    );
  } else if (openModal === 'androidVideoLimit') {
    modal = (
      <Modal id="androidVideoLimit" title={COPY.androidVideoLimit.title} onClose={closeModal}>
        <p className="text-sm leading-relaxed text-fg/90">{COPY.androidVideoLimit.body}</p>
        <button type="button" className={button} onClick={closeModal}>
          {COPY.androidVideoLimit.button}
        </button>
      </Modal>
    );
  } else if (openModal === 'googleDocImport') {
    modal = <GoogleDocImportModal />;
  }

  return (
    <>
      {modal}
      {toasts.length > 0 ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[10001] flex flex-col items-center gap-2">
          {toasts.map((t) => (
            <Toast key={t.id} toast={t} onDismiss={() => dismissToast(t.id)} />
          ))}
        </div>
      ) : null}
    </>
  );
}
