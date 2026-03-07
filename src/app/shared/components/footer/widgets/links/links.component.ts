import { Component, Input } from '@angular/core';
import { Link } from '../../../../../shared/interface/theme-option.interface';

@Component({
  selector: 'app-footer-links',
  templateUrl: './links.component.html',
  styleUrls: ['./links.component.scss']
})
export class LinksComponent {
  
  @Input() links: Link[] = [];

  get filteredLinks(): Link[] {
    return this.links
      .filter(link => {
        const linkName = (link.name || '').toLowerCase();
        const linkValue = (link.value || '').toLowerCase();
        // Filter out "Track Order" or any link containing "track" in name or value
        return !linkName.includes('track') && !linkValue.includes('track');
      })
      .map(link => {
        // Replace "My Account" with "Profile"
        if (link.name && (link.name.toLowerCase().includes('my account') || link.name.toLowerCase() === 'my account')) {
          return {
            ...link,
            name: 'Profile'
          };
        }
        return link;
      });
  }

}
