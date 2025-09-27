

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
import type { Booking, Provider } from "@/lib/types";
import { formatInTimeZone } from "date-fns-tz";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.email) {
        // This is a simplification. In a real app, you'd map UID to provider.
        const username = user.email.split('@')[0];
        try {
          const providerData = await getProviderByUsername(username);
          if (!providerData) {
            throw new Error("Provider not found");
          }
          const bookingsData = await getBookingsByProvider(username);
          setProvider(providerData);
          setBookings(bookingsData);
        } catch (error) {
          console.error("Failed to fetch dashboard data", error);
          router.push('/login');
        } finally {
          setLoading(false);
        }
      } else {
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (!provider) {
    return null; // Should be redirected
  }

  const dateFormat = provider.settings?.dateFormat || 'PPP';
  const timezone = provider.settings?.timezone || 'UTC';

  const upcomingBookings = bookings.filter(b => b.dateTime >= new Date());
  const pastBookings = bookings.filter(b => b.dateTime < new Date());

  const BookingTable = ({ bookings }: { bookings: Booking[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Customer</TableHead>
          <TableHead>Service Type</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Time</TableHead>
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
                <Badge variant={booking.serviceType === 'Online' ? 'default' : 'secondary'}>{booking.serviceType}</Badge>
              </TableCell>
              <TableCell>{formatInTimeZone(booking.dateTime, timezone, dateFormat)}</TableCell>
              <TableCell>{formatInTimeZone(booking.dateTime, timezone, 'p')}</TableCell>
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
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Bookings</CardTitle>
          <CardDescription>
            These are your appointments that are scheduled for the future.
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
            A record of your completed appointments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BookingTable bookings={pastBookings} />
        </CardContent>
      </Card>
    </div>
  );
}

    