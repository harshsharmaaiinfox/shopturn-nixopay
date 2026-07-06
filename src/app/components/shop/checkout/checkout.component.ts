import { Component, ElementRef, TemplateRef, ViewChild, OnDestroy } from '@angular/core';
import { AuthService } from '../../../shared/services/auth.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { Store, Select } from '@ngxs/store';
import { FormBuilder, FormControl, FormGroup, Validators, FormArray } from '@angular/forms';
import { Select2Data, Select2UpdateEvent } from 'ng-select2-component';
import { Router } from '@angular/router';
import { Observable, Subscription, map, of, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Breadcrumb } from '../../../shared/interface/breadcrumb';
import { AccountUser } from "../../../shared/interface/account.interface";
import { AccountState } from '../../../shared/state/account.state';
import { CartState } from '../../../shared/state/cart.state';
import { OrderState } from '../../../shared/state/order.state';
import { Checkout, PlaceOrder } from '../../../shared/action/order.action';
import { ClearCart, SyncCart, GetCartItems } from '../../../shared/action/cart.action';
import { Register, Login } from '../../../shared/action/auth.action';
import { AddressModalComponent } from '../../../shared/components/widgets/modal/address-modal/address-modal.component';
import { Cart } from '../../../shared/interface/cart.interface';
import { SettingState } from '../../../shared/state/setting.state';
import { GetSettingOption } from '../../../shared/action/setting.action';
import { OrderCheckout } from '../../../shared/interface/order.interface';
import { Values, DeliveryBlock } from '../../../shared/interface/setting.interface';
import { CartService } from '../../../shared/services/cart.service';
import { CountryState } from '../../../shared/state/country.state';
import { StateState } from '../../../shared/state/state.state';
import { AuthState } from '../../../shared/state/auth.state';
import * as data from '../../../shared/data/country-code';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { DomSanitizer } from '@angular/platform-browser';
import { interval } from 'rxjs';
import { delay, switchMap, takeWhile, tap } from 'rxjs/operators';
import { OrderService } from '../../../shared/services/order.service';
import { v4 as uuidv4 } from 'uuid';
// import { PaymentInitModal } from 'pg-test-project';
// import * as React from 'react';

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss']
})
export class CheckoutComponent implements OnDestroy {

  public breadcrumb: Breadcrumb = {
    title: "Checkout",
    items: [{ label: 'Checkout', active: true }]
  }

  private destroy$ = new Subject<void>();

  @Select(AccountState.user) user$: Observable<AccountUser>;
  @Select(AuthState.accessToken) accessToken$: Observable<string>;
  @Select(CartState.cartItems) cartItem$: Observable<Cart[]>;
  @Select(OrderState.checkout) checkout$: Observable<OrderCheckout>;
  @Select(SettingState.setting) setting$: Observable<Values>;
  @Select(CartState.cartHasDigital) cartDigital$: Observable<boolean | number>;
  @Select(CountryState.countries) countries$: Observable<Select2Data>;

  @ViewChild("addressModal") AddressModal: AddressModalComponent;
  @ViewChild('cpn', { static: false }) cpnRef: ElementRef<HTMLInputElement>;
  @ViewChild("payByQRModal") payByQRModal: TemplateRef<any>;
  @ViewChild('checkoutOtpModal') checkoutOtpModal: TemplateRef<any>;

  public form: FormGroup;
  public loginForm: FormGroup;
  public showLogin: boolean = false;
  public coupon: boolean = true;
  public couponCode: string;
  public appliedCoupon: boolean = false;
  public couponError: string | null;
  public checkoutTotal: OrderCheckout;
  public loading: boolean = false;

  public shippingStates$: Observable<Select2Data>;
  public billingStates$: Observable<Select2Data>;
  public codes = data.countryCodes;

  public formData!: any;

  private pollingSubscription!: Subscription;
  private pollingInterval = 5000; // Poll every 5 seconds

  storeData: any;
  localUserCheck: any;

  payByNeoKredIntentSaveData: any;
  payByNeoStep = 0;
  payment_method = '';
  registerLoading = false;
  public otpForm: FormGroup;
  public checkoutRegistrationEmail: string = '';
  private checkoutOtpModalRef: any;
  private pendingGuestItems: any[] = [];

  // Calculate cart totals with shipping and tax as zero (shown regardless of login)
  getCalculatedTotals() {
    const items = this.store.selectSnapshot(CartState.cartItems) || [];
    const subTotal = items.reduce((total, item) => {
      const itemPrice = item.variation ? item.variation.sale_price : (item.wholesale_price || item.product?.sale_price || 0);
      return total + (itemPrice * item.quantity);
    }, 0);

    return {
      sub_total: subTotal,
      shipping_total: 0,
      tax_total: 0,
      total: subTotal
    };
  }

  // Sub Paisa Config
  // @ViewChild('SubPaisaSdk', { static: true }) containerRef!: ElementRef;
  // formData = {
  //   env: 'stag',
  //   clientCode: 'LPS01',
  //   onToggle:() =>this.render(false) 
  // };
  // reactRoot: any = null;

