"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CategoryOption } from "@/types";
import { createCategory, updateCategory, deleteCategory } from "@/lib/actions";

export function CategoryManager({ categories }: { categories: CategoryOption[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleCreate() {
    if (!newName.trim() || creating) return;
    setCreating(true);
    setError("");
    const result = await createCategory(newName.trim());
    if (result.error) {
      setError(result.error);
      setCreating(false);
      return;
    }
    setNewName("");
    setError("");
    setCreating(false);
    router.refresh();
  }

  function startEdit(id: string, name: string) {
    setEditingId(id);
    setEditName(name);
    setError("");
  }

  async function handleUpdate() {
    if (!editingId || saving) return;
    setSaving(true);
    setError("");
    const result = await updateCategory(editingId, editName);
    if (result.error) {
      setError(result.error);
      setSaving(false);
      return;
    }
    setEditingId(null);
    setError("");
    setSaving(false);
    router.refresh();
  }

  async function handleDelete(id: string, name: string) {
    if (deletingId) return;
    if (!confirm(`"${name}" 카테고리를 삭제하시겠습니까?\n이 카테고리의 콘텐츠는 미분류로 변경됩니다.`)) return;
    setDeletingId(id);
    setError("");
    const result = await deleteCategory(id);
    if (result.error) {
      setError(result.error);
      setDeletingId(null);
      return;
    }
    setDeletingId(null);
    setError("");
    router.refresh();
  }

  return (
    <div className="p-6 space-y-6">
      {/* 새 카테고리 추가 */}
      <div className="space-y-2">
        <label className="text-xs text-gray-400 font-semibold">새 카테고리 추가</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              if (error) setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            enterKeyHint="done"
            placeholder="카테고리명 입력..."
            className="flex-1 bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
          <button
            onClick={handleCreate}
            disabled={creating}
            className="bg-purple-600 px-4 py-3 rounded-xl text-sm font-semibold shrink-0"
          >
            {creating ? "추가 중..." : "추가"}
          </button>
        </div>
      </div>

      {/* 카테고리 목록 */}
      <div className="space-y-2">
        <label className="text-xs text-gray-400 font-semibold">
          카테고리 목록 ({categories.length}개)
        </label>
        {categories.length === 0 ? (
          <p className="text-gray-500 text-sm py-4 text-center">등록된 카테고리가 없습니다</p>
        ) : (
          <div className="space-y-2">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 flex items-center justify-between"
              >
                {editingId === cat.id ? (
                  <div className="flex gap-2 flex-1 items-center">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => {
                        setEditName(e.target.value);
                        if (error) setError("");
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
                      enterKeyHint="done"
                      className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-purple-500"
                      autoFocus
                    />
                    <button
                      onClick={handleUpdate}
                      disabled={saving}
                      className="text-purple-400 text-sm font-semibold"
                    >
                      {saving ? "저장 중..." : "저장"}
                    </button>
                    <button
                      onClick={() => { setEditingId(null); setError(""); }}
                      className="text-gray-500 text-sm"
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm text-gray-100">{cat.name}</span>
                    <div className="flex gap-3">
                      <button
                        onClick={() => startEdit(cat.id, cat.name)}
                        className="text-gray-400 hover:text-blue-400 text-sm"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id, cat.name)}
                        disabled={deletingId === cat.id}
                        className="text-gray-400 hover:text-red-400 text-sm"
                      >
                        {deletingId === cat.id ? "삭제 중..." : "삭제"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}
