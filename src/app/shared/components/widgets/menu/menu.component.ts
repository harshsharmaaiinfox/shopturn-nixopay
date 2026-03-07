import { Component, ViewEncapsulation } from '@angular/core';
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
    // Convert old URL format to new query parameter format
    let newPath = this.convertMenuPath(path);

    // Check if link should open in new tab
    if (menu?.is_target_blank === 1) {
      window.open(newPath, '_blank');
    } else {
      this.router.navigateByUrl(newPath);
    }
  }

  private convertMenuPath(path: string): string {
    // If path already starts with /collections, return it as-is
    if (path.startsWith('/collections')) {
      return path;
    }

    // Extract category from path - handle various formats
    let category = '';

    // Handle URL-encoded spaces and special characters
    const decodedPath = decodeURIComponent(path);

    // Common category mappings
    const categoryMappings: { [key: string]: string } = {
      'dress collection': 'dresses',
      'dresses': 'dresses',
      'jeans': 'jeans',
      'shirts': 'shirts',
      'shirt': 'shirts',
      'tees': 't-shirts',
      't-shirts': 't-shirts',
      't shirt': 't-shirts',
      'kurta': 'kurtas',
      'kurtas': 'kurtas',
      'sherwani': 'sherwani-sets',
      'lehenga': 'lehenga-choli-sets',
      'saree': 'lehenga-choli-sets',
      'sarees': 'lehenga-choli-sets',
      'winter': 'winter-essentials',
      'women jeans': 'women-s-jeans'
    };

    // Try to find category in path
    const lowerPath = decodedPath.toLowerCase();

    for (const [key, value] of Object.entries(categoryMappings)) {
      if (lowerPath.includes(key)) {
        category = value;
        break;
      }
    }

    // If category found, return formatted URL
    if (category) {
      return `/?sortBy=asc&category=${category}&page=1`;
    }

    // If no conversion needed, return original path
    return path;
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
