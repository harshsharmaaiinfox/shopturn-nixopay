import { Component, ViewEncapsulation, HostListener } from '@angular/core';
import { Select, Store } from '@ngxs/store';
import { Observable } from 'rxjs';
import { Menu, MenuModel } from '../../../interface/menu.interface';
import { ProductState } from '../../../../shared/state/product.state';
import { Product } from '../../../../shared/interface/product.interface';
import { BlogState } from '../../../../shared/state/blog.state';
import { Blog, BlogModel } from '../../../../shared/interface/blog.interface';
import { MenuState } from '../../../state/menu.state';
import { GetMenuProducts } from '../../../action/product.action';
import { Router } from '@angular/router';
import { GetSelectedBlogs } from '../../../action/blog.action';
import { MenuService } from '../../../services/menu.service';
import { ThemeOptionState } from '../../../state/theme-option.state';
import { Option } from '../../../interface/theme-option.interface';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class MenuComponent {

  @Select(ProductState.dealProducts) product$: Observable<Product[]>;
  @Select(BlogState.blog) blog$: Observable<BlogModel>;
  @Select(MenuState.menu) menu$: Observable<MenuModel>;
  @Select(ProductState.menuProducts) menuProduct$: Observable<MenuModel>;

  @Select(ThemeOptionState.themeOptions) themeOption$: Observable<Option>;

  public menu: Menu[] = [];
  public products: any[];
  public blogs: Blog[];
  public activeHoverMenu: Menu | null = null;
  private closeTimer: any = null;

  constructor(private store: Store, private router: Router, public menuService: MenuService) {
    this.menu$.subscribe(menu => {
      const productIds = Array.from(new Set(this.concatDynamicProductKeys(menu, 'product_ids')));
      if (productIds && productIds.length) {
        this.store.dispatch(new GetMenuProducts({ ids: productIds?.join() })).subscribe({
          next: (val) => {
            this.products = val.product.menuProducts.slice(0, 2);
          }
        })
      }

      const blogIds = Array.from(new Set(this.concatDynamicProductKeys(menu, 'blog_ids')));
      if (blogIds && blogIds.length) {
        this.store.dispatch(new GetSelectedBlogs({ status: 1, ids: blogIds?.join() })).subscribe({
          next: (val) => {
            this.blogs = val.blog.selectedBlogs.slice(0, 2);
          }
        })
      }
    })
  }

  redirect(path: string, menu?: Menu) {
    const newPath = this.convertMenuPath(path, menu?.slug);

    if (menu?.is_target_blank === 1) {
      window.open(newPath, '_blank');
    } else {
      this.router.navigateByUrl(newPath);
    }
  }

  private convertMenuPath(path: string, slug?: string): string {
    if (!path && !slug) return '/collections';

    // Already a proper URL path
    if (path?.startsWith('/')) {
      return path;
    }

    // Prefer the slug field (exact value from backend) over slugifying the path
    const category = slug || decodeURIComponent(path).trim().toLowerCase().replace(/\s+/g, '-');

    return `/collections?sortBy=asc&category=${category}&page=1`;
  }

  private closeAllMenus(menus: Menu[]) {
    if (!menus) return;
    menus.forEach(m => {
      m.active = false;
      if (m.child?.length) this.closeAllMenus(m.child);
    });
  }

  onNavItemEnter(menu: Menu, allMenus: Menu[]) {
    if (window.innerWidth < 1200) return;
    if (!menu.mega_menu || !menu.child?.length) return;
    if (this.closeTimer) { clearTimeout(this.closeTimer); this.closeTimer = null; }
    // Close all other menus first
    this.closeAllMenus(allMenus);
    this.activeHoverMenu = menu;
    menu.active = true;
  }

  onNavItemLeave(menu: Menu) {
    if (window.innerWidth < 1200) return;
    if (!menu.mega_menu || !menu.child?.length) return;
    this.closeTimer = setTimeout(() => {
      menu.active = false;
      this.activeHoverMenu = null;
    }, 100);
  }

  onDropdownEnter(menu: Menu) {
    if (window.innerWidth < 1200) return;
    if (this.closeTimer) { clearTimeout(this.closeTimer); this.closeTimer = null; }
    menu.active = true;
  }

  onDropdownLeave(menu: Menu) {
    if (window.innerWidth < 1200) return;
    this.closeTimer = setTimeout(() => {
      menu.active = false;
      this.activeHoverMenu = null;
    }, 100);
  }

  toggle(menu: Menu) {
    // Check if device is mobile
    const isMobile = window.innerWidth <= 991; // Bootstrap's lg breakpoint

    // Skip toggle for Men Collection (169), Women Collection (170), and Active Style (171) on desktop/laptop
    const hoverOnlyMenuIds = [169, 170, 171];
    if (!isMobile && menu.id && hoverOnlyMenuIds.includes(menu.id)) {
      return; // On desktop, these menus work on hover only
    }

    // Toggle the clicked menu
    menu.active = !menu.active;
  }

  concatDynamicProductKeys(obj: any, keyName: string) {
    const result: number[] = [];
    function traverse(obj: any) {
      for (const key in obj) {
        if (key === keyName && Array.isArray(obj[key])) {
          result.push(...obj[key]);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          traverse(obj[key]);
        } else {
          if (key === keyName && obj.product_ids) {
            result.push(obj.product_ids)
          };
        }
      }
    }
    traverse(obj);
    return result;
  }

  isDisabled(menu: Menu): boolean {
    // Add custom logic here if you need to disable specific menu items
    // For example: return menu.path === '' || menu.child?.length === 0;
    return false;
  }

}