  constructor(
    private store: Store, private router: Router,
    private formBuilder: FormBuilder, public cartService: CartService,
    private modalService: NgbModal,
    private sanitizer: DomSanitizer,
    private orderService: OrderService,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {
    this.otpForm = this.formBuilder.group({
      otp: new FormControl('', [Validators.required, Validators.minLength(6)])
    });
    this.loginForm = this.formBuilder.group({
      email: new FormControl('', [Validators.required, Validators.email]),
      password: new FormControl('', [Validators.required])
    });
    this.store.dispatch(new GetSettingOption());

    this.form = this.formBuilder.group({
      products: this.formBuilder.array([], [Validators.required]),
      shipping_address_id: new FormControl('', [Validators.required]),
      billing_address_id: new FormControl('', [Validators.required]),
      points_amount: new FormControl(false),
      wallet_balance: new FormControl(false),
      coupon: new FormControl(),
      delivery_description: new FormControl('', [Validators.required]),
      delivery_interval: new FormControl(),
      payment_method: new FormControl('', [Validators.required]),
      create_account: new FormControl(false),
      name: new FormControl('', [Validators.required]),
      email: new FormControl('', [Validators.required, Validators.email]),
      country_code: new FormControl('91', [Validators.required]),
      phone: new FormControl('', [Validators.required]),
      password: new FormControl(),
      shipping_address: new FormGroup({
        title: new FormControl(''),
        street: new FormControl(''),
        city: new FormControl(''),
        phone: new FormControl(''),
        pincode: new FormControl(''),
        country_code: new FormControl('91'),
        country_id: new FormControl(''),
        state_id: new FormControl(''),
      }),
      billing_address: new FormGroup({
        same_shipping: new FormControl(false),
        title: new FormControl(''),
        street: new FormControl(''),
        city: new FormControl(''),
        phone: new FormControl(''),
        pincode: new FormControl(''),
        country_code: new FormControl('91'),
        country_id: new FormControl(''),
        state_id: new FormControl(''),
      })
    });

    this.store.selectSnapshot(state => state.setting).setting.activation.guest_checkout = true;

    if (this.store.selectSnapshot(state => state.auth && state.auth.access_token)) {
      this.form.removeControl('create_account');
      this.form.removeControl('name');
      this.form.removeControl('email');
      this.form.removeControl('country_code');
      this.form.removeControl('phone');
      this.form.removeControl('password');
      this.form.removeControl('password_confirmation');
      this.form.removeControl('shipping_address');
      this.form.removeControl('billing_address');

      this.cartDigital$.pipe(takeUntil(this.destroy$)).subscribe(value => {
        if (value == 1) {
          this.form.controls['shipping_address_id'].clearValidators();
          this.form.controls['delivery_description'].clearValidators();
        } else {
          this.form.controls['shipping_address_id'].setValidators([Validators.required]);
          this.form.controls['delivery_description'].setValidators([Validators.required]);
        }
        this.form.controls['shipping_address_id'].updateValueAndValidity();
        this.form.controls['delivery_description'].updateValueAndValidity();
      });

      // Trigger checkout when shipping address changes
      this.form.controls['shipping_address_id'].valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
        if (this.form.controls['shipping_address_id'].valid && this.form.controls['delivery_description'].valid) {
          this.checkout();
        }
      });

      // Trigger checkout when delivery description changes
      this.form.controls['delivery_description'].valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
        if (this.form.controls['shipping_address_id'].valid && this.form.controls['delivery_description'].valid) {
          this.checkout();
        }
      });

      // Trigger checkout when payment method changes
      this.form.controls['payment_method'].valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
        if (this.form.valid) {
          this.checkout();
        }
      });

    } else {

      if (this.store.selectSnapshot(state => state.setting).setting.activation.guest_checkout) {
        this.form.removeControl('shipping_address_id');
        this.form.removeControl('billing_address_id');
        this.form.removeControl('points_amount');
        this.form.removeControl('wallet_balance');

        this.form.controls['create_account'].valueChanges.pipe(takeUntil(this.destroy$)).subscribe(value => {
          if (value) {
            this.form.controls['name'].setValidators([Validators.required]);
            this.form.controls['password'].setValidators([Validators.required]);
          } else {
            this.form.controls['name'].clearValidators();
            this.form.controls['password'].clearValidators();
          }
          this.form.controls['name'].updateValueAndValidity();
          this.form.controls['password'].updateValueAndValidity();
        });

        this.form.statusChanges.pipe(takeUntil(this.destroy$)).subscribe(value => {
          if (value == 'VALID') {
            this.checkout();
          }
        });

      }

    }

    this.form.get('billing_address.same_shipping')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(value => {
      if (value) {
        this.form.get('billing_address.title')?.setValue(this.form.get('shipping_address.title')?.value);
        this.form.get('billing_address.street')?.setValue(this.form.get('shipping_address.street')?.value);
        this.form.get('billing_address.country_id')?.setValue(this.form.get('shipping_address.country_id')?.value);
        this.form.get('billing_address.state_id')?.setValue(this.form.get('shipping_address.state_id')?.value);
        this.form.get('billing_address.city')?.setValue(this.form.get('shipping_address.city')?.value);
        this.form.get('billing_address.pincode')?.setValue(this.form.get('shipping_address.pincode')?.value);
        this.form.get('billing_address.country_code')?.setValue(this.form.get('shipping_address.country_code')?.value);
        this.form.get('billing_address.phone')?.setValue(this.form.get('shipping_address.phone')?.value);
      } else {
        this.form.get('billing_address.title')?.setValue('');
        this.form.get('billing_address.street')?.setValue('');
        this.form.get('billing_address.country_id')?.setValue('');
        this.form.get('billing_address.state_id')?.setValue('');
        this.form.get('billing_address.city')?.setValue('');
        this.form.get('billing_address.pincode')?.setValue('');
        this.form.get('billing_address.country_code')?.setValue('');
        this.form.get('billing_address.phone')?.setValue('');
      }
    });

    this.cartService.getUpdateQtyClickEvent().pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.products();
      this.checkout();
    });

    this.form.controls['phone']?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((value) => {
      if (value && value.toString().length > 10) {
        this.form.controls['phone']?.setValue(+value.toString().slice(0, 10));
      }
    });

    this.form.get('shipping_address.phone')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((value) => {
      if (value && value.toString().length > 10) {
        this.form.get('shipping_address.phone')?.setValue(+value.toString().slice(0, 10));
      }
    });

    this.form.get('billing_address.phone')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((value) => {
      if (value && value.toString().length > 10) {
        this.form.get('billing_address.phone')?.setValue(+value.toString().slice(0, 10));
      }
    });

    this.localUserCheck = JSON.parse(localStorage.getItem('account') || '');

  }

  get productControl(): FormArray {
    return this.form.get("products") as FormArray;
  }

  // private render(isOpen: boolean){
  //   this.reactRoot.render(
  //     React.createElement(PaymentInitModal, { ...this.formData as any, isOpen })
  //   )
  // }

  ngOnInit() {
    this.checkout$.pipe(takeUntil(this.destroy$)).subscribe(data => this.checkoutTotal = data);

    // Ensure cart is populated when entering checkout (guards against state being empty
    // after page refresh or direct navigation before storage plugin hydration completes)
    this.ensureCartLoaded();

    this.products();

    // Restore cart if user returned from incomplete payment
    const savedCart = sessionStorage.getItem('pending_payment_cart');
    if (savedCart) {
      try {
        const cartItems = JSON.parse(savedCart);
        if (cartItems?.length) {
          this.store.dispatch(new SyncCart(cartItems));
        }
      } catch (e) {
        console.error('Error restoring cart:', e);
      }
      sessionStorage.removeItem('pending_payment_cart');
    }

    // Trigger initial checkout if form is already valid (for logged-in users with saved addresses)
    setTimeout(() => {
      if (this.form.valid && this.store.selectSnapshot(state => state.auth && state.auth.access_token)) {
        this.checkout();
      }
    }, 500);
  }

  private ensureCartLoaded() {
    const isAuth = !!this.store.selectSnapshot(state => state.auth?.access_token);

    if (isAuth) {
      this.store.dispatch(new GetCartItems());
      return;
    }

    // Guest user: if NGXS state is empty but localStorage has a cart, sync it back into state
    const stateItems = this.store.selectSnapshot(CartState.cartItems);
    if (stateItems && stateItems.length) {
      return;
    }

    try {
      const stored = localStorage.getItem('cart');
      if (!stored) return;
      const cartData = JSON.parse(stored);
      if (cartData?.items?.length) {
        this.store.reset({
          ...this.store.snapshot(),
          cart: {
            ...this.store.snapshot().cart,
            items: cartData.items,
            total: cartData.total || 0,
            is_digital_only: cartData.is_digital_only ?? null,
          }
        });
      }
    } catch (e) {
      console.warn('Cart restore from localStorage failed:', e);
    }
  }

  products() {
    this.cartItem$.pipe(takeUntil(this.destroy$)).subscribe(items => {
      this.productControl.clear();
      items.forEach((item: Cart) =>
        this.productControl.push(
          this.formBuilder.group({
            product_id: new FormControl(item?.product_id, [Validators.required]),
            variation_id: new FormControl(item?.variation_id ? item?.variation_id : ''),
            quantity: new FormControl(item?.quantity),
          })
        ));
    });
  }

  registerGuest() {
    const nameCtrl = this.form.get('name');
    const emailCtrl = this.form.get('email');
    const phoneCtrl = this.form.get('phone');
    const passwordCtrl = this.form.get('password');

    nameCtrl?.setValidators([Validators.required]);
    passwordCtrl?.setValidators([Validators.required]);
    nameCtrl?.updateValueAndValidity();
    passwordCtrl?.updateValueAndValidity();

    nameCtrl?.markAsTouched();
    emailCtrl?.markAsTouched();
    phoneCtrl?.markAsTouched();
    passwordCtrl?.markAsTouched();

    if (nameCtrl?.invalid || emailCtrl?.invalid || phoneCtrl?.invalid || passwordCtrl?.invalid) {
      return;
    }

    const payload = {
      name: nameCtrl?.value,
      email: emailCtrl?.value,
      phone: Number(phoneCtrl?.value),
      country_code: Number(this.form.get('country_code')?.value || 91),
      password: passwordCtrl?.value,
      password_confirmation: passwordCtrl?.value,
    };

    // Snapshot current guest cart so we can push it to server after OTP verify
    this.pendingGuestItems = this.store.selectSnapshot(state => state.cart?.items) || [];

    this.registerLoading = true;
    this.store.dispatch(new Register(payload)).subscribe({
      complete: () => {
        this.registerLoading = false;
        this.checkoutRegistrationEmail = payload.email;
        this.otpForm.reset();
        this.checkoutOtpModalRef = this.modalService.open(this.checkoutOtpModal, {
          centered: true,
          backdrop: false,
          keyboard: false,
          windowClass: 'otp-verify-modal'
        });
      },
      error: () => { this.registerLoading = false; }
    });
  }

  verifyCheckoutOtp() {
    this.otpForm.markAllAsTouched();
    if (this.otpForm.invalid) return;

    this.authService.verifyRegistrationOtp({
      email: this.checkoutRegistrationEmail,
      otp: this.otpForm.value.otp
    }).subscribe({
      next: () => {
        this.checkoutOtpModalRef?.close();
        this.showLogin = true;
        this.loginForm.controls['email'].setValue(this.checkoutRegistrationEmail);
        this.notificationService.showSuccess('Account verified successfully! Please log in with your password.');
      },
      error: (err) => {
        this.notificationService.showError(err?.error?.message || 'Invalid OTP. Please try again.');
      }
    });
  }

  checkoutLogin() {
    this.loginForm.markAllAsTouched();
    if (this.loginForm.valid) {
      this.loading = true;
      this.store.dispatch(new Login(this.loginForm.value)).subscribe({
        next: () => {
          this.loading = false;
          // Sync Cart Storage when successfully Login
          let syncCartItems: any[] = [];
          const items = this.store.selectSnapshot(CartState.cartItems) || [];
          items.forEach((item: Cart) => {
            if (item) {
              syncCartItems.push({
                id: null,
                product: item?.product,
                product_id: item?.product_id,
                variation: item?.variation ? item.variation : null,
                variation_id: item?.variation_id ? item.variation_id : null,
                quantity: item.quantity
              });
            }
          });
          if (syncCartItems.length) {
            this.store.dispatch(new SyncCart(syncCartItems)).subscribe({
              complete: () => {
                this.store.dispatch(new GetCartItems()).subscribe({
                  complete: () => {
                    window.location.reload();
                  }
                });
              }
            });
          } else {
            this.store.dispatch(new GetCartItems()).subscribe({
              complete: () => {
                window.location.reload();
              }
            });
          }
        },
        error: (err) => {
          this.loading = false;
          this.notificationService.showError(err?.message || 'Login failed. Please check your credentials.');
        }
      });
    }
  }

  goToLogin() {
    this.router.navigate(['/auth/login'], { queryParams: { returnUrl: '/checkout' } });
  }

  // TrackBy function for performance optimization
  trackByPaymentMethod(index: number, payment: any): string {
    return payment?.name || index;
  }

  trackByCartItem(index: number, item: Cart): number {
    return item?.id || index;
  }

  selectShippingAddress(id: number) {
    if (id) {
      this.form.controls['shipping_address_id'].setValue(Number(id));
      this.checkout();
    }
  }

  selectBillingAddress(id: number) {
    if (id) {
      this.form.controls['billing_address_id'].setValue(Number(id));
      this.checkout();
    }
  }

  selectDelivery(value: DeliveryBlock) {
    this.form.controls['delivery_description'].setValue(value?.delivery_description);
    this.form.controls['delivery_interval'].setValue(value?.delivery_interval);
    this.checkout();
  }

  selectPaymentMethod(value: string) {
    this.form.controls['payment_method'].setValue(value);
    this.payment_method = value;
    switch (value) {
      case 'neoKred':
        this.checkout(value);
        break;
      case 'sub_paisa':
        this.checkout(value);
        break;
      case 'cash_free':
        this.checkout(value);
        break;
      case 'zyaada_pay':
        this.checkout(value);
        break;
      case 'ease_buzz':
        this.checkout(value);
        break;
      case 'neoKred2':
        this.checkout(value);
        break;
      case 'Shop Trurn Life_nabu':
        this.checkout(value);
        break;
      case 'payu_shoplite':
        this.checkout(value);
        break;
      case 'payu_rapportmart':
        this.checkout(value);
        break;
      case 'turnlife_nabu_nsdl':
        this.checkout(value);
        break;
      case 'turnlife_nabu_airpay':
        this.checkout(value);
        break;
      case 'turnlife_jio':
        this.checkout(value);
        break;
      default:
        break;
    }
  }

  // SubPaisa
  initiateSubPaisa(payment_method: string, uuid: any, order_result: any) {
    const userData = localStorage.getItem('account');
    const payload = {
      uuid,
      ...JSON.parse(userData || '').user,
      checkout: this.checkoutTotal
    }
    this.cartService.initiateSubPaisa(
      {
        uuid: payload.uuid,
        email: payload.email,
        total: this.checkoutTotal?.total?.total,
        phone: JSON.parse(userData || '').user.phone,
        name: JSON.parse(userData || '').user.name,
        address: JSON.parse(userData || '').user.address[0].city + ' ' + JSON.parse(userData || '').user.address[0].area
      }
    ).subscribe({
      next: (data) => {
        if (data) {
          this.formData = this.sanitizer.bypassSecurityTrustHtml(data?.data);
          const container = document.getElementById('paymentContainer');

          if (container) {
            container.innerHTML = data.data;
            const form = container.querySelector('form') as HTMLFormElement;

            // Store payment info in session storage
            sessionStorage.setItem('payment_uuid', uuid);
            sessionStorage.setItem('payment_method', payment_method);
            sessionStorage.setItem('payment_action', JSON.stringify(this.form.value));
            localStorage.setItem('order_id', JSON.stringify(order_result.order_number));
            // Submit the form in the current window
            form.target = '_self';
            form.submit();
          }
        }
      },
      error: (err) => {
        console.log(err);
      }
    });
  }

  // NeoKred
  initiateNeoKredPaymentIntent(payment_method: string, uuid: any, order_result: any) {
    const userData = localStorage.getItem('account');
    const parsedUserData = JSON.parse(userData || '{}')?.user || {};

    const payload = {
      uuid,
      ...parsedUserData,
      checkout: this.checkoutTotal
    };

    this.cartService.initiateNeoKredIntent({
      uuid: payload.uuid,
      email: payload.email,
      total: this.checkoutTotal?.total?.total,
      phone: parsedUserData.phone,
      name: parsedUserData.name,
      address: `${parsedUserData.address?.[0]?.city || ''} ${parsedUserData.address?.[0]?.area || ''}`
    }).subscribe({
      next: (response) => {
        if (response?.R && response?.data) {
          try {
            const cashFreeData = response.data;

            if (cashFreeData?.payment_url) {
              // Store payment info in session storage
              sessionStorage.setItem('payment_uuid', uuid);
              sessionStorage.setItem('payment_method', payment_method);
              sessionStorage.setItem('payment_action', JSON.stringify(this.form.value));
              localStorage.setItem('order_id', JSON.stringify(order_result.order_number));
              // Open in current tab
              window.location.href = cashFreeData.payment_url;
            } else {
              console.error("Invalid response: Payment link is missing.");
            }
          } catch (error) {
            console.error("Error parsing CashFree response:", error);
          }
        } else {
          console.error("Payment initiation failed:", response?.msg);
        }
      },
      error: (err) => {
        console.log(err);
      }
    });
  }

  // Ease Buzz
  initiateEaseBuzzPaymentIntent(payment_method: string, uuid: any, order_result: any) {
    const userData = localStorage.getItem('account');
    const parsedUserData = JSON.parse(userData || '{}')?.user || {};

    const payload = {
      uuid,
      ...parsedUserData,
      checkout: this.checkoutTotal
    };

    this.cartService.initiateEaseBuzzIntent({
      uuid: payload.uuid,
      email: payload.email,
      total: this.checkoutTotal?.total?.total,
      name: parsedUserData.name,
      address: `${parsedUserData.address?.[0]?.city || ''} ${parsedUserData.address?.[0]?.area || ''}`,
      phone: parsedUserData.phone,
    }).subscribe({
      next: (response) => {
        if (response?.R && response?.data) {
          try {
            const easeBuzzData = response.data;

            if (easeBuzzData?.payment_url) {
              // Store payment info in session storage
              sessionStorage.setItem('payment_uuid', uuid);
              sessionStorage.setItem('payment_method', payment_method);
              sessionStorage.setItem('payment_action', JSON.stringify(this.form.value));
              localStorage.setItem('order_id', JSON.stringify(order_result.order_number));
              // Open in current tab
              window.location.href = easeBuzzData.payment_url;
            } else {
              console.error("Invalid response: Payment link is missing.");
            }
          } catch (error) {
            console.error("Error parsing Ease Buzz response:", error);
          }
        } else {
          console.error("Payment initiation failed:", response?.msg);
        }
      },
      error: (err) => {
        console.log(err);
      }
    });
  }

  // CashFree Payment Integration
  initiateCashFreePaymentIntent(payment_method: string, uuid: any, order_result: any) {
    const userData = localStorage.getItem('account');
    const parsedUserData = JSON.parse(userData || '{}')?.user || {};

    const payload = {
      uuid,
      ...parsedUserData,
      checkout: this.checkoutTotal
    };

    this.cartService.initiateCashFreeIntent({
      uuid: payload.uuid,
      email: payload.email,
      total: this.checkoutTotal?.total?.total,
      phone: parsedUserData.phone,
      name: parsedUserData.name,
      address: `${parsedUserData.address?.[0]?.city || ''} ${parsedUserData.address?.[0]?.area || ''}`
    }).subscribe({
      next: (response) => {
        if (response?.R && response?.data) {
          try {
            const cashFreeData = response.data;

            if (cashFreeData?.payment_link) {
              // Store payment info in session storage
              localStorage.setItem('payment_uuid', uuid);
              localStorage.setItem('payment_method', payment_method);
              localStorage.setItem('payment_action', JSON.stringify(this.form.value));
              localStorage.setItem('order_id', JSON.stringify(order_result.order_number));
              // Open in current tab
              window.location.href = cashFreeData.payment_link;
            } else {
              console.error("Invalid response: Payment link is missing.");
            }
          } catch (error) {
            console.error("Error parsing CashFree response:", error);
          }
        } else {
          console.error("Payment initiation failed:", response?.msg);
        }
      },
      error: (err) => {
        console.log("Error initiating payment:", err);
      }
    });
  }

  // Zyaada Pay Payment Integration
  initiateZyaadaPayPaymentIntent(payment_method: string, uuid: any, order_result: any) {
    const userData = localStorage.getItem('account');
    const parsedUserData = JSON.parse(userData || '{}')?.user || {};

    const payload = {
      uuid,
      ...parsedUserData,
      checkout: this.checkoutTotal
    };

    this.cartService.initiateZyaadaPayIntent({
      uuid: payload.uuid,
      email: payload.email,
      total: this.checkoutTotal?.total?.total,
      phone: parsedUserData.phone,
      name: parsedUserData.name,
      address: `${parsedUserData.address?.[0]?.city || ''} ${parsedUserData.address?.[0]?.area || ''}`
    }).subscribe({
      next: (response) => {
        if (response?.R && response?.data) {
          try {
            const zyaadaPayData = response.data;

            if (zyaadaPayData?.payment_url) {
              // Store payment info in session storage
              sessionStorage.setItem('payment_uuid', uuid);
              sessionStorage.setItem('payment_method', payment_method);
              sessionStorage.setItem('payment_action', JSON.stringify(this.form.value));
              localStorage.setItem('order_id', JSON.stringify(order_result.order_number));
              // Open in current tab
              window.location.href = zyaadaPayData.payment_url;
            } else {
              console.error("Invalid response: Payment link is missing.");
            }
          } catch (error) {
            console.error("Error parsing Zyaada Pay response:", error);
          }
        } else {
          console.error("Payment initiation failed:", response?.msg);
        }
      },
      error: (err) => {
        console.log("Error initiating payment:", err);
      }
    });
  }

  // NeoKred2
  initiateNeoKred2PaymentIntent(payment_method: string, uuid: any, order_result: any) {
    console.log(payment_method, uuid, order_result);
    const userData = localStorage.getItem('account');
    const parsedUserData = JSON.parse(userData || '{}')?.user || {};

    const payload = {
      uuid,
      ...parsedUserData,
      checkout: this.checkoutTotal
    };

    this.cartService.initiateNeoKred2Intent({
      uuid: payload.uuid,
      email: payload.email,
      total: this.checkoutTotal?.total?.total,
      phone: parsedUserData.phone,
      name: parsedUserData.name,
      address: `${parsedUserData.address?.[0]?.city || ''} ${parsedUserData.address?.[0]?.area || ''}`
    }).subscribe({
      next: (response) => {
        if (response?.R && response?.data) {
          try {
            const zyaadaPayData = response.data;

            if (zyaadaPayData?.payment_url) {
              // Store payment info in session storage
              sessionStorage.setItem('payment_uuid', uuid);
              sessionStorage.setItem('payment_method', payment_method);
              sessionStorage.setItem('payment_action', JSON.stringify(this.form.value));
              localStorage.setItem('order_id', JSON.stringify(order_result.order_number));
              // Open in current tab
              window.location.href = zyaadaPayData.payment_url;
            } else {
              console.error("Invalid response: Payment link is missing.");
            }
          } catch (error) {
            console.error("Error parsing Zyaada Pay response:", error);
          }
        } else {
          console.error("Payment initiation failed:", response?.msg);
        }
      },
      error: (err) => {
        console.log("Error initiating payment:", err);
      }
    });
  }

  // PayU Payment Integration
  initiatePayUPaymentIntent(payment_method: string, uuid: any, order_result: any) {
    const userData = localStorage.getItem('account');
    const parsedUserData = JSON.parse(userData || '{}')?.user || {};

    const payload = {
      uuid,
      ...parsedUserData,
      checkout: this.checkoutTotal
    };

    this.cartService.initiatePayUIntent({
      name: parsedUserData.name,
      amount: this.checkoutTotal?.total?.total,
      email: parsedUserData.email,
      phone: parsedUserData.phone,
      uuid: payload.uuid,
      surl: `${window.location.origin}/success?order_status=true&order_number=${order_result.order_number}`,
      furl: `${window.location.origin}/checkout?payment_status=failed&order_number=${order_result.order_number}`
    }).subscribe({
      next: (response) => {
        // Log full response so txnid is visible in console even after redirect
        console.log('PayU initiate-payment full response:', JSON.stringify(response));

        if (response?.success && response?.redirect_url) {
          sessionStorage.setItem('payment_uuid', uuid);
          sessionStorage.setItem('payment_method', payment_method);
          sessionStorage.setItem('payment_action', JSON.stringify(this.form.value));
          localStorage.setItem('order_id', JSON.stringify(order_result.order_number));

          // --- Capture txnid (primary) ---
          let txnid: string | null = response?.txnid || null;

          // --- Fallback: extract txnid from redirect_url if not in response field ---
          // e.g. "https://api.nixopay.com/payu/redirect/51d780bc999ca53853ea"
          if (!txnid && response?.redirect_url) {
            const urlParts = response.redirect_url.split('/');
            const extracted = urlParts[urlParts.length - 1];
            if (extracted && extracted.length > 5) {
              txnid = extracted;
              console.log('txnid extracted from redirect_url:', txnid);
            }
          }

          if (txnid) {
            localStorage.setItem('payu_txnid', txnid);
            console.log('payu_txnid saved to localStorage:', txnid);
          } else {
            console.warn('Could not capture txnid from PayU response:', response);
          }

          window.location.href = response.redirect_url;
        } else {
          console.error("Payment initiation failed:", response);
        }
      },
      error: (err) => {
        console.log("Error initiating PayU payment:", err);
      }
    });
  }

  // PayU Rapportmart Payment Integration
  initiatePayURapportmartPaymentIntent(payment_method: string, uuid: any, order_result: any) {
    const userData = localStorage.getItem('account');
    const parsedUserData = JSON.parse(userData || '{}')?.user || {};

    const payload = {
      uuid,
      ...parsedUserData,
      checkout: this.checkoutTotal
    };

    this.cartService.initiatePayURapportmartIntent({
      name: parsedUserData.name,
      amount: this.checkoutTotal?.total?.total,
      email: parsedUserData.email,
      phone: parsedUserData.phone,
      uuid: payload.uuid,
      surl: `${window.location.origin}/success?order_status=true&order_number=${order_result.order_number}`,
      furl: `${window.location.origin}/checkout?payment_status=failed&order_number=${order_result.order_number}`
    }).subscribe({
      next: (response) => {
        console.log('PayU Rapportmart initiate-payment full response:', JSON.stringify(response));

        if (response?.success && response?.redirect_url) {
          sessionStorage.setItem('payment_uuid', uuid);
          sessionStorage.setItem('payment_method', payment_method);
          sessionStorage.setItem('payment_action', JSON.stringify(this.form.value));
          localStorage.setItem('order_id', JSON.stringify(order_result.order_number));

          let txnid: string | null = response?.txnid || null;

          if (!txnid && response?.redirect_url) {
            const urlParts = response.redirect_url.split('/');
            const extracted = urlParts[urlParts.length - 1];
            if (extracted && extracted.length > 5) {
              txnid = extracted;
              console.log('txnid extracted from redirect_url:', txnid);
            }
          }

          if (txnid) {
            localStorage.setItem('payu_txnid', txnid);
            console.log('payu_txnid saved to localStorage:', txnid);
          } else {
            console.warn('Could not capture txnid from PayU Rapportmart response:', response);
          }

          window.location.href = response.redirect_url;
        } else {
          console.error("Payment initiation failed:", response);
        }
      },
      error: (err) => {
        console.log("Error initiating PayU Rapportmart payment:", err);
      }
    });
  }

  // Turnlife Nabu NSDL Payment Integration
  initiateTurnlifeNabuNsdlPaymentIntent(payment_method: string, uuid: any, order_result: any) {
    console.log('=== initiateTurnlifeNabuNsdlPaymentIntent called ===');
    console.log('order_result:', order_result);
    const userData = localStorage.getItem('account');
    const parsedUserData = JSON.parse(userData || '{}')?.user || {};

    const payload = {
      uuid,
      ...parsedUserData,
      checkout: this.checkoutTotal
    };

    this.cartService.initiateTurnlifeNabuNsdlIntent({
      name: parsedUserData.name,
      total: this.checkoutTotal?.total?.total,
      email: parsedUserData.email,
      phone: parsedUserData.phone,
      uuid: payload.uuid,
      surl: `${window.location.origin}/success?order_status=true&order_number=${order_result.order_number}`,
      furl: `${window.location.origin}/checkout?payment_status=failed&order_number=${order_result.order_number}`
    }).subscribe({
      next: (response) => {
        console.log('Turnlife Nabu NSDL initiate-payment full response:', JSON.stringify(response));

        const paymentUrl = response?.payment_url || response?.redirect_url;

        if (response?.R && paymentUrl) {
          sessionStorage.setItem('payment_uuid', uuid);
          sessionStorage.setItem('payment_method', payment_method);
          sessionStorage.setItem('payment_action', JSON.stringify(this.form.value));
          localStorage.setItem('order_id', JSON.stringify(order_result.order_number));

          window.location.href = paymentUrl;
        } else {
          console.error("Payment initiation failed:", response);
        }
      },
      error: (err) => {
        console.log("Error initiating Turnlife Nabu NSDL payment:", err);
      }
    });
  }

  // Airpay Payment Integration
  initiateAirpayPaymentIntent(payment_method: string, uuid: any, order_result: any) {
    const userData = localStorage.getItem('account');
    const parsedUserData = JSON.parse(userData || '{}')?.user || {};

    const payload = {
      uuid,
      ...parsedUserData,
      checkout: this.checkoutTotal
    };

    this.cartService.initiateAirpayIntent({
      name: parsedUserData.name,
      total: this.checkoutTotal?.total?.total,
      email: parsedUserData.email,
      phone: parsedUserData.phone,
      uuid: payload.uuid,
      surl: `${window.location.origin}/success?order_status=true&order_number=${order_result.order_number}`,
      furl: `${window.location.origin}/checkout?payment_status=failed&order_number=${order_result.order_number}`
    }).subscribe({
      next: (response) => {
        console.log('Airpay initiate-payment full response:', JSON.stringify(response));

        const paymentUrl = response?.payment_url || response?.redirect_url;

        if (response?.R && paymentUrl) {
          sessionStorage.setItem('payment_uuid', uuid);
          sessionStorage.setItem('payment_method', payment_method);
          sessionStorage.setItem('payment_action', JSON.stringify(this.form.value));
          localStorage.setItem('order_id', JSON.stringify(order_result.order_number));

          window.location.href = paymentUrl;
        } else {
          console.error("Airpay payment initiation failed:", response);
        }
      },
      error: (err) => {
        console.log("Error initiating Airpay payment:", err);
      }
    });
  }

  // Jio Payment Integration
  initiateJioPaymentIntent(payment_method: string, uuid: any, order_result: any) {
    const userData = localStorage.getItem('account');
    const parsedUserData = JSON.parse(userData || '{}')?.user || {};

    const payload = {
      uuid,
      ...parsedUserData,
      checkout: this.checkoutTotal
    };

    this.cartService.initiateJioIntent({
      name: parsedUserData.name,
      total: this.checkoutTotal?.total?.total,
      email: parsedUserData.email,
      phone: parsedUserData.phone,
      uuid: payload.uuid,
      surl: `${window.location.origin}/success?order_status=true&order_number=${order_result.order_number}`,
      furl: `${window.location.origin}/checkout?payment_status=failed&order_number=${order_result.order_number}`
    }).subscribe({
      next: (response) => {
        console.log('Jio initiate-payment full response:', JSON.stringify(response));

        const paymentUrl = response?.payment_url || response?.redirect_url;

        if (response?.R && paymentUrl) {
          sessionStorage.setItem('payment_uuid', uuid);
          sessionStorage.setItem('payment_method', payment_method);
          sessionStorage.setItem('payment_action', JSON.stringify(this.form.value));
          localStorage.setItem('order_id', JSON.stringify(order_result.order_number));

          window.location.href = paymentUrl;
        } else {
          console.error("Jio payment initiation failed:", response);
        }
      },
      error: (err) => {
        console.log("Error initiating Jio payment:", err);
      }
    });
  }

  // Shop Shop Turn Life Nabu Payment Integration
  initiateShopTurnLifeNabuPaymentIntent(payment_method: string, uuid: any, order_result: any) {
    const userData = localStorage.getItem('account');
    const parsedUserData = JSON.parse(userData || '{}')?.user || {};

    const payload = {
      uuid,
      ...parsedUserData,
      checkout: this.checkoutTotal
    };

    this.cartService.initiateShopTurnLifeNabuIntent({
      uuid: payload.uuid,
      email: payload.email,
      total: this.checkoutTotal?.total?.total,
      phone: parsedUserData.phone,
      name: parsedUserData.name,
      address: `${parsedUserData.address?.[0]?.city || ''} ${parsedUserData.address?.[0]?.area || ''}`
    }).subscribe({
      next: (resp) => {
        this.pollingSubscription && this.pollingSubscription.unsubscribe();

        let attemptedNavigation = false;
        let paymentWindow: Window | null = null;

        const paymentLink = resp?.payment_link || resp?.url || resp?.data?.payment_url || resp?.data?.payment_link;

        if (paymentLink) {
          sessionStorage.setItem('payment_uuid', uuid);
          sessionStorage.setItem('payment_method', payment_method);
          sessionStorage.setItem('payment_action', JSON.stringify(this.form.value));
          localStorage.setItem('order_id', JSON.stringify(order_result.order_number));

          attemptedNavigation = true;
          window.location.href = paymentLink;
        } else if (typeof resp?.data === 'string') {
          const container = document.getElementById('paymentContainer');
          if (container) {
            container.innerHTML = resp.data;
            setTimeout(() => {
              paymentWindow = window.open('', 'PaymentWindow', 'width=600,height=700,resizable=yes,scrollbars=yes');
              if (paymentWindow) {
                const formHtml = (container.querySelector('form') as HTMLFormElement)?.outerHTML || '';
                paymentWindow.document.write(`<html><body>${formHtml}<script>document.getElementById('submitButton')&&document.getElementById('submitButton').click();<\/script></body></html>`);
                paymentWindow.document.close();
                attemptedNavigation = true;
              }
            }, 500);
          }
        }

        if (attemptedNavigation) {
          this.checkTransactionStatusSleekSynergy(uuid, paymentWindow, payment_method);
        }
      },
      error: (err) => {
        console.error(err);
      }
    });
  }

  // Transaction Status Check for Shop Trurn Life Nabu (and other payment gateways)
  checkTransactionStatusSleekSynergy(uuid: any, paymentWindow: Window | null, payment_method: string) {
    this.pollingSubscription = interval(this.pollingInterval).pipe(
      switchMap(() => this.cartService.checkTransectionStatusNeoKred(uuid, payment_method)),
      takeWhile((response: any) => {
        if (response?.status === true) {
          if (paymentWindow) {
            paymentWindow.close();
          }
          const orderId = localStorage.getItem('order_id');
          if (orderId) {
            this.router.navigate(['/account/order/details', JSON.parse(orderId)]);
          }
          this.pollingSubscription.unsubscribe();
          return false;
        }
        return true;
      }, true)
    ).subscribe({
      error: (err) => {
        console.error('Error checking payment status:', err);
        this.pollingSubscription.unsubscribe();
      }
    });
  }

  async openNeoKredModal(data: any) {
    this.payByNeoKredIntentSaveData = data;
    console.log(this.payByNeoKredIntentSaveData);
    this.modalService.open(this.payByQRModal, {
      ariaLabelledBy: 'address-add-Modal',
      centered: true,
      windowClass: 'theme-modal modal-lg address-modal'
    }).result.then((result) => {
      `Result ${result}`
      const formDataContainer = document.getElementById('formDataContainer');
      console.log(formDataContainer);
    }, (reason) => {
      const formDataContainer = document.getElementById('formDataContainer');
      console.log(formDataContainer);
    });
  }

  payByNeoKredIntentSaveDataUpiIntentString(upi: string) {
    switch (upi) {
      case 'gpay_upi':
        return this.payByNeoKredIntentSaveData.upiIntentString.replace("upi://pay?", "tez://pay?");
      case 'phone_pay_upi':
        return this.payByNeoKredIntentSaveData.upiIntentString.replace("upi://pay?", "phonepe://pay?");
      case 'paytm_upi':
        return this.payByNeoKredIntentSaveData.upiIntentString.replace("upi://pay?", "paytmmp://pay?");
      case 'bhim_upi':
        break;
      // return this.payByNeoKredIntentSaveData.upiIntentString.replace()
      default:
        break;
    }

  }

  paybyNeoNext() {
    this.payByNeoStep = 1;
  }

  paybyNeoDone() {
    this.payByNeoStep = 0;
    this.modalService.dismissAll();
    this.pollingSubscription.unsubscribe();
  }


  togglePoint(event: Event) {
    this.form.controls['points_amount'].setValue((<HTMLInputElement>event.target)?.checked);
    this.checkout();
  }

  toggleWallet(event: Event) {
    this.form.controls['wallet_balance'].setValue((<HTMLInputElement>event.target)?.checked);
    this.checkout();
  }

  showCoupon() {
    this.coupon = true;
  }

  setCoupon(value?: string) {
    this.couponError = null;

    if (value)
      this.form.controls['coupon'].setValue(value);
    else
      this.form.controls['coupon'].reset();

    this.store.dispatch(new Checkout(this.form.value)).subscribe({
      error: (err) => {
        this.couponError = err.message;
      },
      complete: () => {
        this.appliedCoupon = value ? true : false;
        this.couponError = null;
      }
    });
  }

  couponRemove() {
    this.setCoupon();
  }

  shippingCountryChange(data: Select2UpdateEvent) {
    if (data && data?.value) {
      this.shippingStates$ = this.store
        .select(StateState.states)
        .pipe(map(filterFn => filterFn(+data?.value)));
    } else {
      this.form.get('shipping_address.state_id')?.setValue('');
      this.shippingStates$ = of();
    }
  }

  billingCountryChange(data: Select2UpdateEvent) {
    if (data && data?.value) {
      this.billingStates$ = this.store
        .select(StateState.states)
        .pipe(map(filterFn => filterFn(+data?.value)));
      if (this.form.get('billing_address.same_shipping')?.value) {
        setTimeout(() => {
          this.form.get('billing_address.state_id')?.setValue(this.form.get('shipping_address.state_id')?.value);
        }, 200);
      }
    } else {
      this.form.get('billing_address.state_id')?.setValue('');
      this.billingStates$ = of();
    }
  }

  checkout(payment_method?: string) {
    // If has coupon error while checkout
    if (this.couponError) {
      this.couponError = null;
      this.cpnRef.nativeElement.value = '';
      this.form.controls['coupon'].reset();
    }

    if (this.form.valid) {
      this.loading = true;
      this.store.dispatch(new Checkout(this.form.value)).subscribe({
        next: (value) => {
          this.storeData = value;
          console.log(this.storeData);
        },
        error: (err) => {
          this.loading = false;
          throw new Error(err);
        },
        complete: () => {
          this.loading = false;
        }
      });
    } else {
      const invalidFields = Object?.keys(this.form?.controls).filter(key => this.form.controls[key].invalid);
    }
  }

  placeorder() {
    // Prevent double submission
    if (this.loading) {
      return;
    }

    if (this.form.valid) {
      if (this.cpnRef && !this.cpnRef.nativeElement.value) {
        this.form.controls['coupon'].reset();
      }

      // Save cart items before placing order so they can be restored if payment is cancelled
      const cartItems = this.store.selectSnapshot(CartState.cartItems);
      if (cartItems?.length) {
        sessionStorage.setItem('pending_payment_cart', JSON.stringify(
          cartItems.map((item: Cart) => ({
            product_id: item.product_id,
            variation_id: item.variation_id || null,
            quantity: item.quantity
          }))
        ));
      }

      const uuid = uuidv4();

      const formData = {
        ...this.form.value,
        uuid: uuid
      }

      let action = new PlaceOrder(formData);
      // this.store.dispatch(new PlaceOrder(formData));

      // Set loading state to prevent double submission
      this.loading = true;

      this.orderService.placeOrder(action?.payload).pipe(
        tap({
          next: result => {
            console.log(result);
          },
          error: err => {
            this.loading = false; // Reset loading on error
            throw new Error(err?.error?.message);
          }
        })
      ).subscribe({
        next: (result) => {
          console.log('=== placeorder subscribe.next fired ===');
          console.log('payment_method:', this.payment_method);
          console.log('order result:', result);
          if (this.payment_method === 'cash_free') {
            this.initiateCashFreePaymentIntent(this.payment_method, uuid, result);
          }
          if (this.payment_method === 'sub_paisa') {
            this.initiateSubPaisa(this.payment_method, uuid, result);
          }
          if (this.payment_method === 'neoKred') {
            this.initiateNeoKredPaymentIntent(this.payment_method, uuid, result);
          }
          if (this.payment_method === 'zyaada_pay') {
            this.initiateZyaadaPayPaymentIntent(this.payment_method, uuid, result);
          }
          if (this.payment_method === 'ease_buzz') {
            this.initiateEaseBuzzPaymentIntent(this.payment_method, uuid, result);
          }
          if (this.payment_method === 'neoKred2') {
            this.initiateNeoKred2PaymentIntent(this.payment_method, uuid, result);
          }
          if (this.payment_method === 'Shop Trurn Life_nabu') {
            this.initiateShopTurnLifeNabuPaymentIntent(this.payment_method, uuid, result);
          }
          if (this.payment_method === 'payu_shoplite') {
            this.initiatePayUPaymentIntent(this.payment_method, uuid, result);
          }
          if (this.payment_method === 'payu_rapportmart') {
            this.initiatePayURapportmartPaymentIntent(this.payment_method, uuid, result);
          }
          if (this.payment_method === 'turnlife_nabu_nsdl') {
            console.log('=== turnlife_nabu_nsdl matched, calling initiate ===');
            this.initiateTurnlifeNabuNsdlPaymentIntent(this.payment_method, uuid, result);
          }
          if (this.payment_method === 'turnlife_nabu_airpay') {
            this.initiateAirpayPaymentIntent(this.payment_method, uuid, result);
          }
          if (this.payment_method === 'turnlife_jio') {
            this.initiateJioPaymentIntent(this.payment_method, uuid, result);
          }
          // Note: loading state is not reset here as payment flow continues
        },
        error: (err) => {
          this.loading = false; // Reset loading on error
          console.log(err);
        }
      });
    }
  }

  paybyqr() {
    this.modalService.dismissAll();
    // PlaceOrder Here
  }

  clearCart() {
    this.store.dispatch(new ClearCart());
  }

  ngOnDestroy() {
    // Removed cart clearing on navigation - users should be able to go back to cart page
    // this.store.dispatch(new ClearCart());
    this.modalService.dismissAll();
    this.form.reset();
    this.pollingSubscription && this.pollingSubscription.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Input filtering methods
  onNameInput(event: any) {
    const input = event.target;
    const value = input.value;
    // Remove any character that is not a letter or space
    const filteredValue = value.replace(/[^A-Za-z ]/g, '');
    if (value !== filteredValue) {
      input.value = filteredValue;
      // Update the form control value
      this.form.get('name')?.setValue(filteredValue);
    }
  }

  onTitleInput(event: any) {
    const input = event.target;
    const value = input.value;
    // Remove any character that is not a letter or space
    const filteredValue = value.replace(/[^A-Za-z ]/g, '');
    if (value !== filteredValue) {
      input.value = filteredValue;
      // Update the form control value
      this.form.get('shipping_address.title')?.setValue(filteredValue);
    }
  }

  onPhoneInput(event: any) {
    const input = event.target;
    const value = input.value;
    // Remove any character that is not a digit and limit to 10 digits
    const filteredValue = value.replace(/[^0-9]/g, '').substring(0, 10);
    if (value !== filteredValue) {
      input.value = filteredValue;
      // Update the form control value
      this.form.get('phone')?.setValue(filteredValue);
    }
  }

  onShippingPhoneInput(event: any) {
    const input = event.target;
    const value = input.value;
    // Remove any character that is not a digit and limit to 10 digits
    const filteredValue = value.replace(/[^0-9]/g, '').substring(0, 10);
    if (value !== filteredValue) {
      input.value = filteredValue;
      // Update the form control value
      this.form.get('shipping_address.phone')?.setValue(filteredValue);
    }
  }

  onCityInput(event: any) {
    const input = event.target;
    const value = input.value;
    // Remove any character that is not a letter or space
    const filteredValue = value.replace(/[^A-Za-z ]/g, '');
    if (value !== filteredValue) {
      input.value = filteredValue;
      // Update the form control value
      this.form.get('shipping_address.city')?.setValue(filteredValue);
    }
  }

}
