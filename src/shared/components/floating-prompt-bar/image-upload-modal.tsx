/**
 * 图片上传模态框
 * 支持上传和从资源库选择图片
 * 图片会上传到存储服务获取真实 HTTPS URL
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Upload, Loader2, FolderOpen, Image as ImageIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

// 资源库图片类型
interface LibraryImage {
  id: string;
  url: string;
  filename: string | null;
}

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedImages: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
}

export function ImageUploadModal({
  isOpen,
  onClose,
  selectedImages,
  onImagesChange,
  maxImages = 10,
}: ImageUploadModalProps) {
  const t = useTranslations('dashboard.promptBar.imageUpload');
  const [localSelected, setLocalSelected] = useState<string[]>(selectedImages);
  const [activeTab, setActiveTab] = useState<'upload' | 'library'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // 资源库状态
  const [libraryImages, setLibraryImages] = useState<LibraryImage[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryLoaded, setLibraryLoaded] = useState(false);

  useEffect(() => {
    setLocalSelected(selectedImages);
  }, [selectedImages]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, onClose]);

  // 获取资源库图片
  const fetchLibraryImages = useCallback(async () => {
    if (libraryLoaded) return;

    setLibraryLoading(true);
    try {
      const response = await fetch('/api/user-media?type=image&limit=50');
      const result = await response.json();

      if (result.code === 0) {
        setLibraryImages(result.data.items || []);
        setLibraryLoaded(true);
      }
    } catch (error) {
      console.error('Fetch library images error:', error);
    } finally {
      setLibraryLoading(false);
    }
  }, [libraryLoaded]);

  // 切换到资源库 tab 时加载数据
  useEffect(() => {
    if (activeTab === 'library' && !libraryLoaded && !libraryLoading) {
      fetchLibraryImages();
    }
  }, [activeTab, libraryLoaded, libraryLoading, fetchLibraryImages]);

  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // 检查是否超过最大数量
    const remainingSlots = maxImages - localSelected.length;
    if (remainingSlots <= 0) {
      toast.error(t('maxReached') || 'Maximum images reached');
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    setIsUploading(true);

    try {
      // 上传到用户资源库（同时保存到数据库）
      const formData = new FormData();
      filesToUpload.forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch('/api/user-media', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.code === 0 && result.data?.urls) {
        const newUrls = result.data.urls as string[];
        const updated = [...localSelected, ...newUrls];
        setLocalSelected(updated);
        onImagesChange(updated);
        // 刷新资源库列表
        setLibraryLoaded(false);
      } else {
        toast.error(result.message || t('uploadFailed'));
      }
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error(t('uploadFailed'));
    } finally {
      setIsUploading(false);
      // 清空 input 以允许重复选择相同文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 从资源库选择/取消选择图片
  const toggleLibraryImage = (url: string) => {
    if (localSelected.includes(url)) {
      const updated = localSelected.filter((s) => s !== url);
      setLocalSelected(updated);
      onImagesChange(updated);
    } else if (localSelected.length < maxImages) {
      const updated = [...localSelected, url];
      setLocalSelected(updated);
      onImagesChange(updated);
    } else {
      toast.error(t('maxReached') || 'Maximum images reached');
    }
  };

  // 移除已选择的图片
  const removeSelectedImage = (url: string) => {
    const updated = localSelected.filter((s) => s !== url);
    setLocalSelected(updated);
    onImagesChange(updated);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        ref={modalRef}
        className="relative w-[90%] max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2 flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('title')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {localSelected.length}/{maxImages} {t('selected')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'upload'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <Upload className="w-4 h-4" />
              {t('uploadNew')}
            </button>
            <button
              onClick={() => setActiveTab('library')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'library'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              {t('library')}
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'upload' ? (
            /* Upload Tab */
            <div className="px-6 py-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                onClick={() => !isUploading && fileInputRef.current?.click()}
                disabled={isUploading}
                className={`w-full flex items-center gap-4 p-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl transition-all group ${
                  isUploading
                    ? 'opacity-60 cursor-not-allowed'
                    : 'hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 group-hover:bg-gray-100 dark:group-hover:bg-gray-700 transition-colors">
                  {isUploading ? (
                    <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
                  ) : (
                    <Upload className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <div className="text-left">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {isUploading ? 'Uploading...' : t('uploadNew')}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {t('uploadHint')}
                  </div>
                </div>
              </button>
            </div>
          ) : (
            /* Library Tab */
            <div className="px-6 py-4">
              {libraryLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : libraryImages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-3">
                    <ImageIcon className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('libraryEmpty')}
                  </p>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="mt-2 text-sm text-blue-500 hover:text-blue-600"
                  >
                    {t('libraryUploadPrompt')}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {libraryImages.map((image) => {
                    const isSelected = localSelected.includes(image.url);
                    return (
                      <button
                        key={image.id}
                        onClick={() => toggleLibraryImage(image.url)}
                        className={`relative aspect-square rounded-lg overflow-hidden transition-all ${
                          isSelected
                            ? 'ring-2 ring-blue-500 ring-offset-2'
                            : 'ring-1 ring-gray-200 dark:ring-gray-700 hover:ring-gray-300 dark:hover:ring-gray-600'
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={image.url}
                          alt={image.filename || 'Image'}
                          className="w-full h-full object-cover"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                              <svg
                                className="w-4 h-4 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected Images Preview - 固定在底部 */}
        {localSelected.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              {t('selectedImagesHint')}
            </p>
            <div className="flex flex-wrap gap-2">
              {localSelected.map((src, index) => (
                <button
                  key={`selected-${index}`}
                  onClick={() => removeSelectedImage(src)}
                  className="relative w-14 h-14 rounded-lg overflow-hidden ring-2 ring-blue-500 ring-offset-1 group"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`Selected ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <X className="w-4 h-4 text-white" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
