'use client';

import { useState } from 'react';
import { Link } from '@/core/i18n/navigation';
import { Check, X, Trash2, Edit, Play, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';

interface Template {
  id: string;
  name: string;
  nameCn: string | null;
  description: string | null;
  category: string;
  tags: string | null; // JSON 字符串数组
  styleId: string;
  durationSeconds: number;
  aspectRatio: string;
  status: string; // draft/published/disabled
  sortOrder: number;
  useCount: number;
  thumbnailUrl: string | null;
  previewVideoUrl: string | null;
  createdAt: Date;
}

interface TemplateListProps {
  templates: Template[];
}

export function TemplateList({ templates: initialTemplates }: TemplateListProps) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [loading, setLoading] = useState<string | null>(null);
  // 删除确认对话框状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);

  // 切换状态（published <-> disabled）
  const handleToggleStatus = async (templateId: string, currentStatus: string) => {
    setLoading(templateId);
    // 只在 published 和 disabled 之间切换，draft 不参与切换
    const newStatus = currentStatus === 'published' ? 'disabled' : 'published';

    try {
      const response = await fetch('/api/admin/script-templates/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, status: newStatus }),
      });

      const result = await response.json();
      if (result.success) {
        setTemplates(prev =>
          prev.map(t =>
            t.id === templateId ? { ...t, status: newStatus } : t
          )
        );
      } else {
        alert('Failed to update: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Toggle error:', error);
      alert('Failed to update');
    } finally {
      setLoading(null);
    }
  };

  // 打开删除确认对话框
  const openDeleteDialog = (template: Template) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  // 确认删除模板
  const handleConfirmDelete = async () => {
    if (!templateToDelete) return;

    setLoading(templateToDelete.id);

    try {
      const response = await fetch('/api/admin/script-templates/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: templateToDelete.id }),
      });

      const result = await response.json();
      if (result.success) {
        setTemplates(prev => prev.filter(t => t.id !== templateToDelete.id));
        setDeleteDialogOpen(false);
        setTemplateToDelete(null);
      } else {
        alert('删除失败: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('删除失败');
    } finally {
      setLoading(null);
    }
  };

  if (templates.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No templates yet. Click &quot;Create Template&quot; to create one.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {templates.map(template => (
        <div
          key={template.id}
          className={`bg-white dark:bg-gray-800 rounded-lg p-4 shadow flex items-center gap-4 ${
            template.status !== 'published' ? 'opacity-60' : ''
          }`}
        >
          {/* 缩略图 */}
          <div className="w-24 h-16 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden flex-shrink-0">
            {template.thumbnailUrl ? (
              <img
                src={template.thumbnailUrl}
                alt={template.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                No Image
              </div>
            )}
          </div>

          {/* 信息 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold truncate">{template.name || '(未命名)'}</h3>
              {template.nameCn && (
                <span className="text-sm text-gray-500">({template.nameCn})</span>
              )}
              <span
                className={`px-2 py-0.5 text-xs rounded ${
                  template.status === 'published'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : template.status === 'draft'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }`}
              >
                {template.status === 'published' ? 'Published' : template.status === 'draft' ? 'Draft' : 'Disabled'}
              </span>
            </div>

            <div className="text-sm text-gray-500 flex flex-wrap gap-3 mt-1">
              <span>Tags: {template.tags ? JSON.parse(template.tags).join(', ') : template.category}</span>
              <span>Duration: {template.durationSeconds}s</span>
              <span>Ratio: {template.aspectRatio}</span>
              <span>Style: {template.styleId}</span>
              <span>Uses: {template.useCount}</span>
            </div>

            {template.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
                {template.description}
              </p>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* 预览视频 */}
            {template.previewVideoUrl && (
              <a
                href={template.previewVideoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                title="Preview Video"
              >
                <Play className="w-4 h-4" />
              </a>
            )}

            {/* 编辑 - 使用 Link 实现预加载 */}
            <Link
              href={`/admin/script-creator?edit=${template.id}`}
              className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded inline-flex"
              title="Edit Template"
              prefetch={true}
            >
              <Edit className="w-4 h-4" />
            </Link>

            {/* 启用/禁用（只对非草稿模板有效） */}
            {template.status !== 'draft' && (
              <button
                onClick={() => handleToggleStatus(template.id, template.status)}
                disabled={loading === template.id}
                className={`p-2 rounded ${
                  template.status === 'published'
                    ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                    : 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
                }`}
                title={template.status === 'published' ? 'Disable' : 'Enable'}
              >
                {template.status === 'published' ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
              </button>
            )}

            {/* 删除 */}
            <button
              onClick={() => openDeleteDialog(template)}
              disabled={loading === template.id}
              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除模板「{templateToDelete?.name || templateToDelete?.id}」吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setDeleteDialogOpen(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              取消
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={loading === templateToDelete?.id}
              className="px-4 py-2 bg-red-500 text-white hover:bg-red-600 rounded disabled:opacity-50 flex items-center gap-2"
            >
              {loading === templateToDelete?.id && <Loader2 className="w-4 h-4 animate-spin" />}
              确认删除
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
