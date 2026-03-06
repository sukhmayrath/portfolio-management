import Modal from './Modal';

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title = 'Confirm', message = 'Are you sure?' }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <p className="text-slate-600 mb-4">{message}</p>
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">
          Cancel
        </button>
        <button onClick={onConfirm} className="px-4 py-2 text-sm font-medium text-white bg-danger rounded-lg hover:bg-red-700">
          Delete
        </button>
      </div>
    </Modal>
  );
}
