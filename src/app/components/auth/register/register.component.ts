import { Component, ViewChild, TemplateRef, OnDestroy } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Store, Select } from '@ngxs/store';
import { Observable } from 'rxjs';
import { CustomValidators } from '../../../shared/validator/password-match';
import { Register } from '../../../shared/action/auth.action';
import { Breadcrumb } from '../../../shared/interface/breadcrumb';
import { SettingState } from '../../../shared/state/setting.state';
import { ThemeOptionState } from '../../../shared/state/theme-option.state';
import { Option } from '../../../shared/interface/theme-option.interface';
import { Values } from '../../../shared/interface/setting.interface';
import * as data from '../../../shared/data/country-code';
import { NotificationService } from '../../../shared/services/notification.service';
import { AuthService } from '../../../shared/services/auth.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnDestroy {

  @Select(SettingState.setting) setting$: Observable<Values>;
  @Select(ThemeOptionState.themeOptions) themeOption$: Observable<Option>;
  @ViewChild('otpModal') otpModal: TemplateRef<any>;

  public form: FormGroup;
  public otpForm: FormGroup;
  public breadcrumb: Breadcrumb = {
    title: "Create Account",
    items: [{ label: 'Create Account', active: true }]
  }
  public codes = data.countryCodes;
  public tnc = new FormControl(false, [Validators.requiredTrue]);
  public reCaptcha: boolean = true;
  public registrationEmail: string = '';
  private modalRef: any;

  constructor(
    private store: Store,
    private router: Router,
    private formBuilder: FormBuilder,
    private notificationService: NotificationService,
    private authService: AuthService,
    private modalService: NgbModal
  ) {
    this.form = this.formBuilder.group({
      name: new FormControl('', [Validators.required, Validators.pattern(/^[A-Za-z\s]*$/)]),
      email: new FormControl('', [Validators.required, Validators.email]),
      phone: new FormControl('', [Validators.required, Validators.pattern(/^[0-9]*$/)]),
      country_code: new FormControl('91', [Validators.required]),
      password: new FormControl('', [Validators.required]),
      password_confirmation: new FormControl('', [Validators.required]),
      recaptcha: new FormControl(null, Validators.required)
    },{validator : CustomValidators.MatchValidator('password', 'password_confirmation')});

    this.otpForm = this.formBuilder.group({
      otp: new FormControl('', [Validators.required, Validators.minLength(6)])
    });

    this.setting$.subscribe(seting => {
      if((seting?.google_reCaptcha && !seting?.google_reCaptcha?.status) || !seting?.google_reCaptcha) {
        this.form.removeControl('recaptcha');
        this.reCaptcha = false;
      } else {
        this.form.setControl('recaptcha', new FormControl(null, Validators.required))
        this.reCaptcha = true;
      }
    });

    this.form.get('country_code')?.disable();
    this.form.controls['phone']?.valueChanges.subscribe((value) => {
      if(value && value.toString().length < 10) {
        this.form.controls['phone'].markAsTouched();
        this.form.controls['phone'].setErrors({invalid: true});
      }
      if(value && value.toString().length > 10) {
        this.form.controls['phone']?.setValue(+value.toString().slice(0, 10), { emitEvent: false });
      }
      if(value && value.toString().length === 10) {
        this.form.controls['phone'].setErrors(null);
      }
    });
  }

  get passwordMatchError() {
    return (
      this.form.getError('mismatch') &&
      this.form.get('password_confirmation')?.touched
    );
  }

  allowOnlyLetters(event: KeyboardEvent): void {
    const allowedControlKeys = [
      'Backspace', 'Delete', 'Tab', 'Enter', 'Escape', 'ArrowLeft', 'ArrowRight', 'Home', 'End'
    ];
    if (allowedControlKeys.includes(event.key)) return;
    if (!/^[A-Za-z\s]$/.test(event.key)) {
      event.preventDefault();
    }
  }

  sanitizeNameInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const sanitized = (input.value || '').replace(/[^A-Za-z\s]/g, '');
    if (sanitized !== input.value) {
      input.value = sanitized;
      this.form.controls['name'].setValue(sanitized, { emitEvent: false });
    }
  }

  sanitizeNamePaste(event: ClipboardEvent): void {
    const pasted = event.clipboardData?.getData('text') ?? '';
    if (/[^A-Za-z\s]/.test(pasted)) {
      event.preventDefault();
      const sanitized = pasted.replace(/[^A-Za-z\s]/g, '');
      document.execCommand('insertText', false, sanitized);
    }
  }

  allowOnlyDigits(event: KeyboardEvent): void {
    const allowedControlKeys = [
      'Backspace', 'Delete', 'Tab', 'Enter', 'Escape', 'ArrowLeft', 'ArrowRight', 'Home', 'End'
    ];
    if (allowedControlKeys.includes(event.key)) return;
    if (event.ctrlKey || event.metaKey) return;
    if (!/^[0-9]$/.test(event.key)) {
      event.preventDefault();
    }
  }

  sanitizePhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digitsOnly = (input.value || '').replace(/\D/g, '').slice(0, 10);
    if (digitsOnly !== input.value) {
      input.value = digitsOnly;
      this.form.controls['phone'].setValue(digitsOnly, { emitEvent: false });
    }
  }

  sanitizePhonePaste(event: ClipboardEvent): void {
    const pasted = event.clipboardData?.getData('text') ?? '';
    if (/\D/.test(pasted)) {
      event.preventDefault();
      const sanitized = pasted.replace(/\D/g, '').slice(0, 10);
      document.execCommand('insertText', false, sanitized);
    }
  }

  allowOnlyEmailChars(event: KeyboardEvent): void {
    const allowedControlKeys = [
      'Backspace', 'Delete', 'Tab', 'Enter', 'Escape', 'ArrowLeft', 'ArrowRight', 'Home', 'End'
    ];
    if (allowedControlKeys.includes(event.key)) return;
    if (event.ctrlKey || event.metaKey) return;
    if (!/^[A-Za-z0-9@.]$/.test(event.key)) {
      event.preventDefault();
    }
  }

  sanitizeEmailInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const sanitized = (input.value || '').replace(/[^A-Za-z0-9@.]/g, '');
    if (sanitized !== input.value) {
      input.value = sanitized;
      this.form.controls['email'].setValue(sanitized, { emitEvent: false });
    }
  }

  sanitizeEmailPaste(event: ClipboardEvent): void {
    const pasted = event.clipboardData?.getData('text') ?? '';
    if (/[^A-Za-z0-9@.]/.test(pasted)) {
      event.preventDefault();
      const sanitized = pasted.replace(/[^A-Za-z0-9@.]/g, '');
      document.execCommand('insertText', false, sanitized);
    }
  }

  submit() {
    this.form.markAllAsTouched();
    if(this.tnc.invalid){
      return;
    }
    if(this.form.valid) {
      this.store.dispatch(new Register(this.form.value)).subscribe({
        complete: () => {
          this.registrationEmail = this.form.value.email;
          this.otpForm.reset();
          this.modalRef = this.modalService.open(this.otpModal, {
            centered: true,
            backdrop: false,
            keyboard: false,
            windowClass: 'otp-verify-modal'
          });
        }
      });
    }
  }

  verifyRegistrationOtp() {
    this.otpForm.markAllAsTouched();
    if(this.otpForm.valid) {
      this.authService.verifyRegistrationOtp({
        email: this.registrationEmail,
        otp: this.otpForm.value.otp
      }).subscribe({
        next: () => {
          this.modalRef?.close();
          this.notificationService.showSuccess('Account verified successfully! Please sign in.');
          this.router.navigateByUrl('/auth/login');
        },
        error: (err) => {
          this.notificationService.showError(err?.error?.message || 'Invalid OTP. Please try again.');
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.modalService.dismissAll();
  }
}
