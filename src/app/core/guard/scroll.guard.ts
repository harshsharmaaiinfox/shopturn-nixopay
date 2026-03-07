import { Injectable } from '@angular/core';
import { Event, Scroll, Router } from '@angular/router';
import { ViewportScroller } from '@angular/common';
import { filter } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ScrollPositionGuard {
  private previousUrl: string | null = null;

  constructor(private viewportScroller: ViewportScroller, private router: Router) {
    this.router.events.pipe(filter((e: Event): e is Scroll => e instanceof Scroll))
      .subscribe((e) => {
        const routerEvent = e.routerEvent;
        const currentUrl = ('urlAfterRedirects' in routerEvent ? routerEvent.urlAfterRedirects : routerEvent.url).split('?')[0];
        const prevUrl = this.previousUrl ? this.previousUrl.split('?')[0] : null;

        if (e.position) {
          // Back/forward navigation
          this.viewportScroller.scrollToPosition(e.position);
        } else if (prevUrl !== currentUrl) {
          // Path changed or initial navigation - scroll to top (or 150 for collections/account)
          if (currentUrl.includes('collections') || currentUrl.includes('account')) {
            this.viewportScroller.scrollToPosition([150, 150]);
          } else {
            this.viewportScroller.scrollToPosition([0, 0]);
          }
        }
        // If it's a query param change (prevUrl === currentUrl), we do nothing and stay in place

        this.previousUrl = 'urlAfterRedirects' in routerEvent ? routerEvent.urlAfterRedirects : routerEvent.url;
      });
  }

  canActivate(): boolean {
    return true;
  }
}
