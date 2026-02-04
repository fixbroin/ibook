

'use client';

import { getBookingsByProvider, getProviderByUsername } from "@/lib/data";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Badge } from "@/components/ui/badge";
import type { Booking, BookingStatus, Provider } from "@/lib/types";
import { formatInTimeZone } from "date-fns-tz";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { notFound, useRouter, useParams } from "next/navigation";
import Link from "next/link";

type EnrichedBooking = Booking & { status: BookingStatus };

export default function AdminProviderBookingsPage() {
  const params = useParams();
  const username = params.username as string;
  
  const [bookings, setBookings] = useState<EnrichedBooking[]>([]);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();


  useEffect(() => {
    if (!username) return;

    async function fetchData() {
        setLoading(true);
        try {
            const providerData = await getProviderByUsername(username);
            if (!providerData) {
            toast({ title: 'Error', description: 'Could not find provider data.', variant: 'destructive' });
            notFound();
            return;
            }
            const bookingsData = await getBookingsByProvider(username);
            
            setProvider(providerData);

            const enrichedBookings = bookingsData.map(b => {
                let status: BookingStatus = b.status || 'Upcoming';
                if (!b.status && b.dateTime < new Date()) {
                    status = 'Completed';
                }
                return { ...b, status };
            }) as EnrichedBooking[];

            setBookings(enrichedBookings);
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to fetch bookings.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }
    fetchData();
  }, [username, toast, router]);


  if (loading) {
      return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }
  
  if (!provider) {
    return null; // Should be handled by notFound
  }

  const dateFormat = provider?.settings?.dateFormat || 'PPP';
  const timezone = provider?.settings?.timezone || 'UTC';

  const upcomingBookings = bookings.filter(b => b.status === 'Upcoming');
  const pastBookings = bookings.filter(b => b.status === 'Completed' || b.status === 'Canceled');

  const getStatusVariant = (status: BookingStatus) => {
    switch (status) {
        case 'Upcoming':
            return 'default';
        case 'Completed':
            return 'secondary';
        case 'Canceled':
            return 'destructive';
        default:
            return 'outline';
    }
  }

  const BookingTable = ({ bookings }: { bookings: EnrichedBooking[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Customer</TableHead>
          <TableHead>Service</TableHead>
          <TableHead>Date & Time</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bookings.length > 0 ? (
          bookings.map((booking) => (
            <TableRow key={booking.id}>
              <TableCell>
                <div className="font-medium">{booking.customerName}</div>
                <div className="text-sm text-muted-foreground">{booking.customerEmail}</div>
              </TableCell>
              <TableCell>
                <Badge variant={booking.serviceType === 'Online' ? 'default' : 'outline'}>{booking.serviceType}</Badge>
                {booking.address && <div className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate">{booking.address}</div>}
              </TableCell>
              <TableCell>
                <div>{formatInTimeZone(booking.dateTime, timezone, dateFormat)}</div>
                <div className="text-sm text-muted-foreground">{formatInTimeZone(booking.dateTime, timezone, 'p')}</div>
              </TableCell>
              <TableCell>
                  <Badge variant={getStatusVariant(booking.status)}>{booking.status}</Badge>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={4} className="text-center">No bookings found.</TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
                <Link href="/admin/providers">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
            </Button>
            <div>
                <h1 className="text-2xl font-bold">Bookings for {provider.name}</h1>
                <p className="text-muted-foreground">A complete history of all appointments.</p>
            </div>
        </div>
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Bookings</CardTitle>
          <CardDescription>
            Appointments that are scheduled for the future.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BookingTable bookings={upcomingBookings} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Past Bookings</CardTitle>
          <CardDescription>
            A record of completed and canceled appointments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BookingTable bookings={pastBookings} />
        </CardContent>
      </Card>
    </div>
  );
}
