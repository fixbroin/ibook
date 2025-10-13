
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BellRing } from 'lucide-react';
import { useRouter } from 'next/navigation';

type NewBookingNotificationProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function NewBookingNotification({ open, onOpenChange }: NewBookingNotificationProps) {
  const router = useRouter();

  const handleViewClick = () => {
    onOpenChange(false);
    router.push('/bookings');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <BellRing className="h-6 w-6 text-primary" />
            </div>
          <DialogTitle className="text-center">New Booking Received</DialogTitle>
          <DialogDescription className="text-center">
            You have received a new booking. Check your bookings page for details.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center pt-4">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" onClick={handleViewClick}>
            View
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
