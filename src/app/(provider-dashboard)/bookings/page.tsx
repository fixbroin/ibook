

'use client';

import { getBookingsByProvider, getProviderByUsername, updateBookingStatus, deleteBooking, getBookingsForDay, getNotificationsForProvider, markAllNotificationsRead, clearAllNotifications } from "@/lib/data";
import { cancelBooking, rescheduleBooking } from "@/lib/actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { Booking, BookingStatus, Provider } from "@/lib/types";
import { formatInTimeZone, toDate } from 'date-fns-tz';
import { add, format, parse, startOfDay, isEqual, addDays, startOfToday, isToday } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Eye, Check, X, Trash2, Loader2, Calendar, Clock, User, Mail, Phone, MapPin, Globe, CalendarPlus, BadgeCent, Video, Banknote } from "lucide-react";
import { useEffect, useState, useTransition, useMemo, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Calendar as RescheduleCalendar } from '@/components/ui/calendar';
import Link from 'next/link';
import { Separator } from "@/components/ui/separator";
import { getCurrency } from "@/lib/currencies";

type EnrichedBooking = Booking & { status: BookingStatus };

export default function BookingsPage() {
  const [bookings, setBookings] = useState<EnrichedBooking[]>([]);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogState, setDialogState] = useState<{ open: boolean; action: 'cancel' | 'delete' | null; booking: EnrichedBooking | null }>({ open: false, action: null, booking: null });
  const [viewDialogState, setViewDialogState] = useState<{ open: boolean; booking: EnrichedBooking | null }>({ open: false, booking: null });
  const [rescheduleDialogState, setRescheduleDialogState] = useState<{ open: boolean; booking: EnrichedBooking | null }>({ open: false, booking: null });
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  const currency = getCurrency(provider?.settings.currency);


  const fetchData = async (username: string) => {
      setLoading(true);
      try {
        const providerData = await getProviderByUsername(username);
        if (!providerData) {
          toast({ title: 'Error', description: 'Could not find provider data.', variant: 'destructive' });
          router.push('/login');
          return;
        }
        const bookingsData = await getBookingsByProvider(username);
        
        setProvider(providerData);

        const enrichedBookings = bookingsData.map(b => {
            let status: BookingStatus = b.status || 'Upcoming';
            if (status === 'Upcoming' && new Date(b.dateTime) < new Date()) {
                status = 'Not Completed';
            }
            return { ...b, status };
        }).filter(b => b.status !== 'Pending') as EnrichedBooking[]; // Filter out pending bookings

        setBookings(enrichedBookings);
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to fetch bookings.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.email) {
        const username = user.email.split('@')[0];
        fetchData(username);
      } else {
        router.push('/login');
      }
    });
     return () => unsubscribe();
  }, [router]);

  const handleUpdateStatus = (bookingId: string, status: BookingStatus) => {
    if (!provider) return;
    startTransition(async () => {
      try {
        await updateBookingStatus(provider.username, bookingId, status);
        setBookings(prevBookings => 
          prevBookings.map(b => b.id === bookingId ? { ...b, status } : b)
        );
        toast({ title: 'Success', description: `Booking marked as ${status}.` });
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to update booking status.', variant: 'destructive' });
      }
    });
  };
  
  const handleCancelBooking = (booking: EnrichedBooking) => {
    if (!provider) return;
    startTransition(async () => {
      const result = await cancelBooking(provider, booking);
      if (result.success) {
        setBookings(prevBookings =>
          prevBookings.map(b => (b.id === booking.id ? { ...b, status: 'Canceled' } : b))
        );
        toast({ title: 'Booking Canceled', description: 'The customer has been notified.' });
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    });
  };

  const handleDelete = (bookingId: string) => {
    if (!provider) return;
    startTransition(async () => {
      try {
        await deleteBooking(provider.username, bookingId);
        setBookings(prevBookings => prevBookings.filter(b => b.id !== bookingId));
        toast({ title: 'Success', description: 'Booking has been deleted.' });
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to delete booking.', variant: 'destructive' });
      } finally {
        setDialogState({ open: false, action: null, booking: null });
      }
    });
  };
  
  const handleRescheduleSuccess = (bookingId: string, newDateTime: Date) => {
    setBookings(prev => prev.map(b => b.id === bookingId ? {...b, dateTime: newDateTime, status: 'Upcoming'} : b));
  }

  const openDialog = (action: 'cancel' | 'delete', booking: EnrichedBooking) => {
    setDialogState({ open: true, action, booking });
  };
  
  const openViewDialog = (booking: EnrichedBooking) => {
    setViewDialogState({ open: true, booking });
  };
  
  const openRescheduleDialog = (booking: EnrichedBooking) => {
    setRescheduleDialogState({ open: true, booking: booking });
  };

  const onConfirmDialog = () => {
    if (!dialogState.action || !dialogState.booking) return;

    if (dialogState.action === 'cancel') {
        handleCancelBooking(dialogState.booking);
    } else if (dialogState.action === 'delete') {
        handleDelete(dialogState.booking.id);
    }
    setDialogState({ open: false, action: null, booking: null });
  };


  if (loading) {
      return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  const dateFormat = provider?.settings?.dateFormat || 'PPP';
  const timezone = provider?.settings?.timezone || 'UTC';

  const upcomingBookings = bookings.filter(b => b.status === 'Upcoming');
  const pastBookings = bookings.filter(b => b.status === 'Completed' || b.status === 'Canceled' || b.status === 'Not Completed');

  const getStatusVariant = (status: BookingStatus) => {
    switch (status) {
        case 'Upcoming':
            return 'default';
        case 'Completed':
            return 'secondary';
        case 'Canceled':
            return 'destructive';
        case 'Not Completed':
            return 'outline';
        default:
            return 'outline';
    }
  }
  
  const BookingTable = ({ bookings, isUpcoming }: { bookings: EnrichedBooking[], isUpcoming: boolean }) => (
    <>
      {/* Desktop View */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.length > 0 ? (
              bookings.map((booking) => {
                const service = provider?.settings.services?.find(s => s.id === booking.serviceId);
                const serviceTitle = service?.title || booking.serviceType;
                return (
                <TableRow key={booking.id} className={isPending && (dialogState.booking?.id === booking.id || viewDialogState.booking?.id === booking.id) ? 'opacity-50' : ''}>
                  <TableCell>
                    <div className="font-medium">{booking.customerName}</div>
                    <div className="text-sm text-muted-foreground">{booking.customerEmail}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{serviceTitle} {booking.quantity && booking.quantity > 1 ? `(x${booking.quantity})` : ''}</div>
                    <div className="text-sm text-muted-foreground">{booking.serviceType}</div>
                  </TableCell>
                  <TableCell>
                    <div>{formatInTimeZone(booking.dateTime, timezone, dateFormat)}</div>
                    <div className="text-sm text-muted-foreground">{formatInTimeZone(booking.dateTime, timezone, 'p')}</div>
                  </TableCell>
                  <TableCell>
                      <Badge variant={getStatusVariant(booking.status)}>{booking.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openViewDialog(booking)}>
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">View</span>
                        </Button>
                        {isUpcoming && (
                            <>
                                <Button variant="ghost" size="icon" onClick={() => openRescheduleDialog(booking)}>
                                    <CalendarPlus className="h-4 w-4" />
                                    <span className="sr-only">Reschedule</span>
                                </Button>
                                <Button variant="ghost" size="icon" className="text-green-500 hover:text-green-600" onClick={() => handleUpdateStatus(booking.id, 'Completed')}>
                                    <Check className="h-4 w-4" />
                                    <span className="sr-only">Accept</span>
                                </Button>
                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => openDialog('cancel', booking)}>
                                    <X className="h-4 w-4" />
                                    <span className="sr-only">Cancel</span>
                                </Button>
                            </>
                        )}
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => openDialog('delete', booking)}>
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                        </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )})
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center">No bookings found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
       {/* Mobile View */}
      <div className="md:hidden space-y-4">
        {bookings.length > 0 ? (
          bookings.map((booking) => {
            const service = provider?.settings.services?.find(s => s.id === booking.serviceId);
            const serviceTitle = service?.title || booking.serviceType;
            return (
            <Card key={booking.id} className={isPending && (dialogState.booking?.id === booking.id || viewDialogState.booking?.id === booking.id) ? 'opacity-50' : ''}>
              <CardContent className="p-4 space-y-4">
                <div className="flex justify-between items-start gap-4">
                    <div>
                        <p className="font-semibold">{booking.customerName}</p>
                        <p className="text-sm text-muted-foreground">{booking.customerEmail}</p>
                    </div>
                    <Badge variant={getStatusVariant(booking.status)} className="flex-shrink-0">{booking.status}</Badge>
                </div>
                 <Separator />
                <div className="space-y-2 text-sm">
                    <div className="flex flex-col">
                        <span className="text-muted-foreground text-xs">Service</span>
                        <span className="font-medium">{serviceTitle} {booking.quantity && booking.quantity > 1 ? `(x${booking.quantity})` : ''} ({booking.serviceType})</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-muted-foreground text-xs">Date</span>
                        <span className="font-medium">{formatInTimeZone(booking.dateTime, timezone, dateFormat)}</span>
                    </div>
                     <div className="flex flex-col">
                        <span className="text-muted-foreground text-xs">Time</span>
                        <span className="font-medium">{formatInTimeZone(booking.dateTime, timezone, 'p')}</span>
                    </div>
                </div>
              </CardContent>
              <CardFooter className="p-2 border-t flex justify-end gap-1">
                 <Button variant="ghost" size="sm" onClick={() => openViewDialog(booking)}>
                    <Eye className="h-4 w-4 mr-2" /> View
                </Button>
                 {isUpcoming && (
                    <>
                        <Button variant="ghost" size="icon" className="text-green-500 hover:text-green-600" onClick={() => handleUpdateStatus(booking.id, 'Completed')}>
                            <Check className="h-4 w-4" />
                            <span className="sr-only">Accept</span>
                        </Button>
                         <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => openDialog('cancel', booking)}>
                            <X className="h-4 w-4" />
                            <span className="sr-only">Cancel</span>
                        </Button>
                    </>
                )}
                 <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => openDialog('delete', booking)}>
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                </Button>
              </CardFooter>
            </Card>
          )})
        ) : (
          <p className="text-center text-muted-foreground py-8">No bookings found.</p>
        )}
      </div>
    </>
  );

  const ViewBookingDialog = () => {
    const booking = viewDialogState.booking;
    if (!booking || !provider) return null;

    const payment = booking.payment;
    const service = provider.settings.services?.find(s => s.id === booking.serviceId);
    const serviceTitle = service?.title || booking.serviceType;
    const isPaid = payment?.status === 'Paid' && payment.amount && payment.amount > 0;
    const isPayLater = payment?.status === 'Pending' && payment.amount && payment.amount > 0;
    const isFree = !payment || payment.amount === 0;

    return (
       <Dialog open={viewDialogState.open} onOpenChange={(open) => setViewDialogState({ open, booking: open ? booking : null })}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Booking Details</DialogTitle>
              <DialogDescription>
                Appointment for {serviceTitle} with {booking.customerName}.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] -mx-6">
              <div className="px-6">
                <div className="space-y-4 py-4">
                    <h3 className="font-semibold text-lg">Customer Information</h3>
                    <div className="space-y-3 rounded-lg border bg-muted/50 p-4">
                        <div className="flex items-center gap-3">
                            <User className="h-5 w-5 text-muted-foreground" />
                            <span className="font-medium">{booking.customerName}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Mail className="h-5 w-5 text-muted-foreground" />
                            <span className="font-medium">{booking.customerEmail}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Phone className="h-5 w-5 text-muted-foreground" />
                            <span className="font-medium">{booking.customerPhone}</span>
                        </div>
                    </div>

                    <h3 className="font-semibold text-lg pt-2">Appointment Information</h3>
                     <div className="space-y-3 rounded-lg border bg-muted/50 p-4">
                        <div className="flex items-start gap-3">
                            <div className="w-5 text-muted-foreground flex items-center justify-center pt-1"><BadgeCent className="h-5 w-5" /></div>
                            <div>
                                <p className="font-medium">{serviceTitle} {booking.quantity && booking.quantity > 1 ? `(x${booking.quantity})` : ''}</p>
                                <p className="text-muted-foreground text-sm">{booking.serviceType}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                             <div className="w-5 text-muted-foreground flex items-center justify-center"><Badge variant={getStatusVariant(booking.status)} className="p-0 h-4 w-4" /></div>
                             <span className="font-medium">{booking.status}</span>
                        </div>
                         <div className="flex items-center gap-3">
                            <Calendar className="h-5 w-5 text-muted-foreground" />
                             <span className="font-medium">{formatInTimeZone(booking.dateTime, timezone, dateFormat)}</span>
                        </div>
                         <div className="flex items-center gap-3">
                            <Clock className="h-5 w-5 text-muted-foreground" />
                             <span className="font-medium">{formatInTimeZone(booking.dateTime, timezone, 'p')}</span>
                        </div>
                         <div className="flex items-center gap-3">
                            <Globe className="h-5 w-5 text-muted-foreground" />
                            <span className="font-medium">{timezone.replace(/_/g, ' ')}</span>
                        </div>
                         {booking.address && !booking.googleMeetLink && (
                            <div className="flex items-start gap-3">
                                <MapPin className="h-5 w-5 text-muted-foreground mt-1" />
                                <div>
                                    <p className="font-medium">{booking.serviceType}</p>
                                    <p className="text-muted-foreground">{booking.address}</p>
                                </div>
                            </div>
                        )}
                         {!booking.address && !booking.googleMeetLink && (
                             <div className="flex items-start gap-3">
                                <MapPin className="h-5 w-5 text-muted-foreground mt-1" />
                                <div>
                                    <p className="font-medium">{booking.serviceType}</p>
                                </div>
                            </div>
                         )}
                         {booking.googleMeetLink && (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Video className="h-5 w-5 text-muted-foreground" />
                                    <p className="font-medium">Google Meet</p>
                                </div>
                                <Button asChild variant="outline">
                                    <Link href={booking.googleMeetLink} target="_blank" rel="noopener noreferrer">
                                        Join
                                    </Link>
                                </Button>
                             </div>
                         )}
                    </div>
                     
                    <div className="space-y-3 rounded-lg border bg-muted/50 p-4 mt-4">
                        <h3 className="font-semibold text-base mb-2">Payment Details</h3>
                        {isPaid && (
                            <>
                                <div className="flex items-center gap-3">
                                    <BadgeCent className="h-5 w-5 text-green-500" />
                                    <span className="font-medium">Paid {currency?.symbol}{payment.amount?.toLocaleString()} Online</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="h-5 w-5 text-muted-foreground text-xs font-mono ml-0.5">ID</div>
                                    <span className="font-mono text-xs">{payment.paymentId}</span>
                                </div>
                            </>
                        )}
                        {isPayLater && (
                            <div className="flex items-center gap-3">
                                <Banknote className="h-5 w-5 text-orange-500" />
                                <span className="font-medium">To be paid {currency?.symbol}{payment.amount?.toLocaleString()} after service</span>
                            </div>
                        )}
                        {isFree && (
                             <div className="flex items-center gap-3">
                                <BadgeCent className="h-5 w-5 text-muted-foreground" />
                                <span className="font-medium">This is a free booking.</span>
                            </div>
                        )}
                    </div>
                </div>
              </div>
             </ScrollArea>
            <DialogFooter className="pt-4">
              <Button variant="outline" onClick={() => setViewDialogState({ open: false, booking: null })}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    );
  };
  
  const RescheduleBookingDialog = () => {
    const booking = rescheduleDialogState.booking;
    const [selectedDate, setSelectedDate] = useState<Date>(booking ? toDate(booking.dateTime) : startOfToday());
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [dailyBookings, setDailyBookings] = useState<Booking[]>([]);
    const [isRescheduling, startRescheduleTransition] = useTransition();

    useEffect(() => {
        if (provider && selectedDate) {
            getBookingsForDay(provider.username, selectedDate).then(setDailyBookings);
        }
    }, [provider, selectedDate]);
    
     const getPotentialTimeSlots = useCallback((date: Date, provider: Provider): string[] => {
        if (!date || !provider.settings.workingHours) return [];
        const dayOfWeek = format(date, 'EEEE').toLowerCase();
        const workingHours = provider.settings.workingHours[dayOfWeek as keyof typeof provider.settings.workingHours];
        if (!workingHours) return [];
        const blockedDates = provider.settings.blockedDates || [];
        if (blockedDates.includes(format(date, 'yyyy-MM-dd'))) return [];

        const slots = [];
        let currentTime = parse(workingHours.start, 'HH:mm', startOfDay(date));
        const endTime = parse(workingHours.end, 'HH:mm', startOfDay(date));
        const totalSlotTime = provider.settings.slotDuration + (provider.settings.breakTime || 0);

        const now = new Date();
        const bookingDelayLimit = add(now, { hours: provider.settings.bookingDelay || 0 });
        const isSelectedDateToday = isToday(date);
        
        while (currentTime < endTime) {
            let isAvailable = true;
            if (isSelectedDateToday && currentTime <= bookingDelayLimit) {
                isAvailable = false;
            }

            if (isAvailable) {
              slots.push(format(currentTime, 'p'));
            }
            currentTime = add(currentTime, { minutes: totalSlotTime });
        }
        return slots;
    }, []);

    const timeSlots = useMemo(() => {
        if (!provider || !selectedDate) return [];
        
        const potentialSlots = getPotentialTimeSlots(selectedDate, provider);
        const blockedSlotsISO = new Set(provider.settings.blockedSlots || []);

        return potentialSlots.map(time => {
            const slotDateTime = parse(time, 'p', selectedDate);
            const slotISO = slotDateTime.toISOString();

            const bookingsInSlot = dailyBookings.filter(b => isEqual(b.dateTime, slotDateTime) && b.id !== booking?.id).length;
            
            const isFull = provider.settings.multipleBookingsPerSlot && bookingsInSlot >= provider.settings.bookingsPerSlot;
            const isSingleBooked = !provider.settings.multipleBookingsPerSlot && bookingsInSlot > 0;
            const isBooked = isFull || isSingleBooked;

            const isBlocked = blockedSlotsISO.has(slotISO);
            
            const availability = provider.settings.multipleBookingsPerSlot
                ? provider.settings.bookingsPerSlot - bookingsInSlot
                : isBooked ? 0 : 1;

            return {
                time,
                isBooked,
                isBlocked,
                availability: Math.max(0, availability)
            };
        }).filter(slot => !slot.isBlocked && !slot.isBooked);
        
    }, [provider, selectedDate, dailyBookings, booking, getPotentialTimeSlots]);

    const handleConfirmReschedule = () => {
        if (!provider || !booking || !selectedTime) return;
        const newDateTime = parse(selectedTime, 'p', selectedDate);

        startRescheduleTransition(async () => {
            const result = await rescheduleBooking(provider.username, booking.id, newDateTime);
            if (result.success) {
                toast({ title: "Booking Rescheduled", description: "The booking has been successfully updated." });
                handleRescheduleSuccess(booking.id, newDateTime);
                setRescheduleDialogState({ open: false, booking: null });
            } else {
                toast({ title: "Error", description: result.error, variant: 'destructive' });
            }
        });
    };

    if (!booking || !provider) return null;

    return (
        <Dialog open={rescheduleDialogState.open} onOpenChange={(open) => setRescheduleDialogState({ open, booking: open ? booking : null })}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Reschedule Booking</DialogTitle>
                    <DialogDescription>
                        Select a new date and time for {booking.customerName}.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid md:grid-cols-2 gap-6 py-4">
                    <div>
                        <h3 className="font-semibold mb-4 text-center">Select New Date</h3>
                        <RescheduleCalendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => {
                                if (date) {
                                    setSelectedDate(date);
                                    setSelectedTime(null);
                                }
                            }}
                           disabled={(date) => {
                                if (date < startOfToday()) return true;
                                const availableSlots = getPotentialTimeSlots(date, provider);
                                return availableSlots.length === 0;
                           }}
                            className="rounded-md border mx-auto"
                        />
                    </div>
                    <div>
                        <h3 className="font-semibold mb-4 text-center">Select New Time</h3>
                        <ScrollArea className="h-72 border rounded-md">
                            <div className="p-4 grid grid-cols-2 gap-2">
                                {timeSlots.length > 0 ? timeSlots.map(slot => (
                                    <Button
                                        key={slot.time}
                                        variant={selectedTime === slot.time ? "default" : "outline"}
                                        onClick={() => setSelectedTime(slot.time)}
                                        disabled={slot.isBooked || slot.isBlocked}
                                        className="relative justify-between"
                                    >
                                        <span>{slot.time}</span>
                                          {provider.settings.multipleBookingsPerSlot && slot.availability > 0 && (
                                            <span className="text-xs bg-primary/20 text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center">
                                              {slot.availability}
                                            </span>
                                          )}
                                    </Button>
                                )) : (
                                    <p className="text-sm text-muted-foreground text-center col-span-2">No available slots for this day.</p>
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setRescheduleDialogState({ open: false, booking: null })}>Cancel</Button>
                    <Button onClick={handleConfirmReschedule} disabled={!selectedTime || isRescheduling}>
                        {isRescheduling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Reschedule
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
  };


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Bookings</CardTitle>
          <CardDescription>
            These are your appointments that are scheduled for the future.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BookingTable bookings={upcomingBookings} isUpcoming={true} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Past Bookings</CardTitle>
          <CardDescription>
            A record of your completed and canceled appointments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BookingTable bookings={pastBookings} isUpcoming={false} />
        </CardContent>
      </Card>
      
      <ViewBookingDialog />
      <RescheduleBookingDialog />

       <AlertDialog open={dialogState.open} onOpenChange={(open) => setDialogState({ ...dialogState, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently {dialogState.action === 'delete' ? 'delete this booking from our servers.' : 'cancel this booking.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmDialog} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

    
