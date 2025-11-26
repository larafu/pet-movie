'use client';

import { useEffect, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';

import { useSession } from '@/core/auth/client';
import { Link, usePathname, useRouter } from '@/core/i18n/navigation';
import {
  BrandLogo,
  LocaleSelector,
  SignUser,
  SmartIcon,
} from '@/shared/blocks/common';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/components/ui/accordion';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger as RawNavigationMenuTrigger,
} from '@/shared/components/ui/navigation-menu';
import { useMedia } from '@/shared/hooks/use-media';
import { cn } from '@/shared/lib/utils';
import { NavItem } from '@/shared/types/blocks/common';
import { Header as HeaderType } from '@/shared/types/blocks/landing';

// For Next.js hydration mismatch warning, conditionally render NavigationMenuTrigger only after mount to avoid inconsistency between server/client render
function NavigationMenuTrigger(
  props: React.ComponentProps<typeof RawNavigationMenuTrigger>
) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  // Only render after client has mounted, to avoid SSR/client render id mismatch
  if (!mounted) return null;
  return <RawNavigationMenuTrigger {...props} />;
}

export function Header({ header }: { header: HeaderType }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const isLarge = useMedia('(min-width: 64rem)');
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();

  // Filter navigation items based on auth requirement
  const filteredNavItems = header.nav?.items?.filter((item) => {
    // If item requires auth and user is not logged in, hide it
    if ((item as any).requiresAuth && !session) {
      return false;
    }
    return true;
  }) || [];

  useEffect(() => {
    // Listen to scroll event to enable header styles on scroll
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Navigation menu for large screens
  const NavMenu = () => {
    const menuRef = useRef<React.ElementRef<typeof NavigationMenu>>(null);

    // Calculate dynamic viewport height for animated menu
    const handleViewportHeight = (value: string) => {
      setIsNavOpen(!!value);
      requestAnimationFrame(() => {
        const menuNode = menuRef.current;
        if (!menuNode) return;

        const openContent = document.querySelector<HTMLElement>(
          '[data-slot="navigation-menu-viewport"][data-state="open"]'
        );

        if (openContent) {
          const height = openContent.scrollHeight;
          document.documentElement.style.setProperty(
            '--navigation-menu-viewport-height',
            `${height}px`
          );
        } else {
          document.documentElement.style.removeProperty(
            '--navigation-menu-viewport-height'
          );
        }
      });
    };

    return (
      <NavigationMenu
        ref={menuRef}
        onValueChange={handleViewportHeight}
        className="[--color-muted:color-mix(in_oklch,var(--color-foreground)_5%,transparent)] [--viewport-outer-px:2rem] **:data-[slot=navigation-menu-viewport]:rounded-none **:data-[slot=navigation-menu-viewport]:border-0 **:data-[slot=navigation-menu-viewport]:bg-transparent **:data-[slot=navigation-menu-viewport]:shadow-none **:data-[slot=navigation-menu-viewport]:ring-0 max-lg:hidden"
      >
        <NavigationMenuList className="gap-6">
          {filteredNavItems.map((item, idx) => (
            <NavigationMenuItem key={idx} value={item.title || ''}>
              {item.children && item.children.length > 0 ? (
                <>
                  <NavigationMenuTrigger className="flex flex-row items-center gap-2 text-sm font-cinzel font-bold uppercase tracking-widest text-foreground/80 hover:text-gold transition-colors bg-transparent hover:bg-transparent focus:bg-transparent data-[active]:bg-transparent data-[state=open]:bg-transparent">
                    {item.icon && (
                      <SmartIcon
                        name={item.icon as string}
                        className="h-4 w-4"
                      />
                    )}
                    {item.title}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="mt-4.5 origin-top pt-5 pb-14 shadow-none ring-0 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl">
                    <div className="divide-foreground/10 grid w-full min-w-6xl grid-cols-4 gap-4 divide-x pr-22">
                      <div className="col-span-2 row-span-2 grid grid-rows-subgrid gap-1 border-r-0">
                        <span className="text-gold ml-2 text-xs font-bold tracking-widest uppercase">
                          {item.title}
                        </span>
                        <ul className="mt-1 grid grid-cols-2 gap-2">
                          {item.children?.map((subItem: NavItem, iidx) => (
                            <ListItem
                              key={iidx}
                              href={subItem.url || ''}
                              title={subItem.title || ''}
                              description={subItem.description || ''}
                            >
                              {subItem.icon && (
                                <SmartIcon name={subItem.icon as string} />
                              )}
                            </ListItem>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </NavigationMenuContent>
                </>
              ) : (
                <NavigationMenuLink asChild>
                  <Link
                    href={item.url || ''}
                    target={item.target || '_self'}
                    className={`flex flex-row items-center gap-2 text-sm font-cinzel font-bold uppercase tracking-widest transition-colors ${
                      item.is_active || pathname.endsWith(item.url as string)
                        ? 'text-gold'
                        : 'text-foreground/80 hover:text-gold'
                    }`}
                  >
                    {item.icon && <SmartIcon name={item.icon as string} />}
                    {item.title}
                  </Link>
                </NavigationMenuLink>
              )}
            </NavigationMenuItem>
          ))}
        </NavigationMenuList>
      </NavigationMenu>
    );
  };

  // Mobile menu using Accordion, shown on small screens
  const MobileMenu = ({ closeMenu }: { closeMenu: () => void }) => {
    return (
      <nav
        role="navigation"
        className="w-full [--color-border:--alpha(var(--color-foreground)/5%)] [--color-muted:--alpha(var(--color-foreground)/5%)]"
      >
        <Accordion
          type="single"
          collapsible
          className="-mx-4 mt-0.5 space-y-0.5 **:hover:no-underline"
        >
          {filteredNavItems.map((item, idx) => {
            return (
              <AccordionItem
                key={idx}
                value={item.title || ''}
                className="group relative border-b-0 before:pointer-events-none before:absolute before:inset-x-4 before:bottom-0 before:border-b"
              >
                {item.children && item.children.length > 0 ? (
                  <>
                    <AccordionTrigger className="data-[state=open]:bg-muted flex items-center justify-between px-4 py-3 text-lg font-cinzel font-bold uppercase tracking-widest **:!font-normal">
                      {item.title}
                    </AccordionTrigger>
                    <AccordionContent className="pb-5">
                      <ul>
                        {item.children?.map((subItem: NavItem, iidx) => (
                          <li key={iidx}>
                            <Link
                              href={subItem.url || ''}
                              onClick={closeMenu}
                              className="grid grid-cols-[auto_1fr] items-center gap-2.5 px-4 py-2"
                            >
                              <div
                                aria-hidden
                                className="flex items-center justify-center *:size-4"
                              >
                                {subItem.icon && (
                                  <SmartIcon name={subItem.icon as string} />
                                )}
                              </div>
                              <div className="text-base">{subItem.title}</div>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </>
                ) : (
                  <Link
                    href={item.url || ''}
                    onClick={closeMenu}
                    className="data-[state=open]:bg-muted flex items-center justify-between px-4 py-3 text-lg font-cinzel font-bold uppercase tracking-widest **:!font-normal"
                  >
                    {item.title}
                  </Link>
                )}
              </AccordionItem>
            );
          })}
        </Accordion>
      </nav>
    );
  };

  // List item for submenus in NavigationMenu
  function ListItem({
    title,
    description,
    children,
    href,
    ...props
  }: React.ComponentPropsWithoutRef<'li'> & {
    href: string;
    title: string;
    description?: string;
  }) {
    return (
      <li {...props}>
        <NavigationMenuLink asChild>
          <Link href={href} className="grid grid-cols-[auto_1fr] gap-3.5 group">
            <div className="bg-white/5 ring-white/10 relative flex size-9 items-center justify-center rounded border border-transparent shadow shadow-sm ring-1 group-hover:bg-gold/20 group-hover:ring-gold/50 transition-colors">
              {children}
            </div>
            <div className="space-y-0.5">
              <div className="text-foreground text-sm font-medium group-hover:text-gold transition-colors">{title}</div>
              <p className="text-muted-foreground line-clamp-1 text-xs">
                {description}
              </p>
            </div>
          </Link>
        </NavigationMenuLink>
      </li>
    );
  }

  return (
    <>
      <header
        data-state={isMobileMenuOpen ? 'active' : 'inactive'}
        data-nav-open={isNavOpen}
        {...(isScrolled && { 'data-scrolled': true })}
        className="data-[nav-open=true]:bg-black/95 fixed inset-x-0 top-0 z-50 data-[nav-open=true]:backdrop-blur transition-all duration-300"
      >
        <div
          className={cn(
            'absolute inset-x-0 top-0 z-50 h-20 border-transparent transition-all duration-300',
            'in-data-scrolled:bg-black/80 in-data-scrolled:backdrop-blur-md in-data-scrolled:border-b in-data-scrolled:border-white/5',
            'in-data-[nav-open=true]:bg-black/95 in-data-[nav-open=true]:h-[calc(var(--navigation-menu-viewport-height)+5rem)] in-data-[nav-open=true]:border-b in-data-[nav-open=true]:border-white/5',
            'max-lg:in-data-[state=active]:bg-black/95 max-lg:h-16 max-lg:overflow-hidden max-lg:border-b max-lg:in-data-[state=active]:h-screen'
          )}
        >
          <div className="container h-full">
            <div className="relative flex h-full items-center justify-between">
              <div className="flex justify-between items-center gap-8 max-lg:w-full">
                {/* Brand Logo */}
                {/* Brand Logo */}
                {header.brand && <BrandLogo brand={header.brand} />}

                {/* Desktop Navigation Menu */}
                {isLarge && <NavMenu />}
                
                {/* Hamburger menu button for mobile navigation */}
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  aria-label={
                    isMobileMenuOpen == true ? 'Close Menu' : 'Open Menu'
                  }
                  className="relative z-20 -m-2.5 -mr-3 block cursor-pointer p-2.5 lg:hidden text-foreground"
                >
                  <Menu className="m-auto size-6 duration-200 in-data-[state=active]:scale-0 in-data-[state=active]:rotate-180 in-data-[state=active]:opacity-0" />
                  <X className="absolute inset-0 m-auto size-6 scale-0 -rotate-180 opacity-0 duration-200 in-data-[state=active]:scale-100 in-data-[state=active]:rotate-0 in-data-[state=active]:opacity-100" />
                </button>
              </div>

              {/* Show mobile menu if needed */}
              {!isLarge && isMobileMenuOpen && (
                <div className="absolute top-20 left-0 w-full bg-black/95 p-4 border-b border-white/10">
                  <MobileMenu closeMenu={() => setIsMobileMenuOpen(false)} />
                </div>
              )}

              {/* Header right section: theme toggler, locale selector, sign, buttons */}
              <div className="hidden w-full flex-wrap items-center justify-end space-y-8 in-data-[state=active]:flex max-lg:in-data-[state=active]:mt-6 md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none dark:shadow-none dark:lg:bg-transparent">
                <div className="flex w-full flex-row items-center gap-4 sm:flex-row sm:gap-6 sm:space-y-0 md:w-fit">
                  {header.show_locale ? <LocaleSelector /> : null}
                  <div className="flex-1 md:hidden"></div>
                  {header.show_sign ? (
                    <SignUser userNav={header.user_nav} />
                  ) : null}

                  {header.buttons &&
                    header.buttons.map((button, idx) => (
                      <Link
                        key={idx}
                        href={button.url || ''}
                        target={button.target || '_self'}
                        className={cn(
                          'focus-visible:ring-ring inline-flex items-center justify-center gap-2 rounded-full text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-1 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
                          'h-9 px-5 ring-0',
                          button.variant === 'outline'
                            ? 'bg-white/5 border border-white/10 hover:bg-white/10 text-foreground'
                            : 'bg-gold text-black hover:bg-gold/90 shadow-gold hover:shadow-gold/80'
                        )}
                      >
                        {button.icon && (
                          <SmartIcon name={button.icon as string} />
                        )}
                        <span>{button.title}</span>
                      </Link>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
