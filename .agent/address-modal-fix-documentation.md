# Address Modal - Country, State, City, Area Visibility Fix

## Problem Identified
The Country, State, City, and Area fields were not visible in the address modal because:

1. **Disabled Fields**: The TypeScript code was disabling the `area` and `pincode` fields on initialization (line 160-161), which prevented them from being visible and functional.

2. **Data Formatting**: The `stateNameData` was not properly formatted as `Select2Data` with `label` and `value` properties, which could cause display issues.

3. **Missing CSS**: There was no CSS styling for disabled select2 elements, which could make them invisible.

## Changes Made

### 1. TypeScript Component (`address-modal.component.ts`)

#### Change 1: Removed Unnecessary Disabling
**Before:**
```typescript
setTimeout(() => {
  this.form.controls['country_id'].disable();
  this.form.controls['area'].disable();        // ❌ This was hiding the area field
  this.form.controls['pincode'].disable();     // ❌ This was hiding the pincode field
  this.form.controls['country_code'].disable();
}, 500);
```

**After:**
```typescript
// Initialize country to India and country code
setTimeout(() => {
  this.form.controls['country_id'].setValue(356); // India
  this.form.controls['country_code'].setValue('+91');
  // Keep country and country_code disabled as they are fixed to India
  this.form.controls['country_id'].disable();
  this.form.controls['country_code'].disable();
}, 500);
```

**Why:** Only the country and country_code fields should be disabled since they're fixed to India. The area and pincode fields need to be enabled so users can interact with them.

#### Change 2: Fixed State Data Formatting
**Before:**
```typescript
this.stateNameData = [...new Map(this.pinCodeAreaOfficeCircleDataJSON.map((item: any) => [item.StateName, item])).values()];
```

**After:**
```typescript
// Format state data for Select2 dropdown
const uniqueStates = [...new Map(this.pinCodeAreaOfficeCircleDataJSON.map((item: any) => [item.StateName, item])).values()];
this.stateNameData = uniqueStates.map((state: any) => ({
  label: state.StateName,
  value: state.StateName
}));
```

**Why:** Select2 requires data in the format `{label: string, value: string}` to display properly in the dropdown.

#### Change 3: Improved State Change Handler
**Before:**
```typescript
stateChange(data: Select2UpdateEvent) {
  if(data && data?.value && this.checkIfPinCodeExists) {
    this.form.controls['city'].setValue('');
    this.form.controls['area'].setValue('');
    this.form.controls['pincode'].setValue('');
    // ... rest of the code
  }
}
```

**After:**
```typescript
stateChange(data: Select2UpdateEvent) {
  if(data && data?.value && this.checkIfPinCodeExists) {
    this.form.controls['city'].setValue('');
    this.form.controls['area'].setValue('');
    this.form.controls['pincode'].setValue('');
    this.cityOptions = [];          // ✅ Clear previous city options
    this.officeNameData = [];       // ✅ Clear previous area options
    // ... rest of the code
  }
}
```

**Why:** Clearing the arrays ensures that when a new state is selected, old city and area data doesn't persist.

### 2. SCSS Styling (`address-modal.component.scss`)

#### Added Disabled State Styling
```scss
// Ensure disabled select2 is still visible
&.select2-container--disabled {
  .select2-selection {
    background: #f0f0f0;
    border-color: #d0d0d0;
    opacity: 0.7;
    cursor: not-allowed;
  }
}
```

**Why:** This ensures that even when select2 elements are disabled (like Country), they remain visible with appropriate styling to indicate they're disabled.

## How the Functionality Works

### Flow of User Interaction:

1. **Country Field** (Disabled)
   - Pre-filled with "India" (ID: 356)
   - Disabled because the app only supports India

2. **State Field** (Enabled)
   - Populated from `stateNameData` (loaded from JSON)
   - User selects a state
   - Triggers `stateChange()` which:
     - Clears city, area, and pincode
     - Filters districts/cities for the selected state
     - Populates `cityOptions` array

3. **City Field** (Enabled after state selection)
   - Shows districts/cities for the selected state
   - User selects a city
   - Triggers `cityChange()` which:
     - Clears area and pincode
     - Filters areas (office names) for the selected city
     - Populates `officeNameData` array
     - Enables the area field

4. **Area Field** (Enabled after city selection)
   - Shows areas (office names) for the selected city
   - User selects an area
   - Triggers `areaChange()` which:
     - Auto-fills the pincode based on the selected area

5. **Pincode Field** (Auto-filled or manually editable)
   - Auto-filled when area is selected
   - Can also be manually entered
   - When manually entered, it validates and auto-fills state, city, and area

### Validation Flow:

- When a pincode is manually entered (6 digits):
  - System searches for matching pincode in the JSON data
  - If found: Auto-fills state, city, and area
  - If not found: Shows error "Invalid Pincode"

## Testing Checklist

- [ ] Open the address modal
- [ ] Verify all fields are visible (Country, State, City, Area, Pincode)
- [ ] Country should show "India" and be disabled
- [ ] State dropdown should show list of Indian states
- [ ] Select a state → City dropdown should populate
- [ ] Select a city → Area dropdown should populate
- [ ] Select an area → Pincode should auto-fill
- [ ] Try entering a pincode manually → State, City, Area should auto-fill
- [ ] Try entering an invalid pincode → Error message should appear
- [ ] Submit the form with all fields filled → Address should be saved

## Additional Notes

- The component uses the `country-state-city` library for location data
- Pincode validation is done via API call to `authService.validatePinCode()`
- The JSON data is fetched from `authService.fetchAreaPINCodeJSON()`
- Form uses reactive forms with validators for all required fields
