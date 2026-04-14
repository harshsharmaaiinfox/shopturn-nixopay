import { Component, Input } from '@angular/core';
import { Menu } from '../../../../interface/menu.interface';
import {  Router } from '@angular/router';
import { isCategoryDisabled } from '../../../../utils/category.utils';

@Component({
  selector: 'app-link-box',
  templateUrl: './link-box.component.html',
  styleUrl: './link-box.component.scss'
})
export class LinkBoxComponent {

  @Input() menu: Menu

  constructor( private router: Router){
  }

  redirect(path: string) {
    if (!this.isDisabled()) {
      this.router.navigateByUrl(this.convertMenuPath(path, this.menu?.slug));
    }
  }

  private convertMenuPath(path: string, slug?: string): string {
    if (!path && !slug) return '/collections';

    if (path?.startsWith('/')) {
      return path;
    }

    const category = slug || decodeURIComponent(path).trim().toLowerCase().replace(/\s+/g, '-');

    return `/collections?sortBy=asc&category=${category}&page=1`;
  }

  isDisabled(): boolean {
    return isCategoryDisabled(this.menu?.title);
  }
}
