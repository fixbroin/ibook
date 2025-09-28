

'use client';

import { useState, useMemo, useEffect, useTransition, useCallback } from 'react';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BookingSchema } from '@/lib/schema';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { createBooking, verifyBookingPayment } from '@/lib/actions';
import { getBookingsForDay, getAdminSettings } from '@/lib/data';
import type { Provider, ServiceType, Booking, BookingFormValues, RazorpaySettings } from '@/lib/types';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Laptop, Building, MapPin, ArrowLeft, Calendar as CalendarIcon, Clock, User, Mail, Phone, Loader2, Globe } from 'lucide-react';
import { add, format, parse, startOfDay, isEqual, addDays, isToday, startOfToday } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { getAddressFromPincode } from '@/lib/pincode.actions';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const serviceIcons = {
  'online': <Laptop className="h-8 w-8 mb-2" />,
  'shop': <Building className="h-8 w-8 mb-2" />,
  'doorstep': <MapPin className="h-8 w-8 mb-2" />,
};

function debounce<T extends (...args: any[]) => void>(func: T, delay: number) {
  let timeout: NodeJS.Timeout;
  return function(this: any, ...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}


const Step2_Details = ({
  onContinue,
  serviceType,
  provider
}: {
  onContinue: () => void;
  serviceType: string | null;
  provider: Provider;
}) => {
  const [isTransitioning, startTransition] = useTransition();
  const form = useFormContext<BookingFormValues>();
  const { setValue, trigger } = form;

  const autofillAddress = async (pincode: string) => {
    if (pincode.length >= 5) {
      startTransition(async () => {
        const result = await getAddressFromPincode(pincode);
        if (result && !result.error) {
          setValue('city', result.city || '', { shouldValidate: true });
          setValue('state', result.state || '', { shouldValidate: true });
          setValue('country', result.country || '', { shouldValidate: true });
        }
      });
    }
  };
  
  const debouncedAutofill = useCallback(debounce(autofillAddress, 500), []);

  const handlePincodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setValue('pincode', value, { shouldValidate: true });
    debouncedAutofill(value);
  };

  const handleContinueClick = async () => {
    const fieldsToValidate: (keyof BookingFormValues)[] = [
      "customerName",
      "customerEmail",
      "customerPhone",
    ];

    const serviceTypeSetting = provider.settings.serviceTypes.find(st => st.name === serviceType);
    if (serviceTypeSetting?.id === "doorstep") {
      fieldsToValidate.push(
        "flatHouseNo",
        "pincode",
        "city",
        "state",
        "country"
      );
    }
    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      onContinue();
    }
  }
  
  const serviceTypeSetting = provider.settings.serviceTypes.find(st => st.name === serviceType);
  const isDoorstep = serviceTypeSetting?.id === 'doorstep';
  const isShopVisit = serviceTypeSetting?.id === 'shop';

  return (
    <Form {...form}>
      <form onSubmit={(e) => e.preventDefault()}>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-center md:text-left">Please provide your contact information.</p>
          
          <FormField
            control={form.control}
            name="customerName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="Srikanth Achari" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="customerEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="customerPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="+91 9876543210" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {isDoorstep && (
            <div className="space-y-4 pt-4 border-t">
              <p className="font-medium">Doorstep Service Address</p>
              <FormField
                control={form.control}
                name="flatHouseNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Flat/House No, Building</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. #123, Maple Apartments" {...field} value={field.value || ''}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="landmark"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Landmark</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Near City Park" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pincode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pincode</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 560100" {...field} onChange={handlePincodeChange} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Bangalore" {...field} value={field.value || ''}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Karnataka" {...field} value={field.value || ''}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. India" {...field} value={field.value || ''}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}
          {isShopVisit && provider.settings.shopAddress && (
            <div className="p-4 rounded-lg bg-muted flex items-start gap-4">
              <MapPin className="h-5 w-5 mt-1 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="font-semibold">Meeting at our location:</p>
                <p className="text-muted-foreground">{provider.settings.shopAddress}</p>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={handleContinueClick} className="w-full" type="button">Continue</Button>
        </CardFooter>
      </form>
    </Form>
  );
};


export function BookingForm({ provider }: { provider: Provider }) {
  const [step, setStep] = useState(1);
  const [serviceType, setServiceType] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [dailyBookings, setDailyBookings] = useState<Booking[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [razorpaySettings, setRazorpaySettings] = useState<RazorpaySettings | null>(null);
  
  const router = useRouter();
  const { toast } = useToast();

  const localStorageKey = `bookingState_${provider.username}`;

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(BookingSchema),
    defaultValues: {
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      flatHouseNo: '',
      landmark: '',
      pincode: '',
      city: '',
      state: '',
      country: '',
      dateTime: '', 
      providerUsername: provider.username,
    },
    mode: 'onChange',
  });
  
  const { setValue, getValues, watch } = form;

  const getTimeSlotsForDate = useCallback((date: Date | undefined, provider: Provider): string[] => {
    if (!date || !provider.settings.workingHours) return [];

    const dayOfWeek = format(date, 'EEEE').toLowerCase();
    const workingHours = provider.settings.workingHours[dayOfWeek as keyof typeof provider.settings.workingHours];

    const blockedDates = provider.settings.blockedDates || [];
    if (blockedDates.includes(format(date, 'yyyy-MM-dd'))) {
      return [];
    }

    if (!workingHours) return [];

    const slots = [];
    let currentTime = parse(workingHours.start, 'HH:mm', startOfDay(date));
    const endTime = parse(workingHours.end, 'HH:mm', startOfDay(date));
    
    const now = new Date();
    const bookingDelayLimit = add(now, { hours: provider.settings.bookingDelay || 0 });
    const totalSlotTime = provider.settings.slotDuration + (provider.settings.breakTime || 0);
    const blockedSlots = provider.settings.blockedSlots || [];

    const isSelectedDateToday = isToday(date);

    while (currentTime < endTime) {
        const slotISO = currentTime.toISOString();
        let isSlotAvailable = !blockedSlots.includes(slotISO);

        if (isSelectedDateToday) {
            if (currentTime <= bookingDelayLimit) {
                isSlotAvailable = false;
            }
        }
        
        if (isSlotAvailable) {
            slots.push(format(currentTime, 'p'));
        }
        
        currentTime = add(currentTime, { minutes: totalSlotTime });
    }
    return slots;
  }, []);

  const getAvailableSlots = useCallback((date: Date, bookings: Booking[], provider: Provider): string[] => {
      const allSlots = getTimeSlotsForDate(date, provider);
      if (!allSlots.length) return [];

      return allSlots.filter(time => {
          const slotTime = parse(time, 'p', date);
          const bookingsInSlot = bookings.filter(b => isEqual(b.dateTime, slotTime)).length;
          const isFull = provider.settings.multipleBookingsPerSlot && bookingsInSlot >= provider.settings.bookingsPerSlot;
          const isBooked = !provider.settings.multipleBookingsPerSlot && bookingsInSlot > 0;
          return !isFull && !isBooked;
      });
  }, [getTimeSlotsForDate]);

  const findNextAvailableDate = useCallback((startDate: Date, provider: Provider): Date => {
      let currentDate = startOfDay(startDate);
      for (let i = 0; i < 365; i++) {
          const slots = getTimeSlotsForDate(currentDate, provider);
          if (slots.length > 0) {
              return currentDate;
          }
          currentDate = addDays(currentDate, 1);
      }
      return startOfToday();
  }, [getTimeSlotsForDate]);

  useEffect(() => {
    try {
      getAdminSettings().then(settings => {
        if (settings?.razorpay) {
            setRazorpaySettings(settings.razorpay);
        }
      });
      
      const savedState = localStorage.getItem(localStorageKey);
      if (savedState) {
        const { step, serviceType, formData, selectedDate, selectedTime } = JSON.parse(savedState);
        setStep(step || 1);
        setServiceType(serviceType || null);
        setSelectedDate(selectedDate ? new Date(selectedDate) : findNextAvailableDate(startOfToday(), provider));
        setSelectedTime(selectedTime || null);

        if (formData) {
          Object.keys(formData).forEach(key => {
            setValue(key as keyof BookingFormValues, formData[key]);
          });
        }
        if (serviceType) {
          setValue('serviceType', serviceType);
        }

      } else {
        setSelectedDate(findNextAvailableDate(startOfToday(), provider));
      }
    } catch (e) {
      console.error("Failed to parse booking state from local storage", e);
      localStorage.removeItem(localStorageKey);
      setSelectedDate(findNextAvailableDate(startOfToday(), provider));
    }
  }, []);


  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      try {
        const stateToSave = {
          step,
          serviceType,
          formData: getValues(),
          selectedDate,
          selectedTime,
        };
        localStorage.setItem(localStorageKey, JSON.stringify(stateToSave));
      } catch (e) {
        console.error("Failed to save booking state to local storage", e);
      }
    });

    const currentState = {
        step,
        serviceType,
        formData: getValues(),
        selectedDate,
        selectedTime,
      };
    localStorage.setItem(localStorageKey, JSON.stringify(currentState));

    return () => subscription.unsubscribe();
  }, [watch, step, serviceType, selectedDate, selectedTime, localStorageKey]);


  useEffect(() => {
    if (selectedDate && provider) {
      getBookingsForDay(provider.username, selectedDate).then(setDailyBookings);
    }
  }, [selectedDate, provider]);


  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedTime(null); 
    if (date) {
      getBookingsForDay(provider.username, date).then(setDailyBookings);
    } else {
      setDailyBookings([]);
    }
  };


  const timeSlots = useMemo(() => {
    if (!selectedDate || !provider) return [];
    return getAvailableSlots(selectedDate, dailyBookings, provider,);
  }, [selectedDate, dailyBookings, provider, getAvailableSlots]);
  

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s > 1 ? s - 1 : 1);
  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  const handleTimeSelect = (time: string) => {
    if (!selectedDate) return;
    const slotTime = parse(time, 'p', selectedDate);
    const bookingsInSlot = dailyBookings.filter(b => isEqual(b.dateTime, slotTime)).length;

    if (provider.settings.multipleBookingsPerSlot && bookingsInSlot >= provider.settings.bookingsPerSlot) {
      return;
    }
    setSelectedTime(time);
  };
  
  const handleSelectServiceType = (type: string) => {
    setServiceType(type);
    setValue('serviceType', type as 'Online' | 'Shop Visit' | 'Doorstep');
    nextStep();
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const finalDateTime = selectedDate && selectedTime ? parse(selectedTime, 'p', selectedDate) : null;
    if (!finalDateTime) {
      setError('Please select a valid date and time.');
      return;
    }

    startTransition(async () => {
        const payload = new FormData();
        const currentFormData = getValues();
        Object.entries(currentFormData).forEach(([key, value]) => {
            if (value) payload.set(key, value.toString());
        });
        payload.set('dateTime', finalDateTime.toISOString());
        
        const result = await createBooking(payload);

        if (result?.errors) {
            const errorMessages = Object.values(result.errors).flat();
            setError(errorMessages.join(', '));
        } else if (result?.order) {
            if (!razorpaySettings?.keyId) {
                setError('Payment gateway is not configured. Please contact the provider.');
                return;
            }
            
            const options = {
                key: razorpaySettings.keyId,
                amount: result.order.amount,
                currency: result.order.currency,
                name: `${provider.name} - Booking`,
                description: `Payment for ${serviceType}`,
                order_id: result.order.id,
                handler: async (response: any) => {
                    setIsVerifying(true);
                    const verificationResult = await verifyBookingPayment(
                        provider.username,
                        result.bookingId!,
                        response,
                        result.order.amount / 100
                    );

                    if (verificationResult.success) {
                        toast({
                            title: 'Payment Successful!',
                            description: 'Your booking has been confirmed.',
                        });
                        localStorage.removeItem(localStorageKey);
                        const params = new URLSearchParams(result.confirmationParams);
                        params.set('orderId', response.razorpay_order_id);
                        params.set('paymentId', response.razorpay_payment_id);
                        params.set('amountPaid', String(result.order.amount / 100));
                        router.push(`/confirmation?${params.toString()}`);
                    } else {
                        setError(verificationResult.error || 'Payment verification failed. Please contact support.');
                        setIsVerifying(false);
                    }
                },
                prefill: {
                    name: currentFormData.customerName,
                    email: currentFormData.customerEmail,
                    contact: currentFormData.customerPhone,
                },
                notes: {
                    bookingId: result.bookingId,
                    providerUsername: provider.username,
                },
                modal: {
                    ondismiss: () => {
                        toast({
                            title: 'Payment Canceled',
                            description: 'Your booking has been saved but is pending payment. Please try again.',
                            variant: 'destructive',
                        });
                    }
                }
            };
            
            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', (response: any) => {
                 setError(`Payment failed: ${response.error.description}. Please try again.`);
            });
            rzp.open();
        } else {
            // Free booking flow is handled by server-side redirect
        }
    });
  }
  
  const Step1_ServiceType = () => (
    <CardContent>
      <p className="mb-6 text-muted-foreground text-center md:text-left">How would you like to meet?</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {provider.settings.serviceTypes.filter(st => st.enabled).map(type => (
          <button
            key={type.id}
            type="button"
            onClick={() => handleSelectServiceType(type.name)}
            className="flex flex-col items-center justify-center p-6 border rounded-lg hover:bg-accent hover:border-primary transition-colors text-center relative"
          >
            {type.priceEnabled && type.price && type.price > 0 ? (
                <Badge className="absolute -top-2 -right-2">Pay ₹{type.price}</Badge>
            ) : (
                <Badge variant="secondary" className="absolute -top-2 -right-2">Free</Badge>
            )}
            {serviceIcons[type.id]}
            <span className="font-semibold mt-2">{type.name}</span>
          </button>
        ))}
      </div>
    </CardContent>
  );

  const Step3_DateTime = () => {
    return (
      <>
        <CardContent className="grid md:grid-cols-2 gap-8">
          <div className="flex flex-col items-center md:items-stretch md:col-span-1">
            <h3 className="font-semibold mb-4 text-center md:text-left">Select a Date</h3>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              disabled={(date) => {
                if (date < startOfToday()) return true;
                const availableSlots = getTimeSlotsForDate(date, provider);
                const isDayAvailable = availableSlots.length > 0;
                return !isDayAvailable;
              }}
              className="rounded-md border self-center"
            />
          </div>
          <div className="md:col-span-1">
            <h3 className="font-semibold mb-4 text-center md:text-left">Select a Time</h3>
            <div className="flex flex-col space-y-2 max-h-96 overflow-y-auto">
              {selectedDate && timeSlots.length > 0 ? timeSlots.map(time => {
                const baseDate = startOfDay(selectedDate);
                const slotTime = parse(time, 'p', baseDate);
                const bookingsInSlot = dailyBookings.filter(b => isEqual(b.dateTime, slotTime)).length;
                const isFull = provider.settings.multipleBookingsPerSlot && bookingsInSlot >= provider.settings.bookingsPerSlot;
                const isBooked = !provider.settings.multipleBookingsPerSlot && bookingsInSlot > 0;
                const isDisabled = isFull || isBooked;

                return (
                <Button
                  key={time}
                  type="button"
                  variant={selectedTime === time ? "default" : "outline"}
                  onClick={() => handleTimeSelect(time)}
                  disabled={isDisabled}
                  className="relative justify-between"
                >
                  <span>{time}</span>
                  {provider.settings.multipleBookingsPerSlot && !isDisabled && (
                     <span className="text-xs bg-primary/20 text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center">
                      {provider.settings.bookingsPerSlot - bookingsInSlot}
                    </span>
                  )}
                </Button>
              )}) : <p className="text-muted-foreground col-span-3 text-sm text-center">{selectedDate ? "No available slots for this day." : "Please select a date first."}</p>}
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={nextStep} disabled={!selectedTime} className="w-full">Review Booking</Button>
        </CardFooter>
      </>
    );
  };
  
  const Step4_Confirm = ({ dateFormat }: { dateFormat: string }) => {
    const finalDateTime = selectedDate && selectedTime ? parse(selectedTime, 'p', selectedDate) : null;
    const serviceTypeSetting = provider.settings.serviceTypes.find(st => st.name === serviceType);
    const formData = getValues();

    const addressString = serviceTypeSetting?.id === 'doorstep' 
        ? `${formData.flatHouseNo}, ${formData.landmark ? formData.landmark + ', ' : ''}${formData.city}, ${formData.state} - ${formData.pincode}, ${formData.country}`
        : serviceTypeSetting?.id === 'shop' ? provider.settings.shopAddress : 'Online';
        
    const isPaidService = serviceTypeSetting?.priceEnabled && serviceTypeSetting.price && serviceTypeSetting.price > 0;

    return (
      <>
        <CardContent>
            <form onSubmit={handleFormSubmit} className="space-y-6">
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">{formData.customerName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">{formData.customerEmail}</span>
                    </div>
                     <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">{formData.customerPhone}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-5 text-muted-foreground">{serviceIcons[serviceTypeSetting!.id]}</div>
                        <span className="font-medium">{serviceType}</span>
                    </div>
                     
                    {addressString && serviceTypeSetting?.id !== 'online' && (
                        <div className="flex items-start gap-3">
                             <MapPin className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
                            <span className="font-medium">{addressString}</span>
                        </div>
                    )}
                    
                    <div className="flex items-center gap-3">
                        <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">{finalDateTime && format(finalDateTime, dateFormat)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">{selectedTime}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Globe className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">{provider.settings.timezone.replace(/_/g, ' ')}</span>
                    </div>
                     {isPaidService && (
                         <div className="flex items-center justify-between gap-3 pt-2 border-t mt-4">
                            <span className="font-semibold text-lg">Total to Pay:</span>
                            <span className="font-bold text-lg">₹{serviceTypeSetting.price}</span>
                        </div>
                     )}
                </div>

                 <Button type="submit" className="w-full" size="lg" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isPaidService ? 'Proceed to Payment' : 'Confirm Booking'}
                 </Button>
                {error && <p className="text-sm text-destructive text-center">{error}</p>}
            </form>
        </CardContent>
        </>
    );
  };

  const getStepTitle = () => {
    switch(step) {
        case 1: return 'Select Service Type';
        case 2: return 'Your Details';
        case 3: return 'Pick a Date & Time';
        case 4: return 'Confirm Your Booking';
        default: return 'Book an Appointment';
    }
  }

  const getStepDescription = () => {
     switch(step) {
        case 1: return `Choose the type of service you need with ${provider.name}.`;
        case 2: return `Provide your details for the booking.`;
        case 3: return 'Select an available slot from the calendar.';
        case 4: return 'Please review your booking details below before confirming.';
        default: return '';
    }
  }

  if (isVerifying) {
    return (
      <Card className="w-full max-w-lg mx-auto shadow-2xl md:shadow-lg">
        <CardContent className="flex flex-col items-center justify-center p-12 gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <h2 className="text-xl font-semibold">Verifying Payment...</h2>
          <p className="text-muted-foreground text-center">Please wait while we confirm your transaction. Do not close this window.</p>
        </CardContent>
      </Card>
    );
  }


  return (
    <Card className="w-full max-w-5xl mx-auto shadow-2xl md:shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-4 mb-4">
          {step > 1 && (
            <Button variant="ghost" size="icon" onClick={prevStep} type="button" className="h-8 w-8">
              <ArrowLeft />
            </Button>
          )}
          <div className="flex-1">
            <CardTitle className="text-2xl">{getStepTitle()}</CardTitle>
            <CardDescription>{getStepDescription()}</CardDescription>
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </CardHeader>
      <FormProvider {...form}>
        {step === 1 && <Step1_ServiceType />}
        {step === 2 && <Step2_Details onContinue={nextStep} serviceType={serviceType} provider={provider} />}
        {step === 3 && <Step3_DateTime />}
        {step === 4 && <Step4_Confirm dateFormat={provider.settings.dateFormat || 'PPP'} />}
      </FormProvider>
    </Card>
  );
}
