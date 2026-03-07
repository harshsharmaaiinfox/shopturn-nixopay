import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-contact-us',
  standalone: true,
  templateUrl: './contact-us.component.html',
  styleUrls: ['./contact-us.component.scss'],
  imports: [CommonModule, ReactiveFormsModule] // Import ReactiveFormsModule here
})
export class ContactUsComponent {
  contactForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.contactForm = this.fb.group({
      name: ['', [Validators.required, Validators.pattern('^[A-Za-z ]+$')]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      message: ['', Validators.required]
    });
  }

  onSubmit() {
    if (this.contactForm.valid) {
      console.log('Form submitted', this.contactForm.value);
      alert('Form submitted successfully!');
      this.contactForm.reset();
    } else {
      alert('Please fill all fields correctly before submitting.');
    }
  }

  onNameInput(event: any) {
    const input = event.target;
    const value = input.value;
    // Remove any character that is not a letter or space
    const filteredValue = value.replace(/[^A-Za-z ]/g, '');
    if (value !== filteredValue) {
      input.value = filteredValue;
      // Update the form control value
      this.contactForm.get('name')?.setValue(filteredValue);
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
      this.contactForm.get('phone')?.setValue(filteredValue);
    }
  }
}
