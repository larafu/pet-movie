/**
 * Admin 页面通用加载状态
 * 点击导航后立即显示，提升用户体验
 */
export default function AdminLoading() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      <span className="ml-2 text-gray-500">Loading...</span>
    </div>
  );
}
