

'use client';

import { useEffect, useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Loader2, BookCopy, CalendarClock, UserX, KeyRound, UserCheck } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getAllProviders } from '@/lib/data';
import { sendProviderPasswordResetEmail, extendProviderTrial, toggleProviderSuspension } from '@/lib/admin.actions';
import type { EnrichedProvider } from '@/lib/types';
import { format } from 'date-fns';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function AdminProvidersPage() {
  const [providers, setProviders] = useState<EnrichedProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const providersData = await getAllProviders();
      setProviders(providersData);
    } catch (error) {
      console.error("Failed to fetch providers:", error);
      toast({ title: 'Error', description: 'Could not fetch provider list.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleAction = (action: () => Promise<{ success: boolean; error?: string }>, successMessage: string) => {
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        toast({ title: 'Success', description: successMessage });
        fetchProviders(); // Re-fetch to show updated state
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    });
  };

  const getSubscriptionStatus = (provider: EnrichedProvider) => {
      if (provider.isSuspended) {
          return <Badge variant="destructive">Suspended</Badge>
      }
      if (!provider.planId || !provider.planExpiry) {
          return <Badge variant="destructive">No Plan</Badge>
      }
      if (provider.planExpiry > new Date()) {
          const variant = provider.plan?.duration === 'trial' ? 'secondary' : 'default';
          return <Badge variant={variant as any}>{provider.plan?.name || 'Active'}</Badge>
      }
      return <Badge variant="destructive">Expired</Badge>
  }


  return (
     <Card>
        <CardHeader>
            <CardTitle>Manage Providers</CardTitle>
            <CardDescription>View and manage all registered service providers.</CardDescription>
        </CardHeader>
        <CardContent>
           {loading ? (
             <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
           ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead>Plan Expiry</TableHead>
                  <TableHead>Total Bookings</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.length > 0 ? providers.map(provider => (
                  <TableRow key={provider.username} className={isPending ? 'opacity-50' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={provider.logoUrl} alt={provider.name} />
                          <AvatarFallback>{provider.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="font-medium">{provider.name}</div>
                            <div className="text-sm text-muted-foreground">{provider.contact.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getSubscriptionStatus(provider)}
                    </TableCell>
                     <TableCell>
                        {provider.planExpiry ? format(provider.planExpiry, 'PPP') : 'N/A'}
                    </TableCell>
                    <TableCell>
                        {provider.totalBookings ?? 0}
                    </TableCell>
                    <TableCell>
                      {provider.joinedDate ? format(provider.joinedDate, 'PPP') : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={isPending}>
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                             <DropdownMenuItem asChild>
                                <Link href={`/admin/providers/${provider.username}`}>
                                    <BookCopy className="mr-2 h-4 w-4" />
                                    <span>View Bookings</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAction(() => sendProviderPasswordResetEmail(provider.contact.email), 'Password reset email sent.')}>
                                <KeyRound className="mr-2 h-4 w-4" />
                                <span>Reset Password</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAction(() => extendProviderTrial(provider.username, 7), 'Provider trial has been extended by 7 days.')}>
                                <CalendarClock className="mr-2 h-4 w-4" />
                                <span>Extend Trial (7 days)</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className={provider.isSuspended ? "text-green-600" : "text-red-500"} onClick={() => handleAction(() => toggleProviderSuspension(provider.username, !!provider.isSuspended), `Provider has been ${provider.isSuspended ? 'reinstated' : 'suspended'}.`)}>
                                {provider.isSuspended ? <UserCheck className="mr-2 h-4 w-4" /> : <UserX className="mr-2 h-4 w-4" />}
                                <span>{provider.isSuspended ? 'Un-suspend' : 'Suspend'} Provider</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )) : (
                   <TableRow>
                    <TableCell colSpan={6} className="text-center">No providers found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
           )}
        </CardContent>
       </Card>
  );
}

    