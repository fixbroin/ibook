

import { z } from 'zod';
import { countries } from './countries';

export const BookingSchema = z.object({
  customerName: z.string().min(1, 'You need to fill this field'),
  customerEmail: z.string().email('Invalid email address').min(1, 'You need to fill this field'),
  countryCode: z.string().min(1, 'Country code is required.'),
  customerPhone: z.string().min(1, 'You need to fill this field'),
  serviceType: z.string().min(1, 'Please select a service type.'),
  serviceId: z.string().optional(),
  flatHouseNo: z.string().optional(),
  landmark: z.string().optional(),
  pincode: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  dateTime: z.string().datetime('Invalid date and time'),
  providerUsername: z.string(),
  paymentMethod: z.enum(['online', 'later']).optional(),
  quantity: z.coerce.number().optional(),
}).superRefine((data, ctx) => {
    // Doorstep service address validation
    if (data.serviceType === 'Doorstep') {
        const requiredFieldMessage = 'You need to fill this field';
        if (!data.flatHouseNo) ctx.addIssue({ code: z.ZodIssueCode.custom, message: requiredFieldMessage, path: ['flatHouseNo'] });
        if (!data.pincode) ctx.addIssue({ code: z.ZodIssueCode.custom, message: requiredFieldMessage, path: ['pincode'] });
        if (!data.city) ctx.addIssue({ code: z.ZodIssueCode.custom, message: requiredFieldMessage, path: ['city'] });
        if (!data.state) ctx.addIssue({ code: z.ZodIssueCode.custom, message: requiredFieldMessage, path: ['state'] });
        if (!data.country) ctx.addIssue({ code: z.ZodIssueCode.custom, message: requiredFieldMessage, path: ['country'] });
    }

    // Phone number validation based on country code
    const country = countries.find(c => c.dial_code === data.countryCode);
    if (country && data.customerPhone) {
      // Remove country code if it's prepended
      const phoneWithoutCode = data.customerPhone.startsWith(data.countryCode) 
        ? data.customerPhone.substring(data.countryCode.length) 
        : data.customerPhone;
        
      if (phoneWithoutCode.length < country.minLength || phoneWithoutCode.length > country.maxLength) {
        let message = `Please enter a valid phone number for ${country.name}.`;
        if (country.minLength === country.maxLength) {
          message = `Please enter a valid ${country.minLength}-digit number for ${country.name}.`;
        } else {
          message = `Please enter a number between ${country.minLength} and ${country.maxLength} digits for ${country.name}.`;
        }
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: message,
          path: ['customerPhone'],
        });
      }
    }
});

export type BookingFormValues = z.infer<typeof BookingSchema>;
