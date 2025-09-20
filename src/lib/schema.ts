import { z } from 'zod';

export const BookingSchema = z.object({
  customerName: z.string().min(1, 'You need to fill this field'),
  customerEmail: z.string().email('Invalid email address').min(1, 'You need to fill this field'),
  customerPhone: z.string().min(1, 'You need to fill this field'),
  serviceType: z.enum(['Online', 'Shop Visit', 'Doorstep']),
  flatHouseNo: z.string().optional(),
  landmark: z.string().optional(),
  pincode: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  dateTime: z.string().datetime('Invalid date and time'),
  providerUsername: z.string(),
}).superRefine((data, ctx) => {
    if (data.serviceType === 'Doorstep') {
        const requiredFieldMessage = 'You need to fill this field';
        if (!data.flatHouseNo) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: requiredFieldMessage,
                path: ['flatHouseNo'],
            });
        }
        if (!data.pincode) {
             ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: requiredFieldMessage,
                path: ['pincode'],
            });
        }
        if (!data.city) {
             ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: requiredFieldMessage,
                path: ['city'],
            });
        }
        if (!data.state) {
             ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: requiredFieldMessage,
                path: ['state'],
            });
        }
        if (!data.country) {
             ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: requiredFieldMessage,
                path: ['country'],
            });
        }
    }
});

export type BookingFormValues = z.infer<typeof BookingSchema>;

    