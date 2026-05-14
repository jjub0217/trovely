"use client";

export function DeleteDialog({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-6">
      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-xs">
        <h3 className="text-base font-semibold mb-2">콘텐츠 삭제</h3>
        <p className="text-sm text-gray-400 mb-6">이 콘텐츠를 삭제하시겠습니까?</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 bg-gray-700 py-2.5 rounded-xl text-sm">취소</button>
          <button onClick={onConfirm} className="flex-1 bg-red-600 py-2.5 rounded-xl text-sm">삭제</button>
        </div>
      </div>
    </div>
  );
}
