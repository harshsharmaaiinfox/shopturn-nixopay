import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
@Component({
  selector: 'app-payment-success',
  templateUrl: './payment-success.component.html',
  styleUrls: ['./payment-success.component.scss']
})
export class PaymentSuccessComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  public orderId: string | null = null;
  public loading: boolean = true;
  public showRedirectMessage: boolean = false;
  public redirectCountdown: number = 5;

  private countdownInterval: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    sessionStorage.removeItem('pending_payment_cart');

    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.orderId = params['order_number'] || localStorage.getItem('order_id')?.replace(/"/g, '') || null;
      });

    // Simulate verification delay
    setTimeout(() => {
      this.loading = false;
      if (this.orderId) {
        this.showRedirectMessage = true;
        this.startCountdown();
      }
    }, 2000);
  }

  startCountdown() {
    this.countdownInterval = setInterval(() => {
      this.redirectCountdown--;
      if (this.redirectCountdown <= 0) {
        clearInterval(this.countdownInterval);
        this.goToOrderDetails();
      }
    }, 1000);
  }

  goToOrderDetails() {
    if (this.orderId) {
      this.router.navigate(['/account/order/details', this.orderId]);
    }
  }

  continueShopping() {
    this.router.navigateByUrl('/');
  }

  goToHome() {
    this.router.navigateByUrl('/');
  }

  ngOnDestroy() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }
}
