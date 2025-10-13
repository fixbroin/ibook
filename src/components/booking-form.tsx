
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
import type { Country } from '@/lib/countries';
import { countries } from '@/lib/countries';
import { getCurrency, type Currency } from '@/lib/currencies';
import { timezones } from '@/lib/timezones';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Laptop, Building, MapPin, ArrowLeft, Calendar as CalendarIcon, Clock, User, Mail, Phone, Loader2, Globe, CreditCard, Banknote, ChevronsUpDown, Check } from 'lucide-react';
import { add, format, parse, startOfDay, isEqual, addDays, isToday, startOfToday } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';
import { Progress } from '@/components/ui/progress';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { getAddressFromPincode } from '@/lib/pincode.actions';
import { CountryCodeSelector } from './country-code-selector';
import { cn } from '@/lib/utils';

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
  provider,
  onTimezoneDetect
}: {
  onContinue: () => void;
  serviceType: string | null;
  provider: Provider;
  onTimezoneDetect: (timezone: string) => void;
}) => {
  const [isTransitioning, startTransition] = useTransition();
  const form = useFormContext<BookingFormValues>();
  const { setValue, trigger, watch } = form;

  const selectedCountryCode = watch('countryCode');
  const selectedCountry = countries.find(c => c.dial_code === selectedCountryCode) || countries.find(c => c.code === 'IN')!;


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
      "countryCode",
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

           <div className="space-y-2">
                <FormLabel>Phone Number</FormLabel>
                <div className="flex items-start gap-2">
                    <FormField
                    control={form.control}
                    name="countryCode"
                    render={() => (
                        <FormItem>
                        <CountryCodeSelector
                            selectedCountry={selectedCountry}
                            onSelect={(country) => setValue('countryCode', country.dial_code, { shouldValidate: true })}
                            onTimezoneDetect={onTimezoneDetect}
                        />
                         <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="customerPhone"
                    render={({ field }) => (
                        <FormItem className="flex-1">
                        <FormControl>
                            <Input type="tel" placeholder="9876543210" {...field} onChange={e => field.onChange(e.target.value.replace(/\D/g, ''))} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
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
  const [selectedTime, setSelectedTime] = useState<string | null>(null); // This will now store the UTC ISO string
  const [dailyBookings, setDailyBookings] = useState<Booking[]>([]);
  const [isPending, startTransition] = useTransition();
  const [processingMethod, setProcessingMethod] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [razorpaySettings, setRazorpaySettings] = useState<RazorpaySettings | null>(null);
  const currency = getCurrency(provider.settings.currency);
  const [userTimeZone, setUserTimeZone] = useState<string>(Intl.DateTimeFormat().resolvedOptions().timeZone || provider.settings.timezone);
  const [openTimezoneCombobox, setOpenTimezoneCombobox] = useState(false);
  
  const router = useRouter();
  const { toast } = useToast();

  const localStorageKey = `bookingState_${provider.username}`;
  
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(BookingSchema),
    defaultValues: {
      customerName: '',
      customerEmail: '',
      countryCode: '+91', // Default to India
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
  
  const { setValue, getValues, watch, trigger } = form;

  const getTimeSlotsForDate = useCallback((date: Date | undefined, provider: Provider): Date[] => {
    if (!date || !provider.settings.workingHours) return [];

    const providerTimeZone = provider.settings.timezone;
    const dayOfWeek = formatInTimeZone(date, providerTimeZone, 'EEEE').toLowerCase();
    const workingHours = provider.settings.workingHours[dayOfWeek as keyof typeof provider.settings.workingHours];

    const blockedDates = provider.settings.blockedDates || [];
    if (blockedDates.includes(formatInTimeZone(date, providerTimeZone, 'yyyy-MM-dd'))) {
        return [];
    }

    if (!workingHours) return [];

    const slots: Date[] = [];
    const dayString = format(toZonedTime(date, providerTimeZone), 'yyyy-MM-dd');

    // Parse start and end times in the provider's timezone to get correct UTC equivalents
    const startTime = parse(`${dayString} ${workingHours.start}`, 'yyyy-MM-dd HH:mm', new Date());
    const endTime = parse(`${dayString} ${workingHours.end}`, 'yyyy-MM-dd HH:mm', new Date());
    
    // We create the zoned time from the parsed local time. This assumes the server running this is in UTC.
    // A better approach is to parse with timezone information if date-fns-tz supported it directly,
    // or construct the date string with timezone offset before parsing.
    let currentTime = toZonedTime(startTime, providerTimeZone);

    const now = new Date();
    const bookingDelayLimit = add(toZonedTime(now, providerTimeZone), { hours: provider.settings.bookingDelay || 0 });
    const totalSlotTime = provider.settings.slotDuration + (provider.settings.breakTime || 0);
    const blockedSlots = provider.settings.blockedSlots || [];

    const isSelectedDateToday = isSameDay(toZonedTime(date, providerTimeZone), toZonedTime(now, providerTimeZone));

    while (currentTime < toZonedTime(endTime, providerTimeZone)) {
        const slotUtc = currentTime; 
        const slotISO = slotUtc.toISOString();
        let isSlotAvailable = !blockedSlots.includes(slotISO);

        if (isSelectedDateToday) {
            if (slotUtc <= bookingDelayLimit) {
                isSlotAvailable = false;
            }
        }
        
        if (isSlotAvailable) {
            slots.push(slotUtc);
        }
        
        currentTime = add(currentTime, { minutes: totalSlotTime });
    }
    return slots;
  }, []);

  const getAvailableSlots = useCallback((date: Date, bookings: Booking[], provider: Provider): Date[] => {
      const allSlots = getTimeSlotsForDate(date, provider);
      if (!allSlots.length) return [];
      
      return allSlots.filter(slotUtc => {
          const bookingsInSlot = bookings.filter(b => isEqual(new Date(b.dateTime), slotUtc)).length;
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
        const { step, serviceType, formData, selectedDate, selectedTime, userTimeZone: savedTimeZone } = JSON.parse(savedState);
        setStep(step || 1);
        setServiceType(serviceType || null);
        setSelectedDate(selectedDate ? new Date(selectedDate) : findNextAvailableDate(startOfToday(), provider));
        setSelectedTime(selectedTime || null);
        setUserTimeZone(savedTimeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || provider.settings.timezone);

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
          userTimeZone,
        };
        localStorage.setItem(localStorageKey, JSON.stringify(stateToSave));
      } catch (e) {
        console.error("Failed to save booking state to local storage", e);
      }
    });

    return () => subscription.unsubscribe();
  }, [watch, step, serviceType, selectedDate, selectedTime, userTimeZone, localStorageKey, getValues]);


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

  const handleTimeSelect = (time: Date) => { // time is now a Date object in UTC
    setSelectedTime(time.toISOString());
  };
  
  const handleSelectServiceType = (type: string) => {
    setServiceType(type);
    setValue('serviceType', type as 'Online' | 'Shop Visit' | 'Doorstep');
    nextStep();
  };

  const handleFormSubmit = (paymentMethod?: 'online' | 'later') => {
    setError(null);
    setProcessingMethod(paymentMethod || 'free');

    const finalDateTime = selectedTime ? new Date(selectedTime) : null;
    if (!finalDateTime) {
      setError('Please select a valid date and time.');
      setProcessingMethod(null);
      return;
    }

    startTransition(async () => {
        const payload = new FormData();
        const currentFormData = getValues();
        
        Object.entries(currentFormData).forEach(([key, value]) => {
            if (value) {
                 payload.set(key, value.toString());
            }
        });

        payload.set('dateTime', finalDateTime.toISOString());
        payload.set('customerTimezone', userTimeZone); // Pass user's timezone to server action

        if (paymentMethod) {
            payload.set('paymentMethod', paymentMethod);
        }
        
        const result = await createBooking(payload);

        if (result?.errors) {
            const errorMessages = Object.values(result.errors).flat();
            setError(errorMessages.join(', '));
            setProcessingMethod(null);
        } else if (result?.order) {
            if (!razorpaySettings?.keyId) {
                setError('Payment gateway is not configured. Please contact the provider.');
                setProcessingMethod(null);
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
                    contact: `${currentFormData.countryCode}${currentFormData.customerPhone}`,
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
                        setProcessingMethod(null);
                    }
                }
            };
            
            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', (response: any) => {
                 setError(`Payment failed: ${response.error.description}. Please try again.`);
                 setProcessingMethod(null);
            });
            rzp.open();
        } else {
            // Free booking flow is handled by server-side redirect in createBooking
            // No need to reset processing method here as the page will redirect
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
                <Badge className="absolute -top-2 -right-2">Pay {currency?.symbol}{type.price}</Badge>
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
    const selectedTimezoneData = timezones.find(tz => tz.name === userTimeZone);

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
             <div className="space-y-2 mb-4">
                <Label htmlFor="user-timezone">Your Timezone</Label>
                 <Popover open={openTimezoneCombobox} onOpenChange={setOpenTimezoneCombobox}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                    >
                      <span className="truncate">{selectedTimezoneData ? `${selectedTimezoneData.name.split('/').pop()?.replace(/_/g, ' ')} (${selectedTimezoneData.offset})` : 'Select timezone...'}</span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command filter={(value, search) => value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0}>
                      <CommandInput placeholder="Search timezone..." />
                      <CommandList>
                        <CommandEmpty>No timezone found.</CommandEmpty>
                        <CommandGroup>
                           {timezones.map((tz) => (
                            <CommandItem
                              key={tz.name}
                              value={`${tz.name.replace(/_/g, ' ')} ${tz.offset}`}
                              onSelect={(currentValue) => {
                                const selectedTz = timezones.find(t => `${t.name.replace(/_/g, ' ')} ${t.offset}`.toLowerCase() === currentValue.toLowerCase());
                                if (selectedTz) {
                                  setUserTimeZone(selectedTz.name);
                                }
                                setOpenTimezoneCombobox(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", userTimeZone === tz.name ? "opacity-100" : "opacity-0")} />
                              {tz.name.replace(/_/g, ' ')} ({tz.offset})
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
            </div>
            <h3 className="font-semibold mb-4 text-center md:text-left">Select a Time</h3>
            <div className="flex flex-col space-y-2 max-h-80 overflow-y-auto">
              {selectedDate && timeSlots.length > 0 ? timeSlots.map(slotUtc => {
                const slotISO = slotUtc.toISOString();
                const isSelected = selectedTime === slotISO;

                return (
                <Button
                  key={slotISO}
                  type="button"
                  variant={isSelected ? "default" : "outline"}
                  onClick={() => handleTimeSelect(slotUtc)}
                  className="relative justify-between"
                >
                  <span>{formatInTimeZone(slotUtc, userTimeZone, 'p')}</span>
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
    const finalDateTime = selectedTime ? new Date(selectedTime) : null;
    const serviceTypeSetting = provider.settings.serviceTypes.find(st => st.name === serviceType);
    const formData = getValues();
    const providerTimeZone = provider.settings.timezone;

    const addressString = serviceTypeSetting?.id === 'doorstep' 
        ? `${formData.flatHouseNo}, ${formData.landmark ? formData.landmark + ', ' : ''}${formData.city}, ${formData.state} - ${formData.pincode}, ${formData.country}`
        : serviceTypeSetting?.id === 'shop' ? provider.settings.shopAddress : 'Online';
        
    const isPaidService = !!(serviceTypeSetting?.priceEnabled && serviceTypeSetting.price && serviceTypeSetting.price > 0);
    const onlinePayment = provider.settings.onlinePaymentEnabled;
    const payAfterService = provider.settings.payAfterServiceEnabled;

    const displayTimeInProviderTz = finalDateTime ? formatInTimeZone(finalDateTime, providerTimeZone, 'p') : '';
    const displayTimeInUserTz = finalDateTime ? formatInTimeZone(finalDateTime, userTimeZone, 'p') : '';
    const displayDate = finalDateTime ? formatInTimeZone(finalDateTime, providerTimeZone, dateFormat) : '';

    return (
      <>
        <CardContent>
            <div className="space-y-6">
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
                        <span className="font-medium">{formData.countryCode} {formData.customerPhone}</span>
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
                        <span className="font-medium">{displayDate}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">{displayTimeInProviderTz} ({providerTimeZone.split('/').pop()?.replace(/_/g, ' ')})</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Globe className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">{displayTimeInUserTz} ({userTimeZone.split('/').pop()?.replace(/_/g, ' ')})</span>
                    </div>
                     {isPaidService && (
                         <div className="flex items-center justify-between gap-3 pt-2 border-t mt-4">
                            <span className="font-semibold text-lg">Total to Pay:</span>
                            <span className="font-bold text-lg">{currency?.symbol}{serviceTypeSetting.price}</span>
                        </div>
                     )}
                </div>

                <div className="space-y-3">
                    {isPaidService && onlinePayment && payAfterService ? (
                        <div className="grid sm:grid-cols-2 gap-4">
                            <Button onClick={() => handleFormSubmit('online')} size="lg" className="w-full" disabled={isPending}>
                                {isPending && processingMethod === 'online' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CreditCard className="mr-2 h-4 w-4"/>}
                                Pay Online Now
                            </Button>
                            <Button onClick={() => handleFormSubmit('later')} size="lg" variant="outline" className="w-full" disabled={isPending}>
                                {isPending && processingMethod === 'later' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Banknote className="mr-2 h-4 w-4"/>}
                                Pay After Service
                            </Button>
                        </div>
                    ) : isPaidService && onlinePayment ? (
                         <Button onClick={() => handleFormSubmit('online')} className="w-full" size="lg" disabled={isPending}>
                            {isPending && processingMethod === 'online' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4"/>}
                            Proceed to Payment
                        </Button>
                    ) : isPaidService && payAfterService ? (
                         <Button onClick={() => handleFormSubmit('later')} className="w-full" size="lg" disabled={isPending}>
                            {isPending && processingMethod === 'later' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Banknote className="mr-2 h-4 w-4"/>}
                            Confirm & Pay Later
                        </Button>
                    ) : (
                        <Button onClick={() => handleFormSubmit()} className="w-full" size="lg" disabled={isPending}>
                           {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                           Confirm Booking
                        </Button>
                    )}
                </div>
                 
                {error && <p className="text-sm text-destructive text-center">{error}</p>}
            </div>
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
        {step === 2 && <Step2_Details onContinue={nextStep} serviceType={serviceType} provider={provider} onTimezoneDetect={setUserTimeZone} />}
        {step === 3 && <Step3_DateTime />}
        {step === 4 && <Step4_Confirm dateFormat={provider.settings.dateFormat || 'PPP'} />}
      </FormProvider>
    </Card>
  );
}

function isSameDay(date1: Date, date2: Date) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}


