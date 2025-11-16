'use client';

import { useEffect, useState } from 'react';
import { Check, Clock, Lightbulb, Loader2, SendHorizonal, Zap } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { SmartIcon } from '@/shared/blocks/common';
import { PaymentModal } from '@/shared/blocks/payment/payment-modal';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { useAppContext } from '@/shared/contexts/app';
import { getCookie } from '@/shared/lib/cookie';
import { cn } from '@/shared/lib/utils';
import { Subscription } from '@/shared/models/subscription';
import {
  PricingCurrency,
  PricingItem,
  Pricing as PricingType,
} from '@/shared/types/blocks/pricing';

// Helper function to get all available currencies from a pricing item
function getCurrenciesFromItem(item: PricingItem | null): PricingCurrency[] {
  if (!item) return [];

  // Always include the default currency first
  const defaultCurrency: PricingCurrency = {
    currency: item.currency,
    amount: item.amount,
    price: item.price || '',
    original_price: item.original_price || '',
  };

  // Add additional currencies if available
  if (item.currencies && item.currencies.length > 0) {
    return [defaultCurrency, ...item.currencies];
  }

  return [defaultCurrency];
}

// Helper function to select initial currency based on locale
function getInitialCurrency(
  currencies: PricingCurrency[],
  locale: string,
  defaultCurrency: string
): string {
  if (currencies.length === 0) return defaultCurrency;

  // If locale is 'zh', prefer CNY
  if (locale === 'zh') {
    const cnyCurrency = currencies.find(
      (c) => c.currency.toLowerCase() === 'cny'
    );
    if (cnyCurrency) {
      return cnyCurrency.currency;
    }
  }

  // Otherwise return default currency
  return defaultCurrency;
}

// Early bird countdown hook
function useEarlybirdCountdown() {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isActive: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isActive: false });

  useEffect(() => {
    const calculateTimeLeft = () => {
      // Early bird starts on Nov 16, 2025 00:00:00 and lasts 8 days
      const startDate = new Date('2025-11-16T00:00:00');
      const endDate = new Date(startDate.getTime() + 8 * 24 * 60 * 60 * 1000);
      const now = new Date();

      // Check if we're within the early bird period
      if (now < startDate || now > endDate) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, isActive: false };
      }

      const difference = endDate.getTime() - now.getTime();

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        isActive: true,
      };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return timeLeft;
}

// Calculate early bird discount price
// For yearly plans, calculate based on total amount, not monthly price
function calculateEarlybirdPrice(
  item: PricingItem,
  isActive: boolean
): { discountedPrice: string; originalTotalPrice?: string } {
  if (!isActive || !item.price) return { discountedPrice: item.price || '' };

  const isYearly = item.interval === 'year';

  if (isYearly) {
    // For yearly plans, calculate discount on total amount and display yearly price
    const totalAmount = item.amount; // e.g., 315000 (¥3150 in cents)
    const discountedTotal = Math.round(totalAmount * 0.3); // 30% of original (3折)

    // Extract currency symbol from price
    const currencyMatch = item.price.match(/[^\d.,]+/);
    const currency = currencyMatch ? currencyMatch[0] : '¥';

    // Format the discounted YEARLY price (not monthly)
    const discountedPrice = `${currency}${(discountedTotal / 100).toFixed(1)}`;

    // Calculate original total price for display
    const originalTotal = `${currency}${(totalAmount / 100).toFixed(0)}`;

    return { discountedPrice, originalTotalPrice: originalTotal };
  } else {
    // For one-time and monthly plans, calculate directly on price
    const match = item.price.match(/[\d,.]+/);
    if (!match) return { discountedPrice: item.price };

    const amount = parseFloat(match[0].replace(',', ''));
    const discountedAmount = Math.round(amount * 0.3); // 30% of original (3折)

    const discountedPrice = item.price.replace(/[\d,.]+/, discountedAmount.toString());
    return { discountedPrice };
  }
}

