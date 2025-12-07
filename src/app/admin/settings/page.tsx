"use client";

import { useEffect } from "react";
import {
  Store,
  Truck,
  CreditCard,
  Share2,
  Search,
  Loader2,
  Save,
  Settings,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Form Schemas
const storeSettingsSchema = z.object({
  storeName: z.string().min(1, "Store name is required").max(100),
  storeEmail: z.string().email("Invalid email"),
  storePhone: z.string().optional(),
  storeAddress: z.string().optional(),
  currency: z.string(),
  currencySymbol: z.string(),
  taxRate: z.number().min(0).max(100),
  freeShippingThreshold: z.number().min(0).optional(),
  defaultShippingCost: z.number().min(0),
});

const socialSettingsSchema = z.object({
  facebook: z.string().url().optional().or(z.literal("")),
  instagram: z.string().url().optional().or(z.literal("")),
  twitter: z.string().url().optional().or(z.literal("")),
  youtube: z.string().url().optional().or(z.literal("")),
  pinterest: z.string().url().optional().or(z.literal("")),
});

const seoSettingsSchema = z.object({
  metaTitle: z.string().max(70).optional(),
  metaDescription: z.string().max(160).optional(),
  metaKeywords: z.string().optional(),
  ogImage: z.string().url().optional().or(z.literal("")),
  googleAnalyticsId: z.string().optional(),
});

const shippingSettingsSchema = z.object({
  enableFreeShipping: z.boolean(),
  freeShippingMinimum: z.number().min(0),
  flatRate: z.number().min(0),
  estimatedDeliveryMin: z.number().min(1),
  estimatedDeliveryMax: z.number().min(1),
  enableCOD: z.boolean(),
  codExtraCharge: z.number().min(0),
});

const paymentSettingsSchema = z.object({
  razorpayEnabled: z.boolean(),
  codEnabled: z.boolean(),
  testMode: z.boolean(),
});

type StoreSettings = z.infer<typeof storeSettingsSchema>;
type SocialSettings = z.infer<typeof socialSettingsSchema>;
type SEOSettings = z.infer<typeof seoSettingsSchema>;
type ShippingSettings = z.infer<typeof shippingSettingsSchema>;
type PaymentSettings = z.infer<typeof paymentSettingsSchema>;

export default function SettingsPage() {
  const utils = trpc.useUtils();
  const { data: allSettings, isLoading } = trpc.settings.adminGetAll.useQuery();

  // Store Form
  const storeForm = useForm<StoreSettings>({
    resolver: zodResolver(storeSettingsSchema),
    defaultValues: {
      storeName: "STORE",
      storeEmail: "support@store.com",
      storePhone: "",
      storeAddress: "",
      currency: "INR",
      currencySymbol: "₹",
      taxRate: 0,
      freeShippingThreshold: 999,
      defaultShippingCost: 49,
    },
  });

  // Social Form
  const socialForm = useForm<SocialSettings>({
    resolver: zodResolver(socialSettingsSchema),
    defaultValues: {
      facebook: "",
      instagram: "",
      twitter: "",
      youtube: "",
      pinterest: "",
    },
  });

  // SEO Form
  const seoForm = useForm<SEOSettings>({
    resolver: zodResolver(seoSettingsSchema),
    defaultValues: {
      metaTitle: "",
      metaDescription: "",
      metaKeywords: "",
      ogImage: "",
      googleAnalyticsId: "",
    },
  });

  // Shipping Form
  const shippingForm = useForm<ShippingSettings>({
    resolver: zodResolver(shippingSettingsSchema),
    defaultValues: {
      enableFreeShipping: true,
      freeShippingMinimum: 999,
      flatRate: 49,
      estimatedDeliveryMin: 3,
      estimatedDeliveryMax: 7,
      enableCOD: true,
      codExtraCharge: 0,
    },
  });

  // Payment Form
  const paymentForm = useForm<PaymentSettings>({
    resolver: zodResolver(paymentSettingsSchema),
    defaultValues: {
      razorpayEnabled: true,
      codEnabled: true,
      testMode: false,
    },
  });

  // Load settings into forms
  useEffect(() => {
    if (allSettings) {
      if (allSettings.store) {
        const store = allSettings.store as StoreSettings;
        storeForm.reset(store);
      }
      if (allSettings.social) {
        const social = allSettings.social as SocialSettings;
        socialForm.reset(social);
      }
      if (allSettings.seo) {
        const seo = allSettings.seo as SEOSettings;
        seoForm.reset(seo);
      }
      if (allSettings.shipping) {
        const shipping = allSettings.shipping as {
          enableFreeShipping?: boolean;
          freeShippingMinimum?: number;
          flatRate?: number;
          estimatedDeliveryDays?: { min?: number; max?: number };
          enableCOD?: boolean;
          codExtraCharge?: number;
        };
        shippingForm.reset({
          enableFreeShipping: shipping.enableFreeShipping ?? true,
          freeShippingMinimum: shipping.freeShippingMinimum ?? 999,
          flatRate: shipping.flatRate ?? 49,
          estimatedDeliveryMin: shipping.estimatedDeliveryDays?.min ?? 3,
          estimatedDeliveryMax: shipping.estimatedDeliveryDays?.max ?? 7,
          enableCOD: shipping.enableCOD ?? true,
          codExtraCharge: shipping.codExtraCharge ?? 0,
        });
      }
      if (allSettings.payment) {
        const payment = allSettings.payment as PaymentSettings;
        paymentForm.reset(payment);
      }
    }
  }, [allSettings]);

  // Mutations
  const updateStore = trpc.settings.adminUpdateStore.useMutation({
    onSuccess: () => {
      toast.success("Store settings saved");
      utils.settings.adminGetAll.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save settings");
    },
  });

  const updateSocial = trpc.settings.adminUpdateSocial.useMutation({
    onSuccess: () => {
      toast.success("Social settings saved");
      utils.settings.adminGetAll.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save settings");
    },
  });

  const updateSEO = trpc.settings.adminUpdateSEO.useMutation({
    onSuccess: () => {
      toast.success("SEO settings saved");
      utils.settings.adminGetAll.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save settings");
    },
  });

  const updateShipping = trpc.settings.adminUpdateShipping.useMutation({
    onSuccess: () => {
      toast.success("Shipping settings saved");
      utils.settings.adminGetAll.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save settings");
    },
  });

  const updatePayment = trpc.settings.adminUpdatePayment.useMutation({
    onSuccess: () => {
      toast.success("Payment settings saved");
      utils.settings.adminGetAll.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save settings");
    },
  });

  // Submit handlers
  const onStoreSubmit = (data: StoreSettings) => {
    updateStore.mutate(data);
  };

  const onSocialSubmit = (data: SocialSettings) => {
    updateSocial.mutate(data);
  };

  const onSEOSubmit = (data: SEOSettings) => {
    updateSEO.mutate(data);
  };

  const onShippingSubmit = (data: ShippingSettings) => {
    updateShipping.mutate({
      enableFreeShipping: data.enableFreeShipping,
      freeShippingMinimum: data.freeShippingMinimum,
      flatRate: data.flatRate,
      estimatedDeliveryDays: {
        min: data.estimatedDeliveryMin,
        max: data.estimatedDeliveryMax,
      },
      enableCOD: data.enableCOD,
      codExtraCharge: data.codExtraCharge,
    });
  };

  const onPaymentSubmit = (data: PaymentSettings) => {
    updatePayment.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Settings className="h-4 w-4 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1 ml-10">
          Manage your store configuration
        </p>
      </div>

      <Tabs defaultValue="store" className="space-y-6">
        <TabsList className="bg-muted/50 grid w-full grid-cols-5">
          <TabsTrigger value="store" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            <span className="hidden sm:inline">Store</span>
          </TabsTrigger>
          <TabsTrigger value="shipping" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            <span className="hidden sm:inline">Shipping</span>
          </TabsTrigger>
          <TabsTrigger value="payment" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Payment</span>
          </TabsTrigger>
          <TabsTrigger value="social" className="flex items-center gap-2">
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline">Social</span>
          </TabsTrigger>
          <TabsTrigger value="seo" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">SEO</span>
          </TabsTrigger>
        </TabsList>

        {/* Store Settings */}
        <TabsContent value="store">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-base">Store Information</CardTitle>
              <CardDescription>
                Basic information about your store
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={storeForm.handleSubmit(onStoreSubmit)}
                className="space-y-6"
              >
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="storeName">Store Name</Label>
                    <Input
                      id="storeName"
                      {...storeForm.register("storeName")}
                      className="bg-background"
                    />
                    {storeForm.formState.errors.storeName && (
                      <p className="text-sm text-red-500">
                        {storeForm.formState.errors.storeName.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="storeEmail">Store Email</Label>
                    <Input
                      id="storeEmail"
                      type="email"
                      {...storeForm.register("storeEmail")}
                      className="bg-background"
                    />
                    {storeForm.formState.errors.storeEmail && (
                      <p className="text-sm text-red-500">
                        {storeForm.formState.errors.storeEmail.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="storePhone">Store Phone</Label>
                    <Input
                      id="storePhone"
                      {...storeForm.register("storePhone")}
                      placeholder="+91 98765 43210"
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="taxRate">Tax Rate (%)</Label>
                    <Input
                      id="taxRate"
                      type="number"
                      step="0.01"
                      {...storeForm.register("taxRate")}
                      className="bg-background"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="storeAddress">Store Address</Label>
                  <Textarea
                    id="storeAddress"
                    {...storeForm.register("storeAddress")}
                    placeholder="Enter your store address"
                    className="bg-background"
                  />
                </div>

                <Separator />

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Input
                      id="currency"
                      {...storeForm.register("currency")}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-sm text-muted-foreground">
                      Currency cannot be changed
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currencySymbol">Currency Symbol</Label>
                    <Input
                      id="currencySymbol"
                      {...storeForm.register("currencySymbol")}
                      className="bg-background"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={updateStore.isPending}>
                    {updateStore.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shipping Settings */}
        <TabsContent value="shipping">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-base">Shipping Configuration</CardTitle>
              <CardDescription>
                Configure shipping rates and options
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={shippingForm.handleSubmit(onShippingSubmit)}
                className="space-y-6"
              >
                <div className="flex items-center justify-between p-4 border rounded-lg bg-background">
                  <div>
                    <h4 className="font-medium">Free Shipping</h4>
                    <p className="text-sm text-muted-foreground">
                      Enable free shipping above a minimum order value
                    </p>
                  </div>
                  <Switch
                    checked={shippingForm.watch("enableFreeShipping")}
                    onCheckedChange={(checked) =>
                      shippingForm.setValue("enableFreeShipping", checked)
                    }
                  />
                </div>

                {shippingForm.watch("enableFreeShipping") && (
                  <div className="space-y-2">
                    <Label htmlFor="freeShippingMinimum">
                      Free Shipping Minimum (₹)
                    </Label>
                    <Input
                      id="freeShippingMinimum"
                      type="number"
                      {...shippingForm.register("freeShippingMinimum")}
                      className="bg-background"
                    />
                    <p className="text-sm text-muted-foreground">
                      Minimum order value for free shipping
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="flatRate">Flat Rate Shipping (₹)</Label>
                  <Input
                    id="flatRate"
                    type="number"
                    {...shippingForm.register("flatRate")}
                    className="bg-background"
                  />
                  <p className="text-sm text-muted-foreground">
                    Default shipping cost when free shipping does not apply
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="estimatedDeliveryMin">Min Delivery Days</Label>
                    <Input
                      id="estimatedDeliveryMin"
                      type="number"
                      {...shippingForm.register("estimatedDeliveryMin")}
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estimatedDeliveryMax">Max Delivery Days</Label>
                    <Input
                      id="estimatedDeliveryMax"
                      type="number"
                      {...shippingForm.register("estimatedDeliveryMax")}
                      className="bg-background"
                    />
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between p-4 border rounded-lg bg-background">
                  <div>
                    <h4 className="font-medium">Cash on Delivery (COD)</h4>
                    <p className="text-sm text-muted-foreground">
                      Allow customers to pay on delivery
                    </p>
                  </div>
                  <Switch
                    checked={shippingForm.watch("enableCOD")}
                    onCheckedChange={(checked) =>
                      shippingForm.setValue("enableCOD", checked)
                    }
                  />
                </div>

                {shippingForm.watch("enableCOD") && (
                  <div className="space-y-2">
                    <Label htmlFor="codExtraCharge">COD Extra Charge (₹)</Label>
                    <Input
                      id="codExtraCharge"
                      type="number"
                      {...shippingForm.register("codExtraCharge")}
                      className="bg-background"
                    />
                    <p className="text-sm text-muted-foreground">
                      Additional charge for COD orders (0 for no extra charge)
                    </p>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button type="submit" disabled={updateShipping.isPending}>
                    {updateShipping.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Settings */}
        <TabsContent value="payment">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-base">Payment Configuration</CardTitle>
              <CardDescription>
                Configure payment methods and gateways
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={paymentForm.handleSubmit(onPaymentSubmit)}
                className="space-y-6"
              >
                <div className="flex items-center justify-between p-4 border rounded-lg bg-background">
                  <div>
                    <h4 className="font-medium">Razorpay</h4>
                    <p className="text-sm text-muted-foreground">
                      Accept payments via Razorpay (UPI, Cards, Net Banking)
                    </p>
                  </div>
                  <Switch
                    checked={paymentForm.watch("razorpayEnabled")}
                    onCheckedChange={(checked) =>
                      paymentForm.setValue("razorpayEnabled", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg bg-background">
                  <div>
                    <h4 className="font-medium">Cash on Delivery</h4>
                    <p className="text-sm text-muted-foreground">
                      Allow customers to pay when they receive their order
                    </p>
                  </div>
                  <Switch
                    checked={paymentForm.watch("codEnabled")}
                    onCheckedChange={(checked) =>
                      paymentForm.setValue("codEnabled", checked)
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between p-4 border rounded-lg bg-amber-500/10 dark:bg-amber-500/5">
                  <div>
                    <h4 className="font-medium">Test Mode</h4>
                    <p className="text-sm text-muted-foreground">
                      Enable test mode for payment processing (no real charges)
                    </p>
                  </div>
                  <Switch
                    checked={paymentForm.watch("testMode")}
                    onCheckedChange={(checked) =>
                      paymentForm.setValue("testMode", checked)
                    }
                  />
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={updatePayment.isPending}>
                    {updatePayment.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Social Settings */}
        <TabsContent value="social">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-base">Social Media Links</CardTitle>
              <CardDescription>
                Add your social media profile URLs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={socialForm.handleSubmit(onSocialSubmit)}
                className="space-y-6"
              >
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="facebook">Facebook</Label>
                    <Input
                      id="facebook"
                      {...socialForm.register("facebook")}
                      placeholder="https://facebook.com/yourstore"
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="instagram">Instagram</Label>
                    <Input
                      id="instagram"
                      {...socialForm.register("instagram")}
                      placeholder="https://instagram.com/yourstore"
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="twitter">Twitter / X</Label>
                    <Input
                      id="twitter"
                      {...socialForm.register("twitter")}
                      placeholder="https://twitter.com/yourstore"
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="youtube">YouTube</Label>
                    <Input
                      id="youtube"
                      {...socialForm.register("youtube")}
                      placeholder="https://youtube.com/@yourstore"
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pinterest">Pinterest</Label>
                    <Input
                      id="pinterest"
                      {...socialForm.register("pinterest")}
                      placeholder="https://pinterest.com/yourstore"
                      className="bg-background"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={updateSocial.isPending}>
                    {updateSocial.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SEO Settings */}
        <TabsContent value="seo">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-base">SEO Configuration</CardTitle>
              <CardDescription>
                Optimize your store for search engines
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={seoForm.handleSubmit(onSEOSubmit)}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <Label htmlFor="metaTitle">Meta Title</Label>
                  <Input
                    id="metaTitle"
                    {...seoForm.register("metaTitle")}
                    placeholder="Your Store - Premium Fashion"
                    maxLength={70}
                    className="bg-background"
                  />
                  <p className="text-sm text-muted-foreground">
                    {seoForm.watch("metaTitle")?.length || 0}/70 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="metaDescription">Meta Description</Label>
                  <Textarea
                    id="metaDescription"
                    {...seoForm.register("metaDescription")}
                    placeholder="Describe your store in 160 characters or less"
                    maxLength={160}
                    className="bg-background"
                  />
                  <p className="text-sm text-muted-foreground">
                    {seoForm.watch("metaDescription")?.length || 0}/160 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="metaKeywords">Meta Keywords</Label>
                  <Input
                    id="metaKeywords"
                    {...seoForm.register("metaKeywords")}
                    placeholder="fashion, clothing, premium, style"
                    className="bg-background"
                  />
                  <p className="text-sm text-muted-foreground">
                    Comma-separated keywords
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="ogImage">Open Graph Image URL</Label>
                  <Input
                    id="ogImage"
                    {...seoForm.register("ogImage")}
                    placeholder="https://yourstore.com/og-image.jpg"
                    className="bg-background"
                  />
                  <p className="text-sm text-muted-foreground">
                    Image displayed when sharing on social media (1200x630 recommended)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="googleAnalyticsId">Google Analytics ID</Label>
                  <Input
                    id="googleAnalyticsId"
                    {...seoForm.register("googleAnalyticsId")}
                    placeholder="G-XXXXXXXXXX"
                    className="bg-background"
                  />
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={updateSEO.isPending}>
                    {updateSEO.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
