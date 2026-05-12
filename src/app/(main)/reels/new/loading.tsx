export default function Loading() {
  return (
    <div>
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-800">
        <span className="text-gray-400">←</span>
        <h1 className="text-lg font-bold text-purple-100">릴스 추가</h1>
      </div>
      <div className="px-6 py-6 space-y-4">
        <div className="h-12 bg-gray-800 rounded-xl animate-pulse" />
        <div className="h-12 bg-gray-800 rounded-xl animate-pulse" />
        <div className="h-24 bg-gray-800 rounded-xl animate-pulse" />
        <div className="h-24 bg-gray-800 rounded-xl animate-pulse" />
        <div className="h-12 bg-gray-800 rounded-xl animate-pulse" />
      </div>
    </div>
  );
}
