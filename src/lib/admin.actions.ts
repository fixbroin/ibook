

'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { addDays, differenceInDays, isBefore, startOfToday } from 'date-fns';
import { updateAdminSettings, getProviderByUsername, updateProvider, getPlan, getAdminSettings, getAllDocsFromCollection, setDocInCollection, getAllProviders as getAllProvidersData, addNotification, getTestimonials as getTestimonialsData, deleteTestimonial as deleteTestimonialData, createTestimonial as createTestimonialData, updateTestimonial as updateTestimonialData, updateHeroSettings as updateHeroSettingsData, getHeroSettings } from './data';
import type { RazorpaySettings, SmtpSettings, SiteSettings, FaqItem, Testimonial, FooterSettings, ScreenshotsSettings, MarketingSettings, ServiceTypeSetting, PolicySettings, GoogleApiSettings, OutlookApiSettings, AboutSettings, SeoSettings, ScreenshotItem, HeroSettings, BrandingSettings, FloatingButtonsSettings } from './types';
import { auth, storage, db } from './firebase';
import { sendPasswordResetEmail as sendFirebasePasswordResetEmail } from 'firebase/auth';
import { sendAccountStatusEmail, sendExpiryReminderEmail as sendReminderEmailTemplate, sendPlanExpiredEmail } from './email-templates';
import { ref, uploadString, getDownloadURL, deleteObject, uploadBytesResumable } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { doc, writeBatch } from 'firebase/firestore';
import 'dotenv/config';

const razorpaySchema = z.object({
  keyId: z.string().min(1, 'Key ID is required.'),
  keySecret: z.string().optional(),
  webhookSecret: z.string().optional(),
});

const smtpSchema = z.object({
  host: z.string().min(1, 'Host is required.'),
  port: z.coerce.number().min(1, 'Port is required.'),
  senderEmail: z.string().email('Invalid email address.'),
  username: z.string().min(1, 'Username is required.'),
  password: z.string().optional(),
});

const apiSchema = z.object({
  clientId: z.string().min(1, "Client ID is required."),
  clientSecret: z.string().optional(),
  redirectUri: z.string().url("Must be a valid URL."),
});

const heroSettingsSchema = z.object({
    title: z.string().min(1, "Hero Title is required."),
    paragraph: z.string().min(1, "Hero Paragraph is required."),
    imageUrl: z.string().url("A valid image URL is required."),
    clickUrl: z.string().url().optional().or(z.literal('')),
    button1Text: z.string().min(1, "Button 1 Text is required."),
    button1Link: z.string().min(1, "Button 1 Link is required."),
    button2Text: z.string().min(1, "Button 2 Text is required."),
    button2Link: z.string().min(1, "Button 2 Link is required."),
});

const testimonialSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Reviewer's name is required."),
  rating: z.coerce.number().min(1).max(5),
  description: z.string().min(1, "Review description is required."),
  imageUrl: z.string().optional(),
});

const seoSettingsSchema = z.object({
    titleTemplate: z.string(),
    defaultTitle: z.string(),
    defaultDescription: z.string(),
    defaultKeywords: z.string(),
    twitterHandle: z.string(),
    currentOpenGraphImageUrl: z.string(),
});

const brandingSettingsSchema = z.object({
    siteName: z.string().min(1, "Site Name is required."),
    logoUrl: z.string().url("A valid logo URL is required."),
});


export async function updatePaymentSettings(data: RazorpaySettings) {
  const parsed = razorpaySchema.safeParse(data);

  if (!parsed.success) {
    const errorMessage = Object.values(parsed.error.flatten().fieldErrors).flat().join(' ');
    return { success: false, error: errorMessage };
  }

  try {
     const settingsToUpdate: Partial<RazorpaySettings> = { keyId: parsed.data.keyId };
     
     if (parsed.data.keySecret) {
        settingsToUpdate.keySecret = parsed.data.keySecret;
     }
      if (parsed.data.webhookSecret) {
        settingsToUpdate.webhookSecret = parsed.data.webhookSecret;
     }
     
    await updateAdminSettings({ razorpay: settingsToUpdate });
    revalidatePath('/admin/settings');
    return { success: true };
  } catch (error) {
    console.error('Error updating payment settings:', error);
    return { success: false, error: 'Could not save settings.' };
  }
}

