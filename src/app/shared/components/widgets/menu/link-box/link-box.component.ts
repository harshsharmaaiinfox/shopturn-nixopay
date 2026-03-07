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

  redirect(path:string){
    if (!this.isDisabled()) {
      this.router.navigateByUrl(path)
    }
  }

  isDisabled(): boolean {
    return isCategoryDisabled(this.menu?.title);
  }
}
