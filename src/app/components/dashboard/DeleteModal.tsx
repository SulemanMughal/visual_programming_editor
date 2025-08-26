type PendingDelete = {
    name: string;
    // add other properties if needed
};

type DeleteModalProps = {
    pendingDelete?: PendingDelete;
    handleConfirmDelete: () => void;
    handleCancelDelete: () => void;
};

function DeleteModal({ pendingDelete, handleConfirmDelete, handleCancelDelete }: DeleteModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-neutral-900 rounded-lg shadow-lg p-6 min-w-[300px]">
            <div className="text-lg font-semibold mb-2 text-white">Confirm Delete</div>
            <div className="mb-4 text-neutral-300">Are you sure you want to delete <span className="font-bold">{pendingDelete?.name}</span>?</div>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-1 rounded bg-neutral-700 text-neutral-200 hover:bg-neutral-600"
                onClick={handleCancelDelete}
              >
                Cancel
              </button>
              <button
                className="px-4 py-1 rounded bg-red-700 text-white hover:bg-red-800"
                onClick={handleConfirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
    )
}

export default DeleteModal;