export async function updateEmailSettings(data: SmtpSettings) {
    const parsed = smtpSchema.safeParse(data);

    if (!parsed.success) {
        const errorMessage = Object.values(parsed.error.flatten().fieldErrors).flat().join(' ');
        return { success: false, error: errorMessage };
    }

    try {
        const settingsToUpdate: Partial<SmtpSettings> = { ...parsed.data };
        if (!parsed.data.password) {
            delete (settingsToUpdate as any).password;
        }
        await updateAdminSettings({ smtp: settingsToUpdate });
        revalidatePath('/admin/settings');
        return { success: true };
    } catch (error: any) {
        console.error('Error updating email settings:', error);
        return { success: false, error: 'Could not save SMTP settings.' };
    }
}

export async function updateApiSettings(type: 'googleApi' | 'outlookApi', data: GoogleApiSettings | OutlookApiSettings) {
    const parsed = apiSchema.safeParse(data);
    if (!parsed.success) {
        const errorMessage = Object.values(parsed.error.flatten().fieldErrors).flat().join(' ');
        return { success: false, error: errorMessage };
    }

    try {
        const settingsToUpdate: Partial<GoogleApiSettings | OutlookApiSettings> = { ...parsed.data };
        if (!parsed.data.clientSecret) {
            delete (settingsToUpdate as any).clientSecret;
        }
        await updateAdminSettings({ [type]: settingsToUpdate });
        revalidatePath('/admin/settings');
        return { success: true };
    } catch (error: any) {
        console.error(`Error updating ${type} settings:`, error);
        return { success: false, error: `Could not save ${type} settings.` };
    }
}


export async function updateHeroSettingsAction(formData: FormData) {
  const rawData = Object.fromEntries(formData.entries());
  
  const parsed = heroSettingsSchema.safeParse(rawData);
  if (!parsed.success) {
      const errorMessage = Object.values(parsed.error.flatten().fieldErrors).flat().join(' ');
      return { success: false, error: errorMessage };
  }

  const { data } = parsed;
  
  try {
    const newSettings: HeroSettings = {
        title: data.title,
        paragraph: data.paragraph,
        imageUrl: data.imageUrl,
        clickUrl: data.clickUrl,
        buttons: [
            { text: data.button1Text, link: data.button1Link, variant: 'default' },
            { text: data.button2Text, link: data.button2Link, variant: 'outline' },
        ]
    };

    await updateHeroSettingsData(newSettings);

    revalidatePath('/admin/hero-settings');
    revalidatePath('/');
    return { success: true, updatedSettings: newSettings };

  } catch (error: any) {
    console.error("Error updating hero settings:", error);
    return { success: false, error: 'Could not save hero settings.' };
  }
}

export async function updateBrandingSettings(formData: FormData) {
    const rawData = Object.fromEntries(formData.entries());

    const parsed = brandingSettingsSchema.safeParse(rawData);
    if (!parsed.success) {
        const errorMessage = Object.values(parsed.error.flatten().fieldErrors).flat().join(' ');
        return { success: false, error: errorMessage };
    }
    const { data } = parsed;

    try {
        await updateAdminSettings({ site: { branding: data } as any });
        revalidatePath('/admin/hero-settings');
        revalidatePath('/');
        return { success: true, updatedSettings: data };
    } catch (error: any) {
        return { success: false, error: 'Could not save branding settings.' };
    }
}

export async function updateFaqSettings(faqs: FaqItem[]) {
    try {
        await updateAdminSettings({ site: { faq: faqs } as any });
        revalidatePath('/admin/faq-settings');
        revalidatePath('/');
        return { success: true };
    } catch (error: any) {
        console.error("Error updating FAQ settings:", error);
        return { success: false, error: "Could not save FAQ settings." };
    }
}


// Provider management actions
export async function sendProviderPasswordResetEmail(email: string) {
    try {
        await sendFirebasePasswordResetEmail(auth, email);
        return { success: true };
    } catch (error: any) {
        console.error("Password reset error:", error);
        return { success: false, error: error.message || 'Failed to send password reset email.' };
    }
}

export async function extendProviderTrial(username: string, days: number) {
    try {
        const provider = await getProviderByUsername(username);
        if (!provider) {
            return { success: false, error: 'Provider not found.' };
        }

        const now = new Date();
        const currentExpiry = provider.planExpiry && provider.planExpiry > now ? provider.planExpiry : now;
        const newExpiryDate = addDays(currentExpiry, days);

        await updateProvider(username, { planExpiry: newExpiryDate });
        revalidatePath('/admin/providers');
        return { success: true };
    } catch (error: any) {
         console.error("Trial extension error:", error);
        return { success: false, error: error.message || 'Failed to extend trial.' };
    }
}

