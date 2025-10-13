
'use client';

import * as React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { countries, type Country } from '@/lib/countries';
import { ChevronDown } from 'lucide-react';

type CountrySelectorProps = {
  selectedCountry: Country;
  onSelect: (country: Country) => void;
  onTimezoneDetect: (timezone: string) => void;
};

const SESSION_DETECTED_KEY = 'country_code_detected';

export function CountryCodeSelector({
  selectedCountry,
  onSelect,
  onTimezoneDetect,
}: CountrySelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    async function detectCountry() {
        if (sessionStorage.getItem(SESSION_DETECTED_KEY)) {
            return;
        }

        try {
            const response = await fetch('https://ipapi.co/json/');
            if (!response.ok) {
                console.warn(`IP lookup failed with status: ${response.status}`);
                return;
            }
            const data = await response.json();
            if (data.country_code) {
                const country = countries.find(c => c.code === data.country_code);
                if (country) {
                    onSelect(country);
                }
            }
            if (data.timezone) {
                onTimezoneDetect(data.timezone);
            }
        } catch (error) {
            console.error('Error fetching country from IP:', error);
        } finally {
            sessionStorage.setItem(SESSION_DETECTED_KEY, 'true');
        }
    }

    detectCountry();
  }, [onSelect, onTimezoneDetect]);

  const filteredCountries = countries.filter(
    (country) =>
      country.name.toLowerCase().includes(search.toLowerCase()) ||
      country.dial_code.includes(search)
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
           <Image
              src={selectedCountry.flag}
              alt={selectedCountry.name}
              width={20}
              height={15}
              className="object-contain"
            />
          <span className="font-medium">{selectedCountry.dial_code}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DialogTrigger>
      <DialogContent className="p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Select a Country</DialogTitle>
        </DialogHeader>
        <Command>
          <CommandInput
            placeholder="Search country or code..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <ScrollArea className="h-64">
              <CommandGroup>
                {filteredCountries.map((country) => (
                  <CommandItem
                    key={country.code}
                    onSelect={() => {
                      onSelect(country);
                      sessionStorage.setItem(SESSION_DETECTED_KEY, 'true');
                      setOpen(false);
                      setSearch('');
                    }}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                       <Image
                          src={country.flag}
                          alt={country.name}
                          width={24}
                          height={18}
                          className="object-contain"
                        />
                      <span>{country.name}</span>
                    </div>
                    <span className="text-muted-foreground">{country.dial_code}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </ScrollArea>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
