
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import Image from "next/image";
import Link from "next/link";
import { getAdminSettings } from "@/lib/data";
import { ArrowLeft, Home } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export default async function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const adminSettings = await getAdminSettings();
  const branding = adminSettings?.site?.branding || { siteName: "BroBookMe", logoUrl: "" };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            {branding.logoUrl && <Image src={branding.logoUrl} alt={`${branding.siteName} logo`} width={32} height={32} />}
            <h1 className="text-2xl font-bold">{branding.siteName}</h1>
          </Link>
          <div className="flex items-center gap-2">
             <Button asChild variant="outline">
               <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" />Back to Home</Link>
             </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="flex-1">
        <div className="container mx-auto px-4 md:px-6 py-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/"><Home className="h-4 w-4" /></Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>About Us</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="pb-12">
          {children}
        </div>
      </main>
    </div>
  );
}
