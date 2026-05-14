"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TagOption } from "@/types";
import { createTag, updateTag, deleteTag } from "@/lib/actions";
import { normalizeTagName } from "@/lib/tag-name";

export function TagManager({ tags }: { tags: TagOption[] }) {
  const [items, setItems] = useState<TagOption[]>(tags);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [newName, setNewName] = useState("");
  const [search, setSearch] = useState("");
  const [createError, setCreateError] = useState("");
  const [error, setError] = useState("");
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    setItems(tags);
  }, [tags]);

  useEffect(() => {
    if (!highlightedId) return;

    const timeout = window.setTimeout(() => {
      setHighlightedId(null);
    }, 2000);

    itemRefs.current[highlightedId]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });

    return () => window.clearTimeout(timeout);
  }, [highlightedId]);

  const filteredTags = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return items;
    return items.filter((tag) => tag.name.includes(keyword));
  }, [items, search]);

  async function handleCreate() {
    const normalized = normalizeTagName(newName);
    if (!normalized) return;

    if (items.some((tag) => tag.name === normalized)) {
      setCreateError("이미 추가된 태그입니다");
      return;
    }

    setCreateError("");
    setError("");
    const result = await createTag(normalized);
    if (result.error) {
      setCreateError(result.error);
      return;
    }

    const createdTag = result.tag as TagOption;
    setItems((prev) => [createdTag, ...prev.filter((tag) => tag.id !== createdTag.id)]);
    setHighlightedId(createdTag.id);
    setNewName("");
  }

  function startEdit(id: string, name: string) {
    setEditingId(id);
    setEditName(name);
    setError("");
    setCreateError("");
  }

  async function handleUpdate() {
    if (!editingId) return;

    setError("");
    const result = await updateTag(editingId, editName);
    if (result.error) {
      setError(result.error);
      return;
    }

    const normalized = normalizeTagName(editName);
    setItems((prev) =>
      prev.map((tag) =>
        tag.id === editingId
          ? {
              ...tag,
              name: normalized,
            }
          : tag
      )
    );
    setHighlightedId(editingId);
    setEditingId(null);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}" 태그를 삭제하시겠습니까?\n이 태그가 연결된 콘텐츠에서는 태그만 제거됩니다.`)) return;

    const result = await deleteTag(id);
    if (result.error) {
      setError(result.error);
      return;
    }

    setItems((prev) => prev.filter((tag) => tag.id !== id));
  }

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <label className="text-xs text-gray-400 font-semibold">태그 검색</label>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="태그명으로 검색..."
          className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs text-gray-400 font-semibold">새 태그 추가</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              if (createError) setCreateError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            enterKeyHint="done"
            placeholder="태그명 입력..."
            className="flex-1 bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
          <button
            onClick={handleCreate}
            className="bg-purple-600 px-4 py-3 rounded-xl text-sm font-semibold shrink-0"
          >
            추가
          </button>
        </div>
        <p className="text-xs text-gray-500">
          태그는 소문자 기준으로 저장되며, 공백은 자동으로 정리됩니다.
        </p>
        {createError && <p className="text-red-400 text-sm">{createError}</p>}
      </div>

      <div className="space-y-2">
        <label className="text-xs text-gray-400 font-semibold">
          태그 목록 ({filteredTags.length}개)
        </label>
        {items.length === 0 ? (
          <p className="text-gray-500 text-sm py-4 text-center">등록된 태그가 없습니다</p>
        ) : filteredTags.length === 0 ? (
          <p className="text-gray-500 text-sm py-4 text-center">검색 결과가 없습니다</p>
        ) : (
          <div className="space-y-2">
            {filteredTags.map((tag) => (
              <div
                key={tag.id}
                ref={(node) => {
                  itemRefs.current[tag.id] = node;
                }}
                className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 flex items-center justify-between gap-3"
                data-highlighted={highlightedId === tag.id}
                style={{
                  borderColor: highlightedId === tag.id ? "rgb(168 85 247 / 0.8)" : undefined,
                  boxShadow:
                    highlightedId === tag.id
                      ? "0 0 0 1px rgb(168 85 247 / 0.25)"
                      : undefined,
                }}
              >
                {editingId === tag.id ? (
                  <div className="flex gap-2 flex-1 items-center">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
                      enterKeyHint="done"
                      className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-purple-500"
                      autoFocus
                    />
                    <button
                      onClick={handleUpdate}
                      className="text-purple-400 text-sm font-semibold"
                    >
                      저장
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setError("");
                      }}
                      className="text-gray-500 text-sm"
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="min-w-0">
                      <p className="text-sm text-gray-100 break-all">#{tag.name}</p>
                    </div>
                    <div className="flex gap-3 shrink-0">
                      <button
                        onClick={() => startEdit(tag.id, tag.name)}
                        className="text-gray-400 hover:text-blue-400 text-sm"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(tag.id, tag.name)}
                        className="text-gray-400 hover:text-red-400 text-sm"
                      >
                        삭제
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
