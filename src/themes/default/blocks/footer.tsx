import { Link } from '@/core/i18n/navigation';
import {
  BrandLogo,
  BuiltWith,
  Copyright,
  LocaleSelector,
  ThemeToggler,
} from '@/shared/blocks/common';
import { SmartIcon } from '@/shared/blocks/common/smart-icon';
import { NavItem } from '@/shared/types/blocks/common';
import { Footer as FooterType } from '@/shared/types/blocks/landing';

export function Footer({ footer }: { footer: FooterType }) {
  return (
    <footer
      id={footer.id}
      className={`py-16 sm:py-24 ${footer.className || ''} overflow-x-hidden bg-black relative`}
    >
      {/* Cinematic Gradient Top */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-background to-transparent opacity-50 pointer-events-none" />

      <div className="container space-y-16 overflow-x-hidden relative z-10">
        
        {/* End Credits Section */}
        <div className="flex flex-col items-center justify-center text-center space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-24 text-center">
            <div className="space-y-3 group">
              <h3 className="font-cinzel text-gold/70 tracking-[0.2em] text-xs uppercase group-hover:text-gold transition-colors">Cast</h3>
              <p className="text-foreground font-medium text-lg tracking-wide">Your Pet</p>
            </div>
            <div className="space-y-3 group">
              <h3 className="font-cinzel text-gold/70 tracking-[0.2em] text-xs uppercase group-hover:text-gold transition-colors">Director</h3>
              <p className="text-foreground font-medium text-lg tracking-wide">AI</p>
            </div>
            <div className="space-y-3 group">
              <h3 className="font-cinzel text-gold/70 tracking-[0.2em] text-xs uppercase group-hover:text-gold transition-colors">Production</h3>
              <p className="text-foreground font-medium text-lg tracking-wide">Pet Movie Studios</p>
            </div>
          </div>
          
          <div className="h-px w-32 bg-gradient-to-r from-transparent via-gold/40 to-transparent mx-auto" />
          
          <p className="font-cinzel text-gold/50 tracking-[0.3em] text-xs uppercase animate-pulse">
            Made with love in Hollywood
          </p>
        </div>

        {/* Standard Footer Links (Subtle) */}
        <div className="grid min-w-0 gap-12 md:grid-cols-5 opacity-60 hover:opacity-100 transition-opacity duration-500">
          <div className="min-w-0 space-y-4 break-words md:col-span-2 md:space-y-6">
            {footer.brand ? (
               <div className="flex items-center gap-2">
                 <span className="font-cinzel font-bold text-lg text-foreground">PET MOVIE</span>
                 <span className="font-bold text-[10px] text-gold">.AI</span>
               </div>
            ) : null}

            {footer.brand?.description ? (
              <p
                className="text-muted-foreground text-sm text-balance break-words"
                dangerouslySetInnerHTML={{ __html: footer.brand.description }}
              />
            ) : null}
          </div>

          <div className="col-span-3 grid min-w-0 gap-6 sm:grid-cols-3">
            {footer.nav?.items.map((item, idx) => (
              <div key={idx} className="min-w-0 space-y-4 text-sm break-words">
                <span className="block font-medium break-words text-gold/80 uppercase tracking-wider text-xs">
                  {item.title}
                </span>

                <div className="flex min-w-0 flex-wrap gap-4 sm:flex-col">
                  {item.children?.map((subItem, iidx) => (
                    <Link
                      key={iidx}
                      href={subItem.url || ''}
                      target={subItem.target || ''}
                      className="text-muted-foreground hover:text-gold block break-words duration-150"
                    >
                      <span className="break-words">{subItem.title || ''}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-4 sm:gap-8 opacity-40 hover:opacity-80 transition-opacity">
          {footer.show_built_with !== false ? <BuiltWith /> : null}
          <div className="min-w-0 flex-1" />
          {footer.show_theme !== false ? <ThemeToggler type="toggle" /> : null}
          {footer.show_locale !== false ? (
            <LocaleSelector type="button" />
          ) : null}
        </div>

        <div
          aria-hidden
          className="h-px min-w-0 [background-image:linear-gradient(90deg,var(--color-foreground)_1px,transparent_1px)] bg-[length:6px_1px] bg-repeat-x opacity-10"
        />
        <div className="flex min-w-0 flex-wrap justify-between gap-8 text-xs text-muted-foreground/60">
          {footer.copyright ? (
            <p
              className="text-balance break-words"
              dangerouslySetInnerHTML={{ __html: footer.copyright }}
            />
          ) : footer.brand ? (
            <Copyright brand={footer.brand} />
          ) : null}

          <div className="min-w-0 flex-1"></div>

          {footer.agreement ? (
            <div className="flex min-w-0 flex-wrap items-center gap-4">
              {footer.agreement?.items.map((item: NavItem, index: number) => (
                <Link
                  key={index}
                  href={item.url || ''}
                  target={item.target || ''}
                  className="hover:text-gold block break-words underline duration-150"
                >
                  {item.title || ''}
                </Link>
              ))}
            </div>
          ) : null}

          {footer.social ? (
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {footer.social?.items.map((item: NavItem, index) => (
                <Link
                  key={index}
                  href={item.url || ''}
                  target={item.target || ''}
                  className="hover:text-gold bg-white/5 block cursor-pointer rounded-full p-2 duration-150 hover:bg-white/10"
                >
                  {item.icon && (
                    <SmartIcon name={item.icon as string} size={16} />
                  )}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
