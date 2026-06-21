import { Injectable, NgZone } from '@angular/core';
import { HttpRequest, HttpHandler, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { Store, Select } from '@ngxs/store';
import { Router } from '@angular/router';
import { NotificationService } from '../../shared/services/notification.service';
import { Values } from '../../shared/interface/setting.interface';
import { SettingState } from '../../shared/state/setting.state';
import { AuthClear } from '../../shared/action/auth.action';
import { HideButtonSpinnerAction, HideLoaderAction } from '../../shared/action/loader.action';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  @Select(SettingState.setting) setting$: Observable<Values>;

  public isMaintenanceModeOn: boolean = false;

  constructor(private store: Store, private router: Router, private ngZone: NgZone,
    private notificationService: NotificationService) {
    this.setting$.subscribe(setting => {
      this.isMaintenanceModeOn = setting?.maintenance?.maintenance_mode!
    });
  }

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<any> {

    // If Maintenance Mode On
    if (this.isMaintenanceModeOn) {
      this.ngZone.run(() => {
        this.router.navigate(['/maintenance']);
      })
    }

    const token = this.store.selectSnapshot(state => state.auth.access_token);
    let headers = req.headers.set('store-id', '27');
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    req = req.clone({ headers });

    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        // Always hide the loader when any request fails, regardless of error type.
        // Without this, the loader gets stuck because the LoaderInterceptor's
        // tap(complete) never fires when an error is re-thrown here.
        this.store.dispatch(new HideLoaderAction());
        this.store.dispatch(new HideButtonSpinnerAction());

        // Only treat 401 as a session-expiry if we actually sent a token.
        // For guest users a 401 just means the endpoint requires auth — clearing
        // auth/account/cart state here would wipe their guest cart unexpectedly.
        if (error.status === 401 && token) {
          this.store.dispatch(new AuthClear());
        }
        return throwError(() => error);
      })
    );

  }
}
