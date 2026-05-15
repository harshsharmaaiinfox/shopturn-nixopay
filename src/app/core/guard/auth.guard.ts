import { Injectable } from '@angular/core';
import { Store } from '@ngxs/store';
import { UrlTree, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './../../shared/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard {

  constructor(
    private store: Store,
    private router: Router,
    private authService: AuthService
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | UrlTree {

    this.authService.redirectUrl = state.url;

    if (!this.store.selectSnapshot((s: any) => s.auth?.access_token)) {
      return this.router.createUrlTree(['/auth/login']);
    }

    return true;
  }

  canActivateChild(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | UrlTree {
    if (!!this.store.selectSnapshot((s: any) => s.auth?.access_token)) {
      if (this.router.url.startsWith('/account') || this.router.url === '/checkout' || this.router.url === '/compare') {
        this.router.navigate(['/']);
      }
      return false;
    }
    return true;
  }
}
