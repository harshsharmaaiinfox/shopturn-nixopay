import { Component, ViewChild, TemplateRef } from '@angular/core';
import { Breadcrumb } from '../../../shared/interface/breadcrumb';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Select, Store } from '@ngxs/store';
import { Router } from '@angular/router';
import { SettingState } from '../../../shared/state/setting.state';
import { Observable } from 'rxjs';
import { Values } from '../../../shared/interface/setting.interface';
import * as data from '../../../shared/data/country-code';
import { LoginWithNumber, VerifyNumberOTP } from '../../../shared/action/auth.action';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-login-with-number',
  templateUrl: './login-with-number.component.html',
  styleUrl: './login-with-number.component.scss'
})
export class LoginWithNumberComponent {

  @Select(SettingState.setting) setting$: Observable<Values>;
  @ViewChild('otpModal') otpModal: TemplateRef<any>;

  public form: FormGroup;
  public otpForm: FormGroup;
  public codes = data.countryCodes;
  private modalRef: any;

  public breadcrumb: Breadcrumb = {
    title: "Login With Number",
    items: [{ label: 'Login With Number', active: true }]
  }

  constructor(
    private store: Store,
    private router: Router,
    private modalService: NgbModal,
    private formBuilder: FormBuilder
  ) {
    this.form = this.formBuilder.group({
      phone: new FormControl('', [Validators.required, Validators.pattern(/^[0-9]*$/)]),
      country_code: new FormControl('91', [Validators.required]),
    });

    this.otpForm = this.formBuilder.group({
      otp: new FormControl('', [Validators.required, Validators.minLength(5)])
    });
  }

  submit() {
    this.form.markAllAsTouched();
    if(this.form.valid){
      this.store.dispatch(new LoginWithNumber(this.form.value)).subscribe({
        complete: () => {
          this.otpForm.reset();
          this.modalRef = this.modalService.open(this.otpModal, {
            centered: true,
            backdrop: 'static',
            keyboard: false,
            windowClass: 'otp-verify-modal'
          });
        }
      });
    }
  }

  verifyLoginOtp() {
    this.otpForm.markAllAsTouched();
    if(this.otpForm.valid) {
      this.store.dispatch(new VerifyNumberOTP({
        phone: this.form.value.phone,
        country_code: this.form.value.country_code,
        token: this.otpForm.value.otp
      })).subscribe({
        complete: () => {
          this.modalRef?.close();
          this.router.navigateByUrl('/account/dashboard');
        }
      });
    }
  }
}
