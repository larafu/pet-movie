import { Fragment } from 'react';

import { Link } from '@/core/i18n/navigation';
import {
  LocaleSelector,
  SmartIcon,
  ThemeToggler,
} from '@/shared/blocks/common';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/shared/components/ui/breadcrumb';
import { Button } from '@/shared/components/ui/button';
import { Separator } from '@/shared/components/ui/separator';
import { SidebarTrigger } from '@/shared/components/ui/sidebar';
import { Button as ButtonType, Crumb } from '@/shared/types/blocks/common';

export function Header({
  title,
  crumbs,
  buttons,
  show_locale,
  show_theme,
}: {
  title?: string;
  crumbs?: Crumb[];
  buttons?: ButtonType[];
  show_locale?: boolean;
  show_theme?: boolean;
}) {
  return (
    <header className="relative flex h-(--header-height) shrink-0 items-center gap-2 border-b backdrop-blur-md bg-background/80 transition-all duration-300 ease-in-out group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height) hover:shadow-md">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1 transition-transform duration-200 hover:scale-110" />
        {crumbs && crumbs.length > 0 && (
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4 opacity-60"
          />
        )}
        {crumbs && crumbs.length > 0 && (
          <Breadcrumb>
            <BreadcrumbList>
              {crumbs.map((crumb, index) => (
                <Fragment key={index}>
                  <BreadcrumbItem className="hidden md:block">
                    {crumb.is_active ? (
                      <BreadcrumbPage className="font-medium text-foreground">
                        {crumb.title}
                      </BreadcrumbPage>
                    ) : (
                      <Link
                        href={crumb.url || ''}
                        className="transition-colors duration-200 hover:text-primary"
                      >
                        {crumb.title}
                      </Link>
                    )}
                  </BreadcrumbItem>
                  {index < crumbs.length - 1 && (
                    <BreadcrumbSeparator className="hidden md:block opacity-50" />
                  )}
                </Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        )}
        <div className="ml-auto flex items-center gap-3">
          {buttons && buttons.length > 0 && (
            <div className="flex items-center gap-2">
              {buttons.map((button, idx) => (
                <Button
                  key={idx}
                  variant={button.variant || 'outline'}
                  size="sm"
                  className="transition-all duration-200 hover:scale-105 hover:shadow-sm"
                >
                  <Link
                    href={button.url || ''}
                    target={button.target || '_self'}
                    className="flex items-center gap-2"
                  >
                    {button.icon && <SmartIcon name={button.icon as string} />}
                    {button.title}
                  </Link>
                </Button>
              ))}
            </div>
          )}
          {show_theme !== false && (
            <ThemeToggler
              type="icon"
              className="p-2 rounded-full transition-all duration-200 hover:bg-primary/10 hover:scale-110"
            />
          )}
          {show_locale !== false && (
            <LocaleSelector
              type="button"
            />
          )}
        </div>
      </div>
    </header>
  );
}
