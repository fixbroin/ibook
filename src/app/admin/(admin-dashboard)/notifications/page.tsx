
'use client';

import { useState, useEffect, useTransition } from 'react';
import { listenForNotifications, markAllNotificationsRead, clearAllNotifications } from '@/lib/data';
import type { Notification } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Bell, Check, Trash2, UserPlus, Book } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
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
import { cn } from '@/lib/utils';

const NotificationIcon = ({ type }: { type: Notification['type'] }) => {
    switch (type) {
        case 'new_booking':
            return <Book className="h-5 w-5 text-blue-500" />;
        case 'new_provider':
             return <UserPlus className="h-5 w-5 text-green-500" />;
        default:
            return <Bell className="h-5 w-5 text-gray-500" />;
    }
};

export default function AdminNotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const [isClearAlertOpen, setIsClearAlertOpen] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        setLoading(true);
        const unsubscribe = listenForNotifications('admin', (data) => {
            setNotifications(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleMarkAllRead = () => {
        startTransition(async () => {
            try {
                await markAllNotificationsRead('admin');
                toast({ title: 'Success', description: 'All notifications marked as read.' });
            } catch (error) {
                toast({ title: 'Error', description: 'Failed to mark notifications as read.', variant: 'destructive' });
            }
        });
    };

    const handleClearAll = () => {
        startTransition(async () => {
            try {
                await clearAllNotifications('admin');
                toast({ title: 'Success', description: 'All notifications have been cleared.' });
            } catch (error) {
                toast({ title: 'Error', description: 'Failed to clear notifications.', variant: 'destructive' });
            } finally {
                setIsClearAlertOpen(false);
            }
        });
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <CardTitle>Admin Notifications</CardTitle>
                        <CardDescription>Recent platform-wide activity.</CardDescription>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Button variant="outline" onClick={handleMarkAllRead} disabled={isPending || notifications.every(n => n.read)}>
                            <Check className="mr-2 h-4 w-4" />
                            Mark all as read
                        </Button>
                        <Button variant="destructive" onClick={() => setIsClearAlertOpen(true)} disabled={isPending || notifications.length === 0}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Clear all
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex h-64 items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : notifications.length > 0 ? (
                        <ScrollArea className="h-[60vh]">
                            <div className="space-y-4 pr-4">
                                {notifications.map(notification => (
                                    <div
                                        key={notification.id}
                                        className={cn(
                                            "flex items-start gap-4 rounded-lg border p-4 transition-colors",
                                            !notification.read && "bg-muted/50"
                                        )}
                                    >
                                        <div className="mt-1">
                                            <NotificationIcon type={notification.type} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium">{notification.message}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                                            </p>
                                            {notification.link && (
                                                <Button asChild variant="link" className="p-0 h-auto text-xs mt-1">
                                                    <Link href={notification.link}>View Details</Link>
                                                </Button>
                                            )}
                                        </div>
                                        {!notification.read && (
                                             <div className="h-2 w-2 rounded-full bg-primary mt-2"></div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    ) : (
                        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center h-[60vh]">
                            <Bell className="h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-4 text-lg font-semibold">All clear!</h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                                You'll see notifications about new providers and other activities here.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <AlertDialog open={isClearAlertOpen} onOpenChange={setIsClearAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete all admin notifications. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearAll} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
                             {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Yes, clear all
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