export function Pricing({
  pricing,
  className,
  currentSubscription,
}: {
  pricing: PricingType;
  className?: string;
  currentSubscription?: Subscription;
}) {
  const locale = useLocale();
  const t = useTranslations('pricing.page');
  const {
    user,
    isShowPaymentModal,
    setIsShowSignModal,
    setIsShowPaymentModal,
    configs,
  } = useAppContext();

  // Early bird countdown
  const earlybird = useEarlybirdCountdown();

  const [group, setGroup] = useState(() => {
    // find current pricing item
    const currentItem = pricing.items?.find(
      (i) => i.product_id === currentSubscription?.productId
    );

    // First look for a group with is_featured set to true
    const featuredGroup = pricing.groups?.find((g) => g.is_featured);
    // If no featured group exists, fall back to the first group
    return (
      currentItem?.group || featuredGroup?.name || pricing.groups?.[0]?.name
    );
  });

  // current pricing item
  const [pricingItem, setPricingItem] = useState<PricingItem | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [productId, setProductId] = useState<string | null>(null);

  // Currency state management for each item
  // Store selected currency and displayed item for each product_id
  const [itemCurrencies, setItemCurrencies] = useState<
    Record<string, { selectedCurrency: string; displayedItem: PricingItem }>
  >({});

  // Initialize currency states for all items
  useEffect(() => {
    if (pricing.items && pricing.items.length > 0) {
      const initialCurrencyStates: Record<
        string,
        { selectedCurrency: string; displayedItem: PricingItem }
      > = {};

      pricing.items.forEach((item) => {
        const currencies = getCurrenciesFromItem(item);
        const selectedCurrency = getInitialCurrency(
          currencies,
          locale,
          item.currency
        );

        // Create displayed item with selected currency
        const currencyData = currencies.find(
          (c) => c.currency.toLowerCase() === selectedCurrency.toLowerCase()
        );

        const displayedItem = currencyData
          ? {
              ...item,
              currency: currencyData.currency,
              amount: currencyData.amount,
              price: currencyData.price,
              original_price: currencyData.original_price,
              // Override with currency-specific payment settings if available
              payment_product_id:
                currencyData.payment_product_id || item.payment_product_id,
              payment_providers:
                currencyData.payment_providers || item.payment_providers,
            }
          : item;

        initialCurrencyStates[item.product_id] = {
          selectedCurrency,
          displayedItem,
        };
      });

      setItemCurrencies(initialCurrencyStates);
    }
  }, [pricing.items, locale]);

  // Handler for currency change
  const handleCurrencyChange = (productId: string, currency: string) => {
    const item = pricing.items?.find((i) => i.product_id === productId);
    if (!item) return;

    const currencies = getCurrenciesFromItem(item);
    const currencyData = currencies.find(
      (c) => c.currency.toLowerCase() === currency.toLowerCase()
    );

    if (currencyData) {
      const displayedItem = {
        ...item,
        currency: currencyData.currency,
        amount: currencyData.amount,
        price: currencyData.price,
        original_price: currencyData.original_price,
        // Override with currency-specific payment settings if available
        payment_product_id:
          currencyData.payment_product_id || item.payment_product_id,
        payment_providers:
          currencyData.payment_providers || item.payment_providers,
      };

      setItemCurrencies((prev) => ({
        ...prev,
        [productId]: {
          selectedCurrency: currency,
          displayedItem,
        },
      }));
    }
  };

  const handlePayment = async (item: PricingItem) => {
    if (!user) {
      setIsShowSignModal(true);
      return;
    }

    // Use displayed item with selected currency
    const displayedItem =
      itemCurrencies[item.product_id]?.displayedItem || item;

    if (configs.select_payment_enabled === 'true') {
      setPricingItem(displayedItem);
      setIsShowPaymentModal(true);
    } else {
      handleCheckout(displayedItem, configs.default_payment_provider);
    }
  };

  const getAffiliateMetadata = ({
    paymentProvider,
  }: {
    paymentProvider: string;
  }) => {
    const affiliateMetadata: Record<string, string> = {};

    // get Affonso referral
    if (
      configs.affonso_enabled === 'true' &&
      ['stripe', 'creem'].includes(paymentProvider)
    ) {
      const affonsoReferral = getCookie('affonso_referral') || '';
      affiliateMetadata.affonso_referral = affonsoReferral;
    }

    // get PromoteKit referral
    if (
      configs.promotekit_enabled === 'true' &&
      ['stripe'].includes(paymentProvider)
    ) {
      const promotekitReferral =
        typeof window !== 'undefined' && (window as any).promotekit_referral
          ? (window as any).promotekit_referral
          : getCookie('promotekit_referral') || '';
      affiliateMetadata.promotekit_referral = promotekitReferral;
    }

    return affiliateMetadata;
  };

  const handleCheckout = async (
    item: PricingItem,
    paymentProvider?: string
  ) => {
    try {
      if (!user) {
        setIsShowSignModal(true);
        return;
      }

      const affiliateMetadata = getAffiliateMetadata({
        paymentProvider: paymentProvider || '',
      });

      const params = {
        product_id: item.product_id,
        currency: item.currency,
        locale: locale || 'en',
        payment_provider: paymentProvider || '',
        metadata: affiliateMetadata,
      };

      setIsLoading(true);
      setProductId(item.product_id);

      const response = await fetch('/api/payment/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (response.status === 401) {
        setIsLoading(false);
        setProductId(null);
        setPricingItem(null);
        setIsShowSignModal(true);
        return;
      }

      if (!response.ok) {
        throw new Error(`request failed with status ${response.status}`);
      }

      const { code, message, data } = await response.json();
      if (code !== 0) {
        throw new Error(message);
      }

      const { checkoutUrl } = data;
      if (!checkoutUrl) {
        throw new Error('checkout url not found');
      }

      window.location.href = checkoutUrl;
    } catch (e: any) {
      console.log('checkout failed: ', e);
      toast.error('checkout failed: ' + e.message);

      setIsLoading(false);
      setProductId(null);
    }
  };

  useEffect(() => {
    if (pricing.items) {
      const featuredItem = pricing.items.find((i) => i.is_featured);
      setProductId(featuredItem?.product_id || pricing.items[0]?.product_id);
      setIsLoading(false);
    }
  }, [pricing.items]);

  return (
    <section
      id={pricing.id}
      className={cn('py-24 md:py-36', pricing.className, className)}
    >
      {/* Early Bird Countdown Banner */}
      {earlybird.isActive && (
        <div className="mx-auto mb-8 px-4">
          <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border border-amber-500/20 rounded-lg p-4 max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-amber-500" />
                <span className="text-sm font-medium">
                  {locale === 'zh' ? '早鸟优惠倒计时' : 'Early Bird Countdown'}
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono text-lg font-bold">
                <div className="bg-background/50 px-2 py-1 rounded">
                  {String(earlybird.days).padStart(2, '0')}
                  <span className="text-xs text-muted-foreground ml-1">
                    {locale === 'zh' ? '天' : 'd'}
                  </span>
                </div>
                <span>:</span>
                <div className="bg-background/50 px-2 py-1 rounded">
                  {String(earlybird.hours).padStart(2, '0')}
                  <span className="text-xs text-muted-foreground ml-1">
                    {locale === 'zh' ? '时' : 'h'}
                  </span>
                </div>
                <span>:</span>
                <div className="bg-background/50 px-2 py-1 rounded">
                  {String(earlybird.minutes).padStart(2, '0')}
                  <span className="text-xs text-muted-foreground ml-1">
                    {locale === 'zh' ? '分' : 'm'}
                  </span>
                </div>
                <span>:</span>
                <div className="bg-background/50 px-2 py-1 rounded">
                  {String(earlybird.seconds).padStart(2, '0')}
                  <span className="text-xs text-muted-foreground ml-1">
                    {locale === 'zh' ? '秒' : 's'}
                  </span>
                </div>
              </div>
              <Badge variant="secondary" className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30">
                {locale === 'zh' ? '限时3折' : '70% OFF'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              {locale === 'zh'
                ? '⚠️ 功能开发中，预购享优惠价格。正式上线后恢复原价。'
                : '⚠️ Feature in development. Pre-order at discounted price. Price will increase at launch.'}
            </p>
          </div>
        </div>
      )}

      <div className="mx-auto mb-12 px-4 text-center md:px-8">
        {pricing.sr_only_title && (
          <h1 className="sr-only">{pricing.sr_only_title}</h1>
        )}
        <h2 className="mb-6 text-3xl font-bold text-pretty lg:text-4xl">
          {pricing.title}
        </h2>
        <p className="text-muted-foreground mx-auto mb-4 max-w-xl lg:max-w-none lg:text-lg">
          {pricing.description}
        </p>
      </div>

      <div className="container">
        {pricing.groups && pricing.groups.length > 0 && (
          <div className="mx-auto mt-8 mb-16 flex w-full justify-center md:max-w-lg">
            <Tabs value={group} onValueChange={setGroup} className="">
              <TabsList>
                {pricing.groups.map((item, i) => {
                  return (
                    <TabsTrigger key={i} value={item.name || ''}>
                      {item.title}
                      {item.label && (
                        <Badge className="ml-2">{item.label}</Badge>
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          </div>
        )}

        <div
          className={`mt-0 grid w-full gap-6 md:grid-cols-${
            pricing.items?.filter((item) => !item.group || item.group === group)
              ?.length
          }`}
        >
          {pricing.items?.map((item: PricingItem, idx) => {
            if (item.group && item.group !== group) {
              return null;
            }

            let isCurrentPlan = false;
            if (
              currentSubscription &&
              currentSubscription.productId === item.product_id
            ) {
              isCurrentPlan = true;
            }

            // Get currency state for this item
            const currencyState = itemCurrencies[item.product_id];
            const displayedItem = currencyState?.displayedItem || item;
            const selectedCurrency =
              currencyState?.selectedCurrency || item.currency;
            const currencies = getCurrenciesFromItem(item);

            // Calculate early bird pricing
            const earlybirdResult = calculateEarlybirdPrice(
              displayedItem,
              earlybird.isActive
            );
            const showEarlybirdDiscount = earlybird.isActive && earlybirdResult.discountedPrice !== displayedItem.price;
            const isYearly = displayedItem.interval === 'year';

            return (
              <Card key={idx} className="relative">
                {item.label && (
                  <span className="absolute inset-x-0 -top-3 mx-auto flex h-6 w-fit items-center rounded-full bg-linear-to-br/increasing from-purple-400 to-amber-300 px-3 py-1 text-xs font-medium text-amber-950 ring-1 ring-white/20 ring-offset-1 ring-offset-gray-950/5 ring-inset">
                    {item.label}
                  </span>
                )}

                <CardHeader>
                  <CardTitle className="font-medium">
                    <h3 className="text-sm font-medium">{item.title}</h3>
                  </CardTitle>

                  <div className="my-3 flex items-baseline gap-2 flex-wrap">
                    {/* Show original price when early bird is active OR when original_price exists */}
                    {(showEarlybirdDiscount || displayedItem.original_price) && (
                      <span className="text-muted-foreground text-sm line-through">
                        {showEarlybirdDiscount && isYearly
                          ? earlybirdResult.originalTotalPrice
                          : showEarlybirdDiscount
                          ? displayedItem.price
                          : displayedItem.original_price}
                      </span>
                    )}

                    <div className="my-3 block text-2xl font-semibold">
                      <span className={cn(
                        "text-primary",
                        showEarlybirdDiscount && "text-amber-600 dark:text-amber-400"
                      )}>
                        {showEarlybirdDiscount ? earlybirdResult.discountedPrice : displayedItem.price}
                      </span>{' '}
                      {displayedItem.unit ? (
                        <span className="text-muted-foreground text-sm font-normal">
                          {showEarlybirdDiscount && isYearly
                            ? (locale === 'zh' ? '/ 年' : '/ year')
                            : displayedItem.unit}
                        </span>
                      ) : (
                        ''
                      )}
                    </div>

                    {/* Show early bird badge */}
                    {showEarlybirdDiscount && (
                      <Badge variant="secondary" className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30 text-xs">
                        -70%
                      </Badge>
                    )}

                    {/* Show total price info for yearly plans */}
                    {showEarlybirdDiscount && isYearly && earlybirdResult.originalTotalPrice && (
                      <div className="w-full mt-1">
                        <p className="text-xs text-muted-foreground">
                          {locale === 'zh'
                            ? `相当于每月 ${(displayedItem.amount * 0.3 / 100 / 12).toFixed(1)} 元，直接发放全年 3600 积分`
                            : `Equivalent to ${(displayedItem.amount * 0.3 / 100 / 12).toFixed(1)}/month, 3600 credits granted immediately`
                          }
                        </p>
                      </div>
                    )}

                    {currencies.length > 1 && (
                      <Select
                        value={selectedCurrency}
                        onValueChange={(currency) =>
                          handleCurrencyChange(item.product_id, currency)
                        }
                      >
                        <SelectTrigger
                          size="sm"
                          className="border-muted-foreground/30 bg-background/50 h-6 min-w-[60px] px-2 text-xs"
                        >
                          <SelectValue placeholder="Currency" />
                        </SelectTrigger>
                        <SelectContent>
                          {currencies.map((currency) => (
                            <SelectItem
                              key={currency.currency}
                              value={currency.currency}
                              className="text-xs"
                            >
                              {currency.currency.toUpperCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <CardDescription className="text-sm">
                    {item.description}
                  </CardDescription>
                  {item.tip && (
                    <span className="text-muted-foreground text-sm">
                      {item.tip}
                    </span>
                  )}

                  {isCurrentPlan ? (
                    <Button
                      variant="outline"
                      className="mt-4 h-9 w-full px-4 py-2"
                      disabled
                    >
                      <span className="hidden text-sm md:block">
                        {t('current_plan')}
                      </span>
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handlePayment(item)}
                      disabled={isLoading}
                      className={cn(
                        'focus-visible:ring-ring inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
                        'mt-4 h-9 w-full px-4 py-2',
                        'bg-primary text-primary-foreground hover:bg-primary/90 border-[0.5px] border-white/25 shadow-md shadow-black/20'
                      )}
                    >
                      {isLoading && item.product_id === productId ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          <span className="block">{t('processing')}</span>
                        </>
                      ) : (
                        <>
                          {item.button?.icon && (
                            <SmartIcon
                              name={item.button?.icon as string}
                              className="size-4"
                            />
                          )}
                          <span className="block">{item.button?.title}</span>
                        </>
                      )}
                    </Button>
                  )}
                </CardHeader>

                <CardContent className="space-y-4">
                  <hr className="border-dashed" />

                  {item.features_title && (
                    <p className="text-sm font-medium">{item.features_title}</p>
                  )}
                  <ul className="list-outside space-y-3 text-sm">
                    {item.features?.map((item, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <Check className="size-3" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <PaymentModal
        isLoading={isLoading}
        pricingItem={pricingItem}
        onCheckout={(item, paymentProvider) =>
          handleCheckout(item, paymentProvider)
        }
      />
    </section>
  );
}
