

'use client';

import { useState, useEffect, useMemo, useTransition, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getProviderByUsername, getBookingsForDay } from '@/lib/data';
import { updateBlockedSlots, updateBlockedDates } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { notFound, useRouter } from 'next/navigation';
import type { Provider, Booking } from '@/lib/types';
import { add, format, parse, startOfDay, isEqual, toDate, startOfToday, addDays } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Lock, Unlock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function SlotManagementPage() {
  const [user, setUser] = useState<User | null>(null);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
  const [multiSelectedDates, setMultiSelectedDates] = useState<Date[]>([]);
  const [dailyBookings, setDailyBookings] = useState<Booking[]>([]);
  const [isPending, startTransition] = useTransition();

  const { toast } = useToast();
  const router = useRouter();
  
  const getTimeSlotsForDate = useCallback((date: Date | undefined, provider: Provider): string[] => {
    if (!date || !provider.settings.workingHours) return [];

    const dayOfWeek = format(date, 'EEEE').toLowerCase();
    const workingHours = provider.settings.workingHours[dayOfWeek as keyof typeof provider.settings.workingHours];

    // The logic here is for checking if a day has *potential* slots.
    // Manual blocking is handled separately by the UI.
    if (!workingHours) return [];

    const slots = [];
    let currentTime = parse(workingHours.start, 'HH:mm', startOfDay(date));
    const endTime = parse(workingHours.end, 'HH:mm', startOfDay(date));
    const totalSlotTime = provider.settings.slotDuration + (provider.settings.breakTime || 0);

    const now = new Date();
    const bookingDelayLimit = add(now, { hours: provider.settings.bookingDelay || 0 });

    while (currentTime < endTime) {
      if (isEqual(startOfDay(date), startOfDay(now))) {
        if (currentTime > bookingDelayLimit) {
          slots.push(format(currentTime, 'p'));
        }
      } else if (startOfDay(date) > startOfDay(now)) {
        slots.push(format(currentTime, 'p'));
      }
      currentTime = add(currentTime, { minutes: totalSlotTime });
    }
    return slots;
  }, []);

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
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser && currentUser.email) {
        setUser(currentUser);
        const username = currentUser.email.split('@')[0];
        try {
          const providerData = await getProviderByUsername(username);
          if (providerData) {
            setProvider(providerData);
            // Set the initial selected date to the next available day
            setSelectedDate(findNextAvailableDate(startOfToday(), providerData));
          } else {
            notFound();
          }
        } catch (error) {
          toast({ title: "Error", description: "Failed to load your data.", variant: "destructive" });
        } finally {
          setLoading(false);
        }
      } else {
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router, toast, findNextAvailableDate]);
  
  useEffect(() => {
      if (provider) {
          getBookingsForDay(provider.username, selectedDate).then(setDailyBookings);
      }
  }, [provider, selectedDate]);
  
  const timeSlots = useMemo(() => {
    if (!provider || !selectedDate) return [];

    const dayOfWeek = format(selectedDate, 'EEEE').toLowerCase();
    const workingHours = provider.settings.workingHours[dayOfWeek as keyof typeof provider.settings.workingHours];
    const isDayBlocked = (provider.settings.blockedDates || []).includes(format(selectedDate, 'yyyy-MM-dd'));

    if (!workingHours || isDayBlocked) return [];

    const slots = [];
    let currentTime = parse(workingHours.start, 'HH:mm', startOfDay(selectedDate));
    const endTime = parse(workingHours.end, 'HH:mm', startOfDay(selectedDate));
    const totalSlotTime = provider.settings.slotDuration + (provider.settings.breakTime || 0);

    const now = new Date();
    const bookingDelayLimit = add(now, { hours: provider.settings.bookingDelay || 0 });

    while (currentTime < endTime) {
      if (isEqual(startOfDay(selectedDate), startOfDay(now))) {
        if (currentTime > bookingDelayLimit) {
            slots.push(format(currentTime, 'p'));
        }
      } else if (startOfDay(selectedDate) > startOfDay(now)) {
        slots.push(format(currentTime, 'p'));
      }
      currentTime = add(currentTime, { minutes: totalSlotTime });
    }
    return slots;
  }, [selectedDate, provider]);
  
  const handleToggleSlot = (slot: string) => {
    if (!provider || !selectedDate) return;
    const slotDateTime = parse(slot, 'p', selectedDate);
    const slotISO = slotDateTime.toISOString();
    
    const isBlocked = provider.settings.blockedSlots?.includes(slotISO);

    startTransition(async () => {
        const result = await updateBlockedSlots(provider.username, slotISO, !isBlocked);
        if (result.success) {
            const newBlockedSlots = isBlocked 
                ? provider.settings.blockedSlots?.filter(s => s !== slotISO) 
                : [...(provider.settings.blockedSlots || []), slotISO];
            setProvider(p => p ? { ...p, settings: { ...p.settings, blockedSlots: newBlockedSlots } } : null);
            toast({ title: "Success", description: `Slot has been ${isBlocked ? 'unblocked' : 'blocked'}.` });
        } else {
            toast({ title: "Error", description: result.error, variant: 'destructive' });
        }
    });
  }

  const handleDateBlockToggle = (shouldBlock: boolean) => {
      if (!provider || multiSelectedDates.length === 0) return;
      const dateStrings = multiSelectedDates.map(d => format(d, 'yyyy-MM-dd'));
      startTransition(async () => {
        const result = await updateBlockedDates(provider.username, dateStrings, shouldBlock);
        if (result.success) {
            const currentBlocked = new Set(provider.settings.blockedDates || []);
            if (shouldBlock) {
                dateStrings.forEach(d => currentBlocked.add(d));
            } else {
                dateStrings.forEach(d => currentBlocked.delete(d));
            }
             setProvider(p => p ? { ...p, settings: { ...p.settings, blockedDates: Array.from(currentBlocked) } } : null);
             setMultiSelectedDates([]);
             toast({ title: "Success", description: `Dates have been ${shouldBlock ? 'blocked' : 'unblocked'}.` });
        } else {
            toast({ title: "Error", description: result.error, variant: 'destructive' });
        }
    });
  }

  const onDayClickHandler = (day: Date) => {
    setSelectedDate(day);
    const dateIndex = multiSelectedDates.findIndex(d => isEqual(startOfDay(d), startOfDay(day)));
    if (dateIndex > -1) {
        setMultiSelectedDates(dates => dates.filter((_, i) => i !== dateIndex));
    } else {
        setMultiSelectedDates(dates => [...dates, day]);
    }
  };

  if (loading || !provider) {
    return (
        <div className="grid gap-6 md:grid-cols-3">
             <div className="md:col-span-1 space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-[330px] w-full" />
                <div className="flex gap-2">
                    <Skeleton className="h-10 flex-1" />
                    <Skeleton className="h-10 flex-1" />
                </div>
            </div>
             <div className="md:col-span-2">
                 <Skeleton className="h-full w-full" />
            </div>
        </div>
    );
  }

  const blockedDateStrings = new Set(provider.settings.blockedDates || []);
  const blockedDates = Array.from(blockedDateStrings).map(d => toDate(new Date(d)));
  const dateFormat = provider.settings.dateFormat || 'PPP';
  const timezone = provider.settings.timezone || 'UTC';
  
  return (
    <div className="space-y-6">
        <div>
            <h1 className="text-3xl font-bold">Slot & Date Management</h1>
            <p className="text-muted-foreground">Block individual time slots or entire dates to manage your availability.</p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
            <div className="md:col-span-1 space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Manage Dates</CardTitle>
                        <CardDescription>Select one or more dates to block or unblock them entirely.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center">
                        <Calendar
                            mode="multiple"
                            selected={multiSelectedDates}
                            onSelect={(dates) => setMultiSelectedDates(dates || [])}
                            onDayClick={onDayClickHandler}
                            disabled={(date) => {
                                // A date is disabled if it's in the past or has no potential slots based on working hours.
                                if (date < startOfToday()) return true;
                                const availableSlots = getTimeSlotsForDate(date, provider);
                                return availableSlots.length === 0;
                            }}
                            modifiers={{ blocked: blockedDates }}
                            modifiersStyles={{ blocked: { backgroundColor: 'hsl(var(--destructive) / 0.2)', color: 'hsl(var(--destructive))', } }}
                            className="rounded-md border"
                        />
                        <div className="flex gap-2 mt-4 w-full">
                            <Button onClick={() => handleDateBlockToggle(true)} className="flex-1" disabled={isPending || multiSelectedDates.length === 0}>Block Dates</Button>
                            <Button onClick={() => handleDateBlockToggle(false)} className="flex-1" variant="outline" disabled={isPending || multiSelectedDates.length === 0}>Unblock Dates</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <div className="md:col-span-2">
                 <Card>
                    <CardHeader>
                        <CardTitle>Manage Slots for {formatInTimeZone(selectedDate, timezone, dateFormat)}</CardTitle>
                        <CardDescription>Click a slot to toggle its availability. Booked slots cannot be changed.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[400px]">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pr-4">
                            {timeSlots.length > 0 ? timeSlots.map(slot => {
                                const slotDateTime = parse(slot, 'p', selectedDate);
                                const isBooked = dailyBookings.some(b => isEqual(b.dateTime, slotDateTime));
                                const isBlocked = provider.settings.blockedSlots?.includes(slotDateTime.toISOString());
                                const isDayBlocked = blockedDateStrings.has(format(selectedDate, 'yyyy-MM-dd'));
                                const isPast = slotDateTime < new Date();
                                
                                const isDisabled = isBooked || isDayBlocked || isPast;

                                return (
                                    <Button 
                                        key={slot}
                                        variant={isBlocked ? "destructive" : "outline"}
                                        onClick={() => handleToggleSlot(slot)}
                                        disabled={isDisabled || isPending}
                                        className="flex items-center justify-between gap-2 h-12"
                                    >
                                        <div className="flex flex-col items-start">
                                            <span>{slot}</span>
                                            {isBooked && <Badge variant="secondary" className="text-xs">Booked</Badge>}
                                            {isDayBlocked && <Badge variant="destructive" className="text-xs">Day Blocked</Badge>}
                                            {isBlocked && !isDayBlocked && <Badge variant="outline" className="text-xs bg-destructive-foreground text-destructive">Blocked</Badge>}
                                        </div>
                                        {!isDisabled && (
                                            isBlocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />
                                        )}
                                    </Button>
                                )
                            }) : (
                                <p className="text-muted-foreground text-center col-span-full">No working hours set for this day, or the day is manually blocked.</p>
                            )}
                        </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
  );
}



    