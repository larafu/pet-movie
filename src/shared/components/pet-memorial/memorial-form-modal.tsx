/**
 * 纪念表单弹窗组件
 * Memorial Form Modal Component
 *
 * 参考 lapoflove-source/ClientApp/components/UI/PetMemorialModal/PetMemorialModalForm.tsx
 * 以弹窗形式创建宠物纪念
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Loader2,
  Upload,
  X,
  Dog,
  Cat,
  PawPrint,
  Star,
  CheckCircle,
  Film,
  Sparkles,
} from 'lucide-react';
import { useLocale } from 'next-intl';

import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { DatePicker } from '@/shared/components/ui/date-picker';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Switch } from '@/shared/components/ui/switch';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form';
import { useCreateMemorial } from '@/shared/services/pet-memorial/hooks';
import type {
  CreateMemorialRequest,
  PetSpecies,
} from '@/shared/services/pet-memorial/types';
import { cn } from '@/shared/lib/utils';

/**
 * 表单 schema
 * 必填字段：petName, birthday, dateOfPassing, message, story, images(至少1张), ownerName, city, state
 */
const formSchema = z.object({
  petName: z.string().min(1, 'Pet name is required').max(100),
  species: z.enum(['dog', 'cat', 'other']).optional(),
  birthday: z.date().optional(),
  dateOfPassing: z.date().optional(),
  message: z.string().min(1, 'Message is required').max(500),
  story: z.string().min(1, 'Story is required').max(5000),
  images: z.array(z.string()).min(1, 'At least one image is required').max(6),
  ownerName: z.string().min(1, 'Name is required').max(100),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(1, 'State is required').max(100),
  isNameDisplayed: z.boolean(),
  isPublic: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

interface MemorialFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// 物种图标映射
const speciesIcons: Record<string, React.ReactNode> = {
  dog: <Dog className="w-4 h-4" />,
  cat: <Cat className="w-4 h-4" />,
  other: <PawPrint className="w-4 h-4" />,
};

// sessionStorage key for form draft
const FORM_DRAFT_KEY = 'pet-memorial-form-draft';

/**
 * 序列化表单数据用于存储
 * 将 Date 对象转换为 ISO 字符串
 */
function serializeFormData(data: FormData): string {
  return JSON.stringify({
    ...data,
    birthday: data.birthday?.toISOString() || null,
    dateOfPassing: data.dateOfPassing?.toISOString() || null,
  });
}

/**
 * 反序列化表单数据
 * 将 ISO 字符串转换回 Date 对象
 */
function deserializeFormData(json: string): Partial<FormData> | null {
  try {
    const data = JSON.parse(json);
    return {
      ...data,
      birthday: data.birthday ? new Date(data.birthday) : undefined,
      dateOfPassing: data.dateOfPassing ? new Date(data.dateOfPassing) : undefined,
    };
  } catch {
    return null;
  }
}

export function MemorialFormModal({ open, onOpenChange }: MemorialFormModalProps) {
  const t = useTranslations('pet-memorial.form');
  const router = useRouter();
  const locale = useLocale();

  const { isLoading, create } = useCreateMemorial();

  // 提交成功状态
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  // 图片上传状态
  const [isUploading, setIsUploading] = useState(false);

  // 默认表单值
  const defaultValues: FormData = {
    petName: '',
    species: undefined,
    birthday: undefined,
    dateOfPassing: undefined,
    message: '',
    story: '',
    images: [],
    ownerName: '',
    city: '',
    state: '',
    isNameDisplayed: true,
    isPublic: true,
  };

  // 表单初始化
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const images = form.watch('images');

  // 从 sessionStorage 恢复表单草稿
  useEffect(() => {
    if (open && !isSuccess) {
      const draft = sessionStorage.getItem(FORM_DRAFT_KEY);
      if (draft) {
        const savedData = deserializeFormData(draft);
        if (savedData) {
          // 恢复保存的数据
          Object.entries(savedData).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              form.setValue(key as keyof FormData, value as FormData[keyof FormData]);
            }
          });
        }
      }
    }
  }, [open, isSuccess]);

  // 监听表单变化，自动保存草稿
  useEffect(() => {
    if (!open || isSuccess) return;

    const subscription = form.watch((data) => {
      // 保存当前表单数据到 sessionStorage
      sessionStorage.setItem(FORM_DRAFT_KEY, serializeFormData(data as FormData));
    });

    return () => subscription.unsubscribe();
  }, [form, open, isSuccess]);

  // 图片上传处理
  const handleImageUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const currentImages = form.getValues('images');
    if (currentImages.length + files.length > 6) {
      toast.error(t('maxImagesError'));
      return;
    }

    setIsUploading(true);

    try {
      // 使用 /api/storage/upload-image，参数名为 files
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch('/api/storage/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      if (result.code !== 0 || !result.data?.urls) {
        throw new Error(result.message || 'Upload failed');
      }

      form.setValue('images', [...currentImages, ...result.data.urls]);
    } catch {
      toast.error(t('uploadError'));
    } finally {
      setIsUploading(false);
    }
  }, [form, t]);

  // 删除图片
  const removeImage = useCallback((index: number) => {
    const currentImages = form.getValues('images');
    form.setValue(
      'images',
      currentImages.filter((_, i) => i !== index)
    );
  }, [form]);

  // 表单提交
  const onSubmit = async (data: FormData) => {
    const payload: CreateMemorialRequest = {
      petName: data.petName,
      species: data.species as PetSpecies | undefined,
      birthday: data.birthday?.toISOString(),
      dateOfPassing: data.dateOfPassing?.toISOString(),
      message: data.message,
      story: data.story,
      images: data.images,
      ownerFirstName: data.ownerName, // 使用 ownerName 作为 ownerFirstName
      city: data.city,
      state: data.state,
      isNameDisplayed: data.isNameDisplayed,
      isPublic: data.isPublic,
    };

    const result = await create(payload);
    if (result.success && result.data) {
      // 提交成功，清除草稿
      sessionStorage.removeItem(FORM_DRAFT_KEY);
      setIsSuccess(true);
      setCreatedId(result.data.id);
    } else {
      toast.error(result.error || t('createError'));
    }
  };

  // 查看纪念
  const handleViewMemorial = () => {
    if (createdId) {
      router.push(`/pet-memorial/${createdId}`);
      onOpenChange(false);
    }
  };

  // 生成纪念视频 - 跳转到 create-pet-movie 页面并带上首张图片
  const handleGenerateVideo = () => {
    const firstImage = form.getValues('images')?.[0];
    if (firstImage) {
      // 跳转到视频生成页，带上首张图片作为初始图片
      const encodedImage = encodeURIComponent(firstImage);
      router.push(`/create-pet-movie?image=${encodedImage}`);
      onOpenChange(false);
    } else {
      // 没有图片时直接跳转
      router.push('/create-pet-movie');
      onOpenChange(false);
    }
  };

  // 关闭弹窗时的处理
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // 只有在成功提交后才清除草稿和重置表单
      if (isSuccess) {
        setTimeout(() => {
          sessionStorage.removeItem(FORM_DRAFT_KEY);
          form.reset(defaultValues);
          setIsSuccess(false);
          setCreatedId(null);
        }, 300);
      }
      // 关闭时不重置表单，数据已保存在 sessionStorage 中
    }
    onOpenChange(newOpen);
  };

  // 清除草稿（用于手动清除）
  const clearDraft = useCallback(() => {
    sessionStorage.removeItem(FORM_DRAFT_KEY);
    form.reset(defaultValues);
  }, [form]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-[#0f172a] border-slate-700">
        {/* 头部 - 星星图标 */}
        <DialogHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Star className="w-12 h-12 text-yellow-400 fill-yellow-400" />
              <div className="absolute inset-0 w-12 h-12 bg-yellow-400/30 rounded-full blur-xl" />
            </div>
          </div>
          <DialogTitle className="text-2xl">
            {isSuccess ? t('successTitle') : t('modalTitle')}
          </DialogTitle>
          {!isSuccess && (
            <p className="text-muted-foreground text-sm mt-2">
              {t('modalDescription')}
            </p>
          )}
        </DialogHeader>

        {isSuccess ? (
          // 成功状态 - 包含视频生成引导
          <div className="py-6 space-y-6">
            {/* 成功提示 */}
            <div className="text-center space-y-3">
              <CheckCircle className="w-14 h-14 text-green-500 mx-auto" />
              <h3 className="text-xl font-semibold">{t('successMessage')}</h3>
              <p className="text-muted-foreground text-sm">{t('successDescription')}</p>
            </div>

            {/* 视频生成引导卡片 */}
            <div className="bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10 rounded-xl p-5 border border-purple-500/20">
              <div className="flex items-start gap-4">
                {/* 演示视频预览 */}
                <div className="relative w-32 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-black/20">
                  <video
                    src="https://file.aiquickdraw.com/custom-page/akr/section-images/17607764967900u9630hr.mp4"
                    className="w-full h-full object-cover"
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Film className="w-6 h-6 text-white/80" />
                  </div>
                </div>

                {/* 文案和按钮 */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <h4 className="font-semibold text-sm">{t('videoGuide.title')}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t('videoGuide.description')}
                  </p>
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                    onClick={handleGenerateVideo}
                  >
                    <Film className="w-4 h-4 mr-1.5" />
                    {t('videoGuide.button')}
                  </Button>
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-center gap-3 pt-2">
              <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
                {t('close')}
              </Button>
              <Button variant="secondary" size="sm" onClick={handleViewMemorial}>
                {t('viewMemorial')}
              </Button>
            </div>
          </div>
        ) : (
          // 表单
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* 宠物信息 */}
              <div className="space-y-4">
                <h4 className="font-semibold text-lg border-b pb-2">{t('petInfo')}</h4>

                {/* 宠物名称和物种 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="petName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('petName')} *</FormLabel>
                        <FormControl>
                          <Input placeholder={t('petNamePlaceholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="species"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('species')}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('speciesPlaceholder')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {['dog', 'cat', 'other'].map((species) => (
                              <SelectItem key={species} value={species}>
                                <div className="flex items-center gap-2">
                                  {speciesIcons[species]}
                                  <span>{t(`speciesOptions.${species}`)}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* 日期 - 使用新的 DatePicker 组件，支持年月下拉选择 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="birthday"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>{t('birthday')} *</FormLabel>
                        <FormControl>
                          <DatePicker
                            value={field.value}
                            onChange={field.onChange}
                            placeholder={t('selectDate')}
                            fromYear={1990}
                            toYear={new Date().getFullYear()}
                            locale={locale === 'zh' ? 'zh' : 'en'}
                            disabledDays={(date) => date > new Date()}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dateOfPassing"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>{t('dateOfPassing')} *</FormLabel>
                        <FormControl>
                          <DatePicker
                            value={field.value}
                            onChange={field.onChange}
                            placeholder={t('selectDate')}
                            fromYear={1990}
                            toYear={new Date().getFullYear()}
                            locale={locale === 'zh' ? 'zh' : 'en'}
                            disabledDays={(date) => date > new Date()}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* 留言 */}
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('message')} *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t('messagePlaceholder')}
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 故事 */}
                <FormField
                  control={form.control}
                  name="story"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('story')} *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t('storyPlaceholder')}
                          className="resize-none"
                          rows={5}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* 图片上传 */}
              <div className="space-y-4">
                <h4 className="font-semibold text-lg border-b pb-2">{t('photos')} *</h4>
                <FormField
                  control={form.control}
                  name="images"
                  render={() => (
                    <FormItem>
                      <FormDescription>{t('photosDescriptionRequired')}</FormDescription>

                      {/* 已上传图片 */}
                      {images.length > 0 && (
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
                          {images.map((url, index) => (
                            <div key={index} className="relative aspect-square">
                              <Image
                                src={url}
                                alt={`Pet ${index + 1}`}
                                fill
                                className="object-cover rounded-lg"
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute top-1 right-1 h-5 w-5"
                                onClick={() => removeImage(index)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 上传按钮 */}
                      {images.length < 6 && (
                        <label
                          className={cn(
                            'flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer',
                            'hover:bg-accent/50 transition-colors',
                            isUploading && 'opacity-50 pointer-events-none'
                          )}
                        >
                          <div className="flex flex-col items-center justify-center py-4">
                            {isUploading ? (
                              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            ) : (
                              <>
                                <Upload className="w-6 h-6 mb-1 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">
                                  {t('uploadPhotos')}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {t('uploadLimit', { current: images.length, max: 6 })}
                                </p>
                              </>
                            )}
                          </div>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            multiple
                            onChange={(e) => handleImageUpload(e.target.files)}
                            disabled={isUploading}
                          />
                        </label>
                      )}

                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* 个人信息 */}
              <div className="space-y-4">
                <h4 className="font-semibold text-lg border-b pb-2">{t('personalInfo')}</h4>

                <FormField
                  control={form.control}
                  name="ownerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('name')} *</FormLabel>
                      <FormControl>
                        <Input placeholder={t('namePlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 显示名字开关 */}
                <FormField
                  control={form.control}
                  name="isNameDisplayed"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm">{t('displayName')}</FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* 城市和州 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('city')} *</FormLabel>
                        <FormControl>
                          <Input placeholder={t('cityPlaceholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('state')} *</FormLabel>
                        <FormControl>
                          <Input placeholder={t('statePlaceholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* 提交按钮 */}
              <div className="flex justify-end gap-4 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={isLoading}
                >
                  {t('cancel')}
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {t('submitMemorial')}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
