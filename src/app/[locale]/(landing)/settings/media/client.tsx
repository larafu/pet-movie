/**
 * MediaLibraryClient - 资源库客户端组件
 * 负责资源的展示、上传、删除等交互
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Loader2, Trash2, Image as ImageIcon, Video, X } from 'lucide-react';
import { toast } from 'sonner';

// 资源类型
interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  filename: string | null;
  fileSize: number | null;
  mimeType: string | null;
  createdAt: string;
}

// 多语言消息
interface Messages {
  tabs: {
    all: string;
    images: string;
    videos: string;
  };
  upload: {
    button: string;
    hint: string;
    success: string;
    failed: string;
  };
  empty: {
    title: string;
    description: string;
  };
  item: {
    delete: string;
    deleteConfirm: string;
    deleteSuccess: string;
    deleteFailed: string;
    size: string;
    uploaded: string;
  };
  loading: string;
  loadMore: string;
  noMore: string;
}

interface MediaLibraryClientProps {
  messages: Messages;
}

// 分页大小
const PAGE_SIZE = 20;

export function MediaLibraryClient({ messages }: MediaLibraryClientProps) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'image' | 'video'>('all');
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // 获取资源列表
  const fetchMedia = useCallback(
    async (isLoadMore = false) => {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const offset = isLoadMore ? items.length : 0;
        const typeParam = activeTab === 'all' ? '' : `&type=${activeTab}`;
        const response = await fetch(
          `/api/user-media?limit=${PAGE_SIZE}&offset=${offset}${typeParam}`
        );
        const result = await response.json();

        if (result.code === 0) {
          const newItems = result.data.items || [];
          if (isLoadMore) {
            setItems((prev) => [...prev, ...newItems]);
          } else {
            setItems(newItems);
          }
          setHasMore(newItems.length >= PAGE_SIZE);
        } else {
          toast.error(result.message || 'Failed to load');
        }
      } catch (e) {
        console.error('Fetch media error:', e);
        toast.error('Failed to load');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [activeTab, items.length]
  );

  // 初始加载和 tab 切换
  useEffect(() => {
    fetchMedia(false);
  }, [activeTab]);

  // 滚动加载
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !loading && !loadingMore) {
          fetchMedia(true);
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasMore, loading, loadingMore, fetchMedia]);

  // 上传文件
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch('/api/user-media', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.code === 0) {
        toast.success(messages.upload.success);
        // 刷新列表
        fetchMedia(false);
      } else {
        toast.error(result.message || messages.upload.failed);
      }
    } catch (e) {
      console.error('Upload error:', e);
      toast.error(messages.upload.failed);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 删除资源
  const handleDelete = async (id: string) => {
    if (!confirm(messages.item.deleteConfirm)) return;

    setDeleting(id);

    try {
      const response = await fetch(`/api/user-media/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.code === 0) {
        toast.success(messages.item.deleteSuccess);
        setItems((prev) => prev.filter((item) => item.id !== id));
      } else {
        toast.error(result.message || messages.item.deleteFailed);
      }
    } catch (e) {
      console.error('Delete error:', e);
      toast.error(messages.item.deleteFailed);
    } finally {
      setDeleting(null);
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* 工具栏 */}
      <div className="flex items-center justify-between gap-4">
        {/* Tab 切换 */}
        <div className="flex gap-2">
          {(['all', 'image', 'video'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {tab === 'all'
                ? messages.tabs.all
                : tab === 'image'
                  ? messages.tabs.images
                  : messages.tabs.videos}
            </button>
          ))}
        </div>

        {/* 上传按钮 */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
            multiple
            className="hidden"
            onChange={handleUpload}
          />
          <button
            onClick={() => !uploading && fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            <span>{messages.upload.button}</span>
          </button>
        </div>
      </div>

      {/* 提示文字 */}
      <p className="text-sm text-muted-foreground">{messages.upload.hint}</p>

      {/* 资源列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">{messages.loading}</span>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
            <ImageIcon className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">{messages.empty.title}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {messages.empty.description}
          </p>
        </div>
      ) : (
        <>
          {/* 网格布局 */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="group relative aspect-square bg-secondary rounded-lg overflow-hidden"
              >
                {/* 媒体预览 */}
                {item.type === 'image' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.url}
                    alt={item.filename || 'Image'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={item.url}
                    className="w-full h-full object-cover"
                    muted
                    onMouseEnter={(e) => e.currentTarget.play()}
                    onMouseLeave={(e) => {
                      e.currentTarget.pause();
                      e.currentTarget.currentTime = 0;
                    }}
                  />
                )}

                {/* 类型标识 */}
                <div className="absolute top-2 left-2">
                  <div className="bg-black/50 backdrop-blur-sm rounded-full p-1.5">
                    {item.type === 'image' ? (
                      <ImageIcon className="w-3 h-3 text-white" />
                    ) : (
                      <Video className="w-3 h-3 text-white" />
                    )}
                  </div>
                </div>

                {/* Hover 操作 */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                  {/* 删除按钮 */}
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deleting === item.id}
                      className="p-2 bg-red-500 hover:bg-red-600 rounded-full transition-colors disabled:opacity-50"
                      title={messages.item.delete}
                    >
                      {deleting === item.id ? (
                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 text-white" />
                      )}
                    </button>
                  </div>

                  {/* 文件信息 */}
                  <div className="text-white text-xs space-y-1">
                    <div className="truncate" title={item.filename || undefined}>
                      {item.filename || '-'}
                    </div>
                    <div className="flex justify-between">
                      <span>{formatFileSize(item.fileSize)}</span>
                      <span>{formatDate(item.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 加载更多触发器 */}
          <div
            ref={loadMoreRef}
            className="flex items-center justify-center py-8"
          >
            {loadingMore && (
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {messages.loading}
                </span>
              </div>
            )}
            {!hasMore && items.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {messages.noMore}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
