import { Component } from '@angular/core';
import { Store } from '@ngxs/store';

import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

import { Breadcrumb } from '../../shared/interface/breadcrumb';
import { GetNotification } from '../../shared/action/notification.action';

@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.scss']
})
export class AccountComponent {



  public open: boolean = false;
  public showSidebar: boolean = true;
  public breadcrumb: Breadcrumb = {
    title: "Dashboard",
    items: [{ label: 'Dashboard', active: false }]
  };

  constructor(private store: Store, private router: Router) {
    this.store.dispatch(new GetNotification());

    this.breadcrumb.title = this.router?.url?.split('?')[0]?.split('/')?.pop()!;
    if (this.router?.url.includes('order/details')) {
      this.breadcrumb.title = 'Order';
    }
    this.breadcrumb.items = [];
    this.breadcrumb.items.push({ label: this.breadcrumb.title, active: false });

    // Hide sidebar for bank-details page
    this.updateSidebarVisibility();

    // Listen to route changes
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updateSidebarVisibility();
    });
  }

  updateSidebarVisibility() {
    // Hide sidebar for bank-details, order pages (including order details), addresses, and dashboard
    const url = this.router?.url || '';
    this.showSidebar = !url.includes('bank-details') && !url.includes('/account/order') && !url.includes('/account/addresses') && !url.includes('/account/dashboard');
  }

  openMenu(value: boolean) {
    this.open = value;
  }

}