export async function toggleProviderSuspension(username: string, currentStatus: boolean) {
    try {
        const newStatus = !currentStatus;
        await updateProvider(username, { isSuspended: newStatus });
        
        const provider = await getProviderByUsername(username);
        if (provider) {
            await sendAccountStatusEmail(provider.contact.email, provider.name, newStatus);
        }

        revalidatePath('/admin/providers');
        return { success: true };
    } catch (error: any) {
        console.error("Provider suspension error:", error);
        return { success: false, error: error.message || 'Failed to update provider status.' };
    }
}

export async function sendExpiryReminderEmail(providerEmail: string, providerName: string) {
     try {
        const username = providerEmail.split('@')[0];
        const provider = await getProviderByUsername(username);
        if (!provider || !provider.planId || !provider.planExpiry) {
            return { success: false, error: 'Provider or plan details not found.' };
        }
        
        const plan = await getPlan(provider.planId);
        if (!plan) {
            return { success: false, error: 'Plan not found.' };
        }

        const daysRemaining = differenceInDays(provider.planExpiry, new Date());

        await sendReminderEmailTemplate(providerEmail, providerName, plan.name, daysRemaining);
        return { success: true };
    } catch (error: any) {
        console.error("Reminder email error:", error);
        return { success: false, error: error.message || 'Failed to send reminder email.' };
    }
}

export async function updateFooterSettings(data: FooterSettings) {
  try {
    await updateAdminSettings({ site: { footer: data } as any });
    revalidatePath('/admin/footer-settings');
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error("Error updating footer settings:", error);
    return { success: false, error: "Could not save footer settings." };
  }
}

export async function updateScreenshotsSettings(data: ScreenshotsSettings) {
    try {
        await updateAdminSettings({ site: { screenshots: data } as any });
        revalidatePath('/admin/screenshots-settings');
        revalidatePath('/');
        return { success: true };
    } catch (error: any) {
        console.error("Error updating screenshots settings:", error);
        return { success: false, error: "Could not save settings." };
    }
}

export async function updateMarketingSettings(data: MarketingSettings) {
    try {
        await updateAdminSettings({ marketing: data });
        revalidatePath('/admin/marketing-setup');
        revalidatePath('/'); // Revalidate root layout to inject scripts
        return { success: true };
    } catch (error: any) {
        console.error("Error updating marketing settings:", error);
        return { success: false, error: "Could not save marketing settings." };
    }
}

// src/lib/admin.actions.ts
export async function updateServiceTypeSettings(serviceTypes: ServiceTypeSetting[]) {
  try {
    // This assumes the structure is within site.settings.serviceTypes
    await updateAdminSettings({ site: { settings: { serviceTypes } } } as any);
    revalidatePath('/admin/service-type-settings'); // A new page, or just revalidate settings
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Could not save service type settings." };
  }
}

export async function updatePolicySettings(data: PolicySettings) {
    try {
        await updateAdminSettings({ site: { policies: data } as any });
        revalidatePath('/admin/policy-settings');
        revalidatePath('/terms-of-service');
        revalidatePath('/privacy-policy');
        revalidatePath('/cancellation-policy');
        revalidatePath('/refund-policy');
        return { success: true };
    } catch (error: any) {
        console.error("Error updating policy settings:", error);
        return { success: false, error: "Could not save policy settings." };
    }
}


const COLLECTIONS_TO_EXPORT = ['admin', 'plans', 'providers', 'testimonials', 'hero'];

export async function exportDb() {
  try {
    const data: { [key: string]: any[] } = {};

    for (const collectionName of COLLECTIONS_TO_EXPORT) {
      data[collectionName] = await getAllDocsFromCollection(collectionName);
    }
    
    return { success: true, data: JSON.stringify(data, null, 2) };
  } catch (error: any) {
    return { success: false, error: `Export failed: ${error.message}` };
  }
}

