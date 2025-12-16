'use client';

import { Link } from '@/core/i18n/navigation';
import { SmartIcon } from '@/shared/blocks/common/smart-icon';
import { Button } from '@/shared/components/ui/button';
import { ScrollAnimation } from '@/shared/components/ui/scroll-animation';
import { CTA as CTAType } from '@/shared/types/blocks/landing';
import { useAppContext } from '@/shared/contexts/app';

export function CTA({ cta, className }: { cta: CTAType; className?: string }) {
  const { user } = useAppContext();

  // Helper function to get correct URL based on login status
  // 根据用户登录状态处理URL跳转
  const getButtonUrl = (originalUrl: string) => {
    // If user is logged in and URL is /sign-up, redirect to creations
    // 已登录用户访问注册页时，重定向到 creations
    if (user && originalUrl === '/sign-up') {
      return '/creations';
    }
    // Redirect /pricing to /creations (pricing not ready yet)
    // pricing 页面暂未上线，重定向到 creations
    if (originalUrl === '/pricing') {
      return '/creations';
    }
    return originalUrl;
  };
  return (
    <section id={cta.id} className={`py-16 md:py-24 ${className}`}>
      <div className="container">
        <div className="text-center">
          <ScrollAnimation>
            <h2 className="text-4xl font-semibold text-balance lg:text-5xl">
              {cta.title}
            </h2>
          </ScrollAnimation>
          <ScrollAnimation delay={0.15}>
            <p
              className="mt-4"
              dangerouslySetInnerHTML={{ __html: cta.description ?? '' }}
            />
          </ScrollAnimation>

          <ScrollAnimation delay={0.3}>
            <div className="mt-12 flex flex-wrap justify-center gap-4">
              {cta.buttons?.map((button, idx) => (
                <Button
                  asChild
                  size={button.size || 'default'}
                  variant={button.variant || 'default'}
                  key={idx}
                >
                  <Link
                    href={getButtonUrl(button.url || '')}
                    target={button.target || '_self'}
                  >
                    {button.icon && <SmartIcon name={button.icon as string} />}
                    <span>{button.title}</span>
                  </Link>
                </Button>
              ))}
            </div>
          </ScrollAnimation>
        </div>
      </div>
    </section>
  );
}
