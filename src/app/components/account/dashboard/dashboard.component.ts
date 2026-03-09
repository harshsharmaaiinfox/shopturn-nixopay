import { Component, OnDestroy, ViewChild } from '@angular/core';
import { Select, Store } from '@ngxs/store';
import { Observable, Subscription } from 'rxjs';
import { User, UserAddress } from '../../../shared/interface/user.interface';
import { AccountState } from '../../../shared/state/account.state';
import { GetUserDetails } from '../../../shared/action/account.action';
import { EditProfileModalComponent } from '../../../shared/components/widgets/modal/edit-profile-modal/edit-profile-modal.component';
import { ChangePasswordModalComponent } from '../../../shared/components/widgets/modal/change-password-modal/change-password-modal.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnDestroy {

  @Select(AccountState.user) user$: Observable<User>;

  @ViewChild("profileModal") ProfileModal: EditProfileModalComponent;
  @ViewChild("passwordModal") PasswordModal: ChangePasswordModalComponent;

  public address: UserAddress | null;
  private sub: Subscription;

  constructor(private store: Store) {
    this.store.dispatch(new GetUserDetails());
    this.sub = this.user$.subscribe(user => {
      this.address = user?.address?.length ? user?.address?.[0] : null;
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

}