export async function importDb(jsonString: string) {
    try {
        const data = JSON.parse(jsonString);
        let collectionsCount = 0;

        const batch = writeBatch(db);

        for (const collectionName in data) {
            if (Object.prototype.hasOwnProperty.call(data, collectionName)) {
                collectionsCount++;
                const collectionData = data[collectionName] as { id: string, [key: string]: any }[];
                
                for (const docData of collectionData) {
                    if (docData.id) {
                        const docRef = doc(db, collectionName, docData.id);
                        const { id, ...rest } = docData;
                        batch.set(docRef, rest);
                    }
                }
            }
        }

        await batch.commit();

        revalidatePath('/admin', 'layout');

        return { success: true, count: collectionsCount };

    } catch (error: any) {
        console.error("Import failed:", error);
        return { success: false, error: `Import failed: ${error.message}. Make sure the JSON file format is correct.` };
    }
}

export async function updateAboutSettings(data: AboutSettings) {
    try {
        await updateAdminSettings({ site: { about: data } as any });
        revalidatePath('/admin/about-settings');
        revalidatePath('/about');
        return { success: true };
    } catch (error: any) {
        console.error("Error updating about page settings:", error);
        return { success: false, error: "Could not save settings." };
    }
}

export async function checkAndSendExpiryEmails() {
    const providers = await getAllProvidersData();
    const today = startOfToday();
    let emailsSent = 0;

    for (const provider of providers) {
        // Skip if no expiry date, or plan is lifetime, or not yet expired, or already notified
        if (!provider.planExpiry || provider.plan?.duration === 'lifetime' || !isBefore(provider.planExpiry, today) || provider.expiryNotified) {
            continue;
        }

        try {
            if (provider.plan?.name) {
                await sendPlanExpiredEmail(provider.contact.email, provider.name, provider.plan.name);
                await updateProvider(provider.username, { expiryNotified: true });
                await addNotification('admin', {
                    message: `${provider.name}'s subscription to the ${provider.plan.name} plan has expired.`,
                    type: 'general',
                    link: `/admin/providers`,
                });
                emailsSent++;
            }
        } catch (error) {
            console.error(`Failed to send expiry email to ${provider.contact.email}:`, error);
        }
    }
    
    console.log(`Cron job: Checked for expired subscriptions. Sent ${emailsSent} emails.`);
    return { success: true, count: emailsSent };
}

export async function updateSeoSettings(formData: FormData) {
  const rawData = Object.fromEntries(formData.entries());
  const openGraphImage = rawData.openGraphImage as File;

  const parsed = seoSettingsSchema.safeParse(rawData);
  if (!parsed.success) {
    const errorMessage = Object.values(parsed.error.flatten().fieldErrors).flat().join(' ');
    return { success: false, error: errorMessage };
  }

  const { data } = parsed;

  try {
    let finalImageUrl = data.currentOpenGraphImageUrl;

    if (openGraphImage && openGraphImage.size > 0) {
      const storageRef = ref(storage, `seo/${uuidv4()}-${openGraphImage.name}`);
      const uploadTask = uploadBytesResumable(storageRef, openGraphImage);

      finalImageUrl = await new Promise<string>((resolve, reject) => {
        uploadTask.on('state_changed',
          null,
          (error) => {
            console.error("Upload failed:", error);
            reject(error);
          },
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          }
        );
      });
    }
    
    const newSeoSettings: SeoSettings = {
        titleTemplate: data.titleTemplate,
        defaultTitle: data.defaultTitle,
        defaultDescription: data.defaultDescription,
        defaultKeywords: data.defaultKeywords,
        twitterHandle: data.twitterHandle,
        openGraphImageUrl: finalImageUrl,
    };

    await updateAdminSettings({ site: { seo: newSeoSettings } as any });

    revalidatePath('/admin/seo-settings');
    revalidatePath('/'); // Revalidate root to apply new metadata

    return { success: true, updatedSettings: newSeoSettings };
  } catch (error: any) {
    console.error("Error updating SEO settings:", error);
    return { success: false, error: 'Could not save SEO settings.' };
  }
}

export async function updateTestimonial(id: string, data: Partial<Testimonial>) {
    try {
        await updateTestimonialData(id, data);
        revalidatePath('/admin/testimonials');
        revalidatePath('/');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteTestimonial(id: string) {
    try {
        await deleteTestimonialData(id);
        revalidatePath('/admin/testimonials');
        revalidatePath('/');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateFloatingButtonsSettings(data: FloatingButtonsSettings) {
    try {
        await updateAdminSettings({ site: { floatingButtons: data } as any });
        revalidatePath('/admin/floating-buttons');
        revalidatePath('/');
        return { success: true };
    } catch (error: any) {
        console.error("Error updating floating buttons settings:", error);
        return { success: false, error: "Could not save settings." };
    }
}