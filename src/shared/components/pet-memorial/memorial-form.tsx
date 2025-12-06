/**
 * 纪念表单组件
 * Memorial Form Component
 *
 * 用于创建和编辑宠物纪念
 */

'use client';

import { useState, useCallback } from 'react';
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
  Calendar as CalendarIcon,
  Dog,
  Cat,
  PawPrint,
} from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Calendar } from '@/shared/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover';
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
import { useCreateMemorial, useUpdateMemorial } from '@/shared/services/pet-memorial/hooks';
import type {
  CreateMemorialRequest,
  UpdateMemorialRequest,
  PetSpecies,
} from '@/shared/services/pet-memorial/types';
import { cn } from '@/shared/lib/utils';

// 表单 schema
// 简化物种选项，参考 lapoflove 数据只有 dog/cat/other
const formSchema = z.object({
  petName: z.string().min(1, 'Pet name is required').max(100),
  species: z.enum(['dog', 'cat', 'other']).optional(),
  birthday: z.date().optional(),
  dateOfPassing: z.date().optional(),
  message: z.string().max(500).optional(),
  story: z.string().max(5000).optional(),
  images: z.array(z.string()).min(1, 'At least one image is required').max(6),
  ownerFirstName: z.string().max(50).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  isNameDisplayed: z.boolean(),
  isPublic: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

interface MemorialFormProps {
  mode: 'create' | 'edit';
  initialData?: Partial<FormData> & { id?: string };
  onSuccess?: () => void;
}

// 物种图标映射（简化为 dog/cat/other）
const speciesIcons: Record<string, React.ReactNode> = {
  dog: <Dog className="w-4 h-4" />,
  cat: <Cat className="w-4 h-4" />,
  other: <PawPrint className="w-4 h-4" />,
};

export function MemorialForm({ mode, initialData, onSuccess }: MemorialFormProps) {
  const t = useTranslations('pet-memorial.form');
  const router = useRouter();

  const { isLoading: isCreating, create } = useCreateMemorial();
  const { isLoading: isUpdating, update } = useUpdateMemorial();

  const isLoading = isCreating || isUpdating;

  // 图片上传状态
  const [isUploading, setIsUploading] = useState(false);

  // 表单初始化
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      petName: initialData?.petName || '',
      species: initialData?.species,
      birthday: initialData?.birthday,
      dateOfPassing: initialData?.dateOfPassing,
      message: initialData?.message || '',
      story: initialData?.story || '',
      images: initialData?.images || [],
      ownerFirstName: initialData?.ownerFirstName || '',
      city: initialData?.city || '',
      state: initialData?.state || '',
      isNameDisplayed: initialData?.isNameDisplayed ?? true,
      isPublic: initialData?.isPublic ?? true,
    },
  });

  const images = form.watch('images');

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
      const uploadPromises = Array.from(files).map(async (file) => {
        // 创建 FormData 上传
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload/image', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const { url } = await response.json();
        return url;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      form.setValue('images', [...currentImages, ...uploadedUrls]);
    } catch (error) {
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
    const payload: CreateMemorialRequest | UpdateMemorialRequest = {
      petName: data.petName,
      species: data.species as PetSpecies | undefined,
      birthday: data.birthday?.toISOString(),
      dateOfPassing: data.dateOfPassing?.toISOString(),
      message: data.message || undefined,
      story: data.story || undefined,
      images: data.images,
      ownerFirstName: data.ownerFirstName || undefined,
      city: data.city || undefined,
      state: data.state || undefined,
      isNameDisplayed: data.isNameDisplayed,
      isPublic: data.isPublic,
    };

    if (mode === 'create') {
      const result = await create(payload as CreateMemorialRequest);
      if (result.success && result.data) {
        toast.success(t('createSuccess'));
        router.push(`/pet-memorial/${result.data.id}`);
        onSuccess?.();
      } else {
        toast.error(result.error || t('createError'));
      }
    } else if (initialData?.id) {
      const result = await update(initialData.id, payload);
      if (result.success) {
        toast.success(t('updateSuccess'));
        onSuccess?.();
      } else {
        toast.error(result.error || t('updateError'));
      }
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* 基本信息 */}
        <Card>
          <CardHeader>
            <CardTitle>{t('basicInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 宠物名称 */}
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

            {/* 物种 */}
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

            {/* 日期 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="birthday"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t('birthday')}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP')
                            ) : (
                              <span>{t('selectDate')}</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dateOfPassing"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t('dateOfPassing')}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP')
                            ) : (
                              <span>{t('selectDate')}</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* 图片上传 */}
        <Card>
          <CardHeader>
            <CardTitle>{t('photos')} *</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="images"
              render={() => (
                <FormItem>
                  <FormDescription>{t('photosDescription')}</FormDescription>

                  {/* 已上传图片 */}
                  {images.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
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
                            className="absolute top-2 right-2 h-6 w-6"
                            onClick={() => removeImage(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 上传按钮 */}
                  {images.length < 6 && (
                    <label
                      className={cn(
                        'flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer',
                        'hover:bg-accent/50 transition-colors',
                        isUploading && 'opacity-50 pointer-events-none'
                      )}
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {isUploading ? (
                          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                        ) : (
                          <>
                            <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
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
          </CardContent>
        </Card>

        {/* 留言和故事 */}
        <Card>
          <CardHeader>
            <CardTitle>{t('memorySection')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('message')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('messagePlaceholder')}
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>{t('messageDescription')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="story"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('story')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('storyPlaceholder')}
                      className="resize-none"
                      rows={6}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>{t('storyDescription')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* 联系信息 */}
        <Card>
          <CardHeader>
            <CardTitle>{t('contactInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 名字 */}
            <FormField
              control={form.control}
              name="ownerFirstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('firstName')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 地区 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('city')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormLabel>{t('state')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* 隐私设置 */}
        <Card>
          <CardHeader>
            <CardTitle>{t('privacySettings')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="isNameDisplayed"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">{t('displayName')}</FormLabel>
                    <FormDescription>{t('displayNameDescription')}</FormDescription>
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

            <FormField
              control={form.control}
              name="isPublic"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">{t('publicMemorial')}</FormLabel>
                    <FormDescription>{t('publicMemorialDescription')}</FormDescription>
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
          </CardContent>
        </Card>

        {/* 提交按钮 */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            {t('cancel')}
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {mode === 'create' ? t('createButton') : t('updateButton')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
