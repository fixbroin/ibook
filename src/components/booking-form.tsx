
'use client';

import { useState, useMemo, useEffect, useTransition, useCallback } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
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

import { createBooking } from '@/lib/actions';
import { getBookingsForDay } from '@/lib/data';
import { getAddressFromPincode } from '@/lib/pincode.actions';
import type { Provider, ServiceType, Booking, BookingFormValues } from '@/lib/types';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Laptop, Building, MapPin, ArrowLeft, Calendar as CalendarIcon, Clock, User, Mail, Phone, Loader2, Globe } from 'lucide-react';
import { add, format, parse, startOfDay, isEqual, addDays, isToday, startOfToday } from 'date-fns';
import { Progress } from '@/components/ui/progress';

type BookingFormProps = {
  provider: Provider;
};

type FormData = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  flatHouseNo?: string;
  landmark?: string;
  pincode?: string;
  city?: string;
  state?: string;
  country?: string;
};

const serviceIcons = {
  'Online': <Laptop className="h-8 w-8 mb-2" />,
  'Shop Visit': <Building className="h-8 w-8 mb-2" />,
  'Doorstep': <MapPin className="h-8 w-8 mb-2" />,
};

// A simple debounce function
function debounce<T extends (...args: any[]) => void>(func: T, delay: number) {
  let timeout: NodeJS.Timeout;
  return function(this: any, ...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}


const Step2_Details = ({
  initialData,
  onDataChange,
  onContinue,
  serviceType,
  shopAddress
}: {
  initialData: FormData;
  onDataChange: (data: FormData) => void;
  onContinue: () => void;
  serviceType: ServiceType | null;
  shopAddress: string | null;
}) => {
  const [isTransitioning, startTransition] = useTransition();

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(BookingSchema),
    defaultValues: {
      ...initialData,
      serviceType: serviceType || undefined,
      dateTime: new Date().toISOString(), // Dummy value for validation
      providerUsername: '', // Dummy value for validation
    },
    mode: 'onChange',
  });

  const { watch, setValue, trigger } = form;

  useEffect(() => {
    const subscription = watch((value) => {
        onDataChange(value as FormData);
    });
    return () => subscription.unsubscribe();
  }, [watch, onDataChange]);

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
    const isValid = await trigger();
    if (isValid) {
      onContinue();
    }
  }

  return (
    <FormProvider {...form}>
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

            {serviceType === 'Doorstep' && (
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
            {serviceType === 'Shop Visit' && shopAddress && (
              <div className="p-4 rounded-lg bg-muted flex items-start gap-4">
                <MapPin className="h-5 w-5 mt-1 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="font-semibold">Meeting at our location:</p>
                  <p className="text-muted-foreground">{shopAddress}</p>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={handleContinueClick} className="w-full" type="button">Continue</Button>
          </CardFooter>
        </form>
      </Form>
    </FormProvider>
  );
};


export function BookingForm({ provider }: BookingFormProps) {
  const [step, setStep] = useState(1);
  const [serviceType, setServiceType] = useState<ServiceType | null>(null);
  const [formData, setFormData] = useState<FormData>({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    flatHouseNo: '',
    landmark: '',
    pincode: '',
    city: '',
    state: '',
    country: '',
  });
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [dailyBookings, setDailyBookings] = useState<Booking[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const localStorageKey = `bookingState_${provider.username}`;

  const getTimeSlotsForDate = useCallback((date: Date | undefined, provider: Provider): string[] => {
    if (!date || !provider.settings.workingHours) return [];

    const dayOfWeek = format(date, 'EEEE').toLowerCase();
    const workingHours = provider.settings.workingHours[dayOfWeek as keyof typeof provider.settings.workingHours];

    // Check if the date is blocked
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
      for (let i = 0; i < 365; i++) { // Limit search to 1 year
          const slots = getTimeSlotsForDate(currentDate, provider);
          if (slots.length > 0) {
              return currentDate;
          }
          currentDate = addDays(currentDate, 1);
      }
      return startOfToday(); // Fallback to today if no date is found
  }, [getTimeSlotsForDate]);

  // Effect to load state from local storage on component mount
  useEffect(() => {
    try {
      const savedState = localStorage.getItem(localStorageKey);
      if (savedState) {
        const { step, serviceType, formData, selectedDate, selectedTime } = JSON.parse(savedState);
        setStep(step || 1);
        setServiceType(serviceType || null);
        setFormData(formData || {});
        setSelectedDate(selectedDate ? new Date(selectedDate) : findNextAvailableDate(startOfToday(), provider));
        setSelectedTime(selectedTime || null);
      } else {
        // Find the next available date if no saved state
        setSelectedDate(findNextAvailableDate(startOfToday(), provider));
      }
    } catch (e) {
      console.error("Failed to parse booking state from local storage", e);
      localStorage.removeItem(localStorageKey);
      setSelectedDate(findNextAvailableDate(startOfToday(), provider));
    }
  }, [localStorageKey, provider, findNextAvailableDate]);

  // Effect to save state to local storage whenever it changes
  useEffect(() => {
    try {
      const stateToSave = { step, serviceType, formData, selectedDate, selectedTime };
      localStorage.setItem(localStorageKey, JSON.stringify(stateToSave));
    } catch (e) {
      console.error("Failed to save booking state to local storage", e);
    }
  }, [step, serviceType, formData, selectedDate, selectedTime, localStorageKey]);


  useEffect(() => {
    if (selectedDate && provider) {
      getBookingsForDay(provider.username, selectedDate).then(setDailyBookings);
    }
  }, [selectedDate, provider]);


  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedTime(null); // Reset time when date changes
    if (date) {
      getBookingsForDay(provider.username, date).then(setDailyBookings);
    } else {
      setDailyBookings([]);
    }
  };


  const timeSlots = useMemo(() => {
    if (!selectedDate || !provider) return [];
    return getAvailableSlots(selectedDate, dailyBookings, provider);
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
      // Slot is full
      return;
    }
    setSelectedTime(time);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const finalDateTime = selectedDate && selectedTime ? parse(selectedTime, 'p', selectedDate) : null;
    
    if (!finalDateTime) {
      setError('Please select a valid date and time.');
      return;
    }

    const payload = new FormData(event.currentTarget);
    payload.set('serviceType', serviceType!);
    payload.set('dateTime', finalDateTime.toISOString());
    payload.set('providerUsername', provider.username);

    startTransition(async () => {
      const result = await createBooking(payload);
      if (result?.errors) {
        const errorMessages = Object.values(result.errors).flat();
        setError(errorMessages.join(', '));
      } else {
        // Booking successful, clear the saved state
        localStorage.removeItem(localStorageKey);
      }
    });
  }
  
  const Step1_ServiceType = () => (
    <CardContent>
      <p className="mb-6 text-muted-foreground text-center md:text-left">How would you like to meet?</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {provider.settings.serviceTypes.map(type => (
          <button
            key={type}
            type="button"
            onClick={() => {
              setServiceType(type);
              nextStep();
            }}
            className="flex flex-col items-center justify-center p-6 border rounded-lg hover:bg-accent hover:border-primary transition-colors text-center"
          >
            {serviceIcons[type]}
            <span className="font-semibold mt-2">{type}</span>
          </button>
        ))}
      </div>
    </CardContent>
  );

  const Step3_DateTime = () => {
    const blockedDates = provider.settings.blockedDates?.map(d => new Date(d)) || [];

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
    
    const addressString = serviceType === 'Doorstep' 
        ? `${formData.flatHouseNo}, ${formData.landmark ? formData.landmark + ', ' : ''}${formData.city}, ${formData.state} - ${formData.pincode}, ${formData.country}`
        : serviceType === 'Shop Visit' ? provider.settings.shopAddress : 'Online';

    return (
      <>
        <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
                <input type="hidden" name="customerName" value={formData.customerName} />
                <input type="hidden" name="customerEmail" value={formData.customerEmail} />
                <input type="hidden" name="customerPhone" value={formData.customerPhone} />
                {serviceType === 'Doorstep' && (
                    <>
                        <input type="hidden" name="flatHouseNo" value={formData.flatHouseNo || ''} />
                        <input type="hidden" name="landmark" value={formData.landmark || ''} />
                        <input type="hidden" name="pincode" value={formData.pincode || ''} />
                        <input type="hidden" name="city" value={formData.city || ''} />
                        <input type="hidden" name="state" value={formData.state || ''} />
                        <input type="hidden" name="country" value={formData.country || ''} />
                    </>
                )}

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
                        <div className="w-5 text-muted-foreground">{serviceIcons[serviceType!]}</div>
                        <span className="font-medium">{serviceType}</span>
                    </div>
                     
                    {addressString && serviceType !== 'Online' && (
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
                </div>

                 <Button type="submit" className="w-full" size="lg" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirm Booking
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
      {step === 1 && <Step1_ServiceType />}
      {step === 2 && <Step2_Details initialData={formData} onDataChange={setFormData} onContinue={nextStep} serviceType={serviceType} shopAddress={provider.settings.shopAddress} />}
      {step === 3 && <Step3_DateTime />}
      {step === 4 && <Step4_Confirm dateFormat={provider.settings.dateFormat || 'PPP'} />}
    </Card>
  );
}
