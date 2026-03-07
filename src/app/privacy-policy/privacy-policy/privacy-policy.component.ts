import { Component, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { SeoService } from '../../shared/services/seo.service';

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './privacy-policy.component.html',
  styleUrl: './privacy-policy.component.scss'
})
export class PrivacyPolicyComponent implements OnInit {
  currentDate = new Date();

  constructor(private seoService: SeoService) { }

  ngOnInit() {
    // Set unique SEO data for Privacy Policy page
    this.seoService.setSEOData({
      title: 'Privacy Policy – How We Use Your Data | Shop Shop Turn Life',
      description: 'Learn how Shop Shop Turn Life protects and uses your personal information. Read our comprehensive privacy policy to understand your rights and our data practices.',
      keywords: 'privacy policy, data protection, personal information, shopturnlife privacy, data usage',
      canonicalUrl: 'https://shopturnlife.com/privacy-policy',
      url: 'https://shopturnlife.com/privacy-policy',
      type: 'website'
    });
  }
}
