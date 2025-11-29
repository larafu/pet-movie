/**
 * 页面加载状态 - 点击链接后立即显示
 * 这解决了 Next.js 路由跳转时的延迟问题
 */
export default function Loading() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      <span className="ml-2 text-gray-500">Loading Script Creator...</span>
    </div>
  );
}
