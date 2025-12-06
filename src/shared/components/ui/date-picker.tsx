/**
 * 日期选择器组件
 * Date Picker Component
 *
 * 基于 shadcn/ui 和 react-day-picker 构建
 * 支持年月下拉快速选择，比原生 Calendar 组件更易用
 *
 * 参考: https://github.com/hsuanyi-chou/shadcn-ui-expansions
 */

'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker, type DayPickerProps } from 'react-day-picker';

import { cn } from '@/shared/lib/utils';
import { Button, buttonVariants } from '@/shared/components/ui/button';
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

/**
 * 生成月份列表
 * Generate months list
 */
function genMonths(locale: 'zh' | 'en' = 'en') {
  const localeObj = locale === 'zh' ? zhCN : enUS;
  return Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: format(new Date(2021, i), 'MMMM', { locale: localeObj }),
  }));
}

/**
 * 生成年份列表
 * Generate years list
 */
function genYears(fromYear: number, toYear: number) {
  const years: { value: number; label: string }[] = [];
  for (let year = toYear; year >= fromYear; year--) {
    years.push({ value: year, label: year.toString() });
  }
  return years;
}

/**
 * 带年月选择的日历组件
 * Calendar with year/month selection
 */
interface CalendarWithSelectProps {
  className?: string;
  classNames?: DayPickerProps['classNames'];
  showOutsideDays?: boolean;
  fromYear?: number;
  toYear?: number;
  locale?: 'zh' | 'en';
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  disabled?: (date: Date) => boolean;
}

function CalendarWithSelect({
  className,
  classNames,
  showOutsideDays = true,
  fromYear = 1950,
  toYear = new Date().getFullYear(),
  locale = 'en',
  selected,
  onSelect,
  disabled,
}: CalendarWithSelectProps) {
  const [month, setMonth] = React.useState<Date>(selected || new Date());

  const MONTHS = React.useMemo(() => genMonths(locale), [locale]);
  const YEARS = React.useMemo(() => genYears(fromYear, toYear), [fromYear, toYear]);

  // 检查是否可以导航
  const canNavigatePrev = React.useMemo(() => {
    const prevMonth = new Date(month.getFullYear(), month.getMonth() - 1);
    return prevMonth.getFullYear() >= fromYear;
  }, [month, fromYear]);

  const canNavigateNext = React.useMemo(() => {
    const nextMonth = new Date(month.getFullYear(), month.getMonth() + 1);
    return nextMonth.getFullYear() <= toYear;
  }, [month, toYear]);

  const handlePrevMonth = () => {
    if (canNavigatePrev) {
      setMonth(new Date(month.getFullYear(), month.getMonth() - 1));
    }
  };

  const handleNextMonth = () => {
    if (canNavigateNext) {
      setMonth(new Date(month.getFullYear(), month.getMonth() + 1));
    }
  };

  const handleMonthChange = (value: string) => {
    const newMonth = parseInt(value, 10);
    setMonth(new Date(month.getFullYear(), newMonth));
  };

  const handleYearChange = (value: string) => {
    const newYear = parseInt(value, 10);
    setMonth(new Date(newYear, month.getMonth()));
  };

  return (
    <div className={cn('p-3', className)}>
      {/* 顶部导航：年月选择 */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={handlePrevMonth}
          disabled={!canNavigatePrev}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-1">
          {/* 月份选择 */}
          <Select
            value={month.getMonth().toString()}
            onValueChange={handleMonthChange}
          >
            <SelectTrigger className="h-7 w-[110px] border-none shadow-none focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[100]">
              {MONTHS.map((m) => (
                <SelectItem key={m.value} value={m.value.toString()}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 年份选择 */}
          <Select
            value={month.getFullYear().toString()}
            onValueChange={handleYearChange}
          >
            <SelectTrigger className="h-7 w-[80px] border-none shadow-none focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[200px] z-[100]">
              {YEARS.map((y) => (
                <SelectItem key={y.value} value={y.value.toString()}>
                  {y.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={handleNextMonth}
          disabled={!canNavigateNext}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* 日历主体 */}
      <DayPicker
        mode="single"
        selected={selected}
        onSelect={onSelect}
        month={month}
        onMonthChange={setMonth}
        showOutsideDays={showOutsideDays}
        locale={locale === 'zh' ? zhCN : enUS}
        disabled={disabled}
        classNames={{
          months: 'flex flex-col',
          month: 'space-y-4',
          month_caption: 'hidden', // 隐藏默认的月份标题
          nav: 'hidden', // 隐藏默认的导航
          month_grid: 'w-full border-collapse space-y-1',
          weekdays: 'flex',
          weekday: 'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]',
          week: 'flex w-full mt-2',
          day: 'h-9 w-9 text-center text-sm p-0 relative rounded-md',
          day_button: cn(
            buttonVariants({ variant: 'ghost' }),
            'h-9 w-9 p-0 font-normal aria-selected:opacity-100'
          ),
          selected:
            'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
          today: 'bg-accent text-accent-foreground',
          outside: 'text-muted-foreground opacity-50',
          disabled: 'text-muted-foreground opacity-50',
          hidden: 'invisible',
          ...classNames,
        }}
      />
    </div>
  );
}

CalendarWithSelect.displayName = 'CalendarWithSelect';

/**
 * 日期选择器组件 Props
 * DatePicker component props
 */
interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  fromYear?: number;
  toYear?: number;
  locale?: 'zh' | 'en';
  className?: string;
  /** 日期格式化模式 */
  displayFormat?: string;
  /** 禁用特定日期 */
  disabledDays?: (date: Date) => boolean;
}

/**
 * 日期选择器组件
 * DatePicker component with year/month dropdown
 */
const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(
  (
    {
      value,
      onChange,
      placeholder = 'Pick a date',
      disabled = false,
      fromYear = 1950,
      toYear = new Date().getFullYear(),
      locale = 'en',
      className,
      displayFormat = 'PPP',
      disabledDays,
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false);

    const handleSelect = (date: Date | undefined) => {
      onChange?.(date);
      if (date) {
        setOpen(false);
      }
    };

    const localeObj = locale === 'zh' ? zhCN : enUS;

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild disabled={disabled}>
          <Button
            ref={ref}
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal',
              !value && 'text-muted-foreground',
              className
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? (
              format(value, displayFormat, { locale: localeObj })
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarWithSelect
            selected={value}
            onSelect={handleSelect}
            fromYear={fromYear}
            toYear={toYear}
            locale={locale}
            disabled={disabledDays}
          />
        </PopoverContent>
      </Popover>
    );
  }
);

DatePicker.displayName = 'DatePicker';

export { DatePicker, CalendarWithSelect };
export type { DatePickerProps, CalendarWithSelectProps };
