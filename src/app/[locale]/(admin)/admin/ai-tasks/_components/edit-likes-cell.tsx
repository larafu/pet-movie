'use client';

/**
 * 点赞数编辑组件
 * Edit Likes Cell Component
 *
 * 用于管理员表格中编辑 AI 任务的点赞数
 */

import { useState } from 'react';
import { Pencil, Loader2, Heart } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';

interface EditLikesCellProps {
  taskId: string;
  initialLikeCount: number;
}

export function EditLikesCell({ taskId, initialLikeCount }: EditLikesCellProps) {
  const [open, setOpen] = useState(false);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [inputValue, setInputValue] = useState(String(initialLikeCount));
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    const newLikeCount = parseInt(inputValue, 10);

    // 验证输入
    if (isNaN(newLikeCount) || newLikeCount < 0) {
      toast.error('请输入有效的非负整数');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/admin/ai-tasks/${taskId}/likes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ likeCount: newLikeCount }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setLikeCount(newLikeCount);
        setOpen(false);
        toast.success(`点赞数已更新为 ${newLikeCount}`);
      } else {
        toast.error(data.error || '更新失败');
      }
    } catch (error) {
      toast.error('更新失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      // 打开弹窗时重置输入值
      setInputValue(String(likeCount));
    }
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 px-2 py-1 rounded-md transition-colors group">
          <Heart className="w-4 h-4 text-red-500" />
          <span className="font-medium">{likeCount}</span>
          <Pencil className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle>编辑点赞数</DialogTitle>
          <DialogDescription>
            修改此作品的点赞数量（仅管理员可操作）
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="flex items-center gap-3">
            <Heart className="w-5 h-5 text-red-500 flex-shrink-0" />
            <Input
              type="number"
              min="0"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="请输入点赞数"
              className="flex-1"
              disabled={isLoading}
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            任务 ID: {taskId.slice(0, 8)}...
          </p>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isLoading}
          >
            取消
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                保存中...
              </>
            ) : (
              '保存'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
