"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Upload, FileText, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc/client";
import Papa from "papaparse";
import { toast } from "sonner";

export default function ProductImportExportPage() {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importResults, setImportResults] = useState<{
    created: number;
    updated: number;
    errors: string[];
  } | null>(null);

  const utils = trpc.useUtils();
  const bulkImportMutation = trpc.product.import.useMutation();

  const handleExport = async () => {
    try {
      setExporting(true);
      toast.loading("Exporting products...");
      const data = await utils.product.export.fetch({});

      // Convert to CSV
      const csv = Papa.unparse(data);

      // Download file
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `products-export-${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.dismiss();
      toast.success("Products exported successfully!");
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to export products");
      console.error(error);
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResults(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          // Transform CSV data to match schema
          const products = results.data.map((row: any) => ({
            name: row.name,
            slug: row.slug,
            description: row.description || undefined,
            basePrice: parseFloat(row.basePrice),
            salePrice: row.salePrice ? parseFloat(row.salePrice) : undefined,
            categoryId: row.categoryId || undefined,
            brandId: row.brandId || undefined,
            sku: row.sku || undefined,
            stock: row.stock ? parseInt(row.stock) : 0,
            weight: row.weight ? parseFloat(row.weight) : undefined,
            dimensions: row.dimensions || undefined,
            tags: row.tags ? row.tags.split(",").map((t: string) => t.trim()) : [],
            isActive: row.isActive === "true" || row.isActive === "1",
            isFeatured: row.isFeatured === "true" || row.isFeatured === "1",
            isNew: row.isNew === "true" || row.isNew === "1",
            metaTitle: row.metaTitle || undefined,
            metaDescription: row.metaDescription || undefined,
          }));

          const result = await bulkImportMutation.mutateAsync({ products });
          setImportResults(result);

          if (result.errors.length === 0) {
            toast.success(`Successfully imported ${result.created + result.updated} products!`);
          } else {
            toast.warning(`Imported with some errors. Check details below.`);
          }
        } catch (error) {
          toast.error("Failed to import products");
          console.error(error);
        } finally {
          setImporting(false);
          // Reset file input
          event.target.value = "";
        }
      },
      error: (error) => {
        toast.error("Failed to parse CSV file");
        console.error(error);
        setImporting(false);
        event.target.value = "";
      },
    });
  };

  const downloadTemplate = () => {
    const template = [
      {
        name: "Sample Product",
        slug: "sample-product",
        description: "This is a sample product description",
        basePrice: "999",
        salePrice: "799",
        categoryId: "",
        brandId: "",
        sku: "SKU001",
        stock: "100",
        weight: "0.5",
        dimensions: "10x5x3",
        tags: "tag1,tag2,tag3",
        isActive: "true",
        isFeatured: "false",
        isNew: "true",
        metaTitle: "Sample Product - Meta Title",
        metaDescription: "Sample product meta description for SEO",
      },
    ];

    const csv = Papa.unparse(template);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "product-import-template.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Template downloaded!");
  };

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/products"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Products
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">Import/Export Products</h1>
        <p className="text-muted-foreground mt-2">
          Bulk manage your products using CSV files
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Export Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              <CardTitle>Export Products</CardTitle>
            </div>
            <CardDescription>
              Download all your products as a CSV file
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Export all products with their details including prices, stock, categories, and more.
              You can edit the exported file and re-import it.
            </p>
            <Button
              onClick={handleExport}
              disabled={exporting}
              className="w-full"
            >
              {exporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export All Products
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Import Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              <CardTitle>Import Products</CardTitle>
            </div>
            <CardDescription>
              Upload a CSV file to bulk create or update products
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Import products from a CSV file. Products with existing SKUs will be updated,
              new products will be created.
            </p>
            <div className="space-y-2">
              <Button
                variant="outline"
                onClick={downloadTemplate}
                className="w-full"
              >
                <FileText className="mr-2 h-4 w-4" />
                Download Template
              </Button>
              <div className="relative">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  disabled={importing}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <Button
                  disabled={importing}
                  className="w-full"
                >
                  {importing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Select CSV File
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Import Results */}
      {importResults && (
        <Card>
          <CardHeader>
            <CardTitle>Import Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">
                  {importResults.created} Created
                </span>
              </div>
              <div className="flex items-center gap-2 text-blue-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">
                  {importResults.updated} Updated
                </span>
              </div>
              {importResults.errors.length > 0 && (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">
                    {importResults.errors.length} Errors
                  </span>
                </div>
              )}
            </div>

            {importResults.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">Import Errors:</div>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {importResults.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>CSV Format Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm text-muted-foreground">
            <div>
              <h4 className="font-medium text-foreground mb-2">Required Fields:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li><code className="bg-muted px-1 py-0.5 rounded">name</code> - Product name</li>
                <li><code className="bg-muted px-1 py-0.5 rounded">slug</code> - URL-friendly identifier (must be unique)</li>
                <li><code className="bg-muted px-1 py-0.5 rounded">basePrice</code> - Regular price</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-2">Optional Fields:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li><code className="bg-muted px-1 py-0.5 rounded">salePrice</code> - Discounted price</li>
                <li><code className="bg-muted px-1 py-0.5 rounded">categoryId</code> - UUID of the category</li>
                <li><code className="bg-muted px-1 py-0.5 rounded">brandId</code> - UUID of the brand</li>
                <li><code className="bg-muted px-1 py-0.5 rounded">sku</code> - Stock keeping unit</li>
                <li><code className="bg-muted px-1 py-0.5 rounded">stock</code> - Available quantity</li>
                <li><code className="bg-muted px-1 py-0.5 rounded">tags</code> - Comma-separated tags</li>
                <li><code className="bg-muted px-1 py-0.5 rounded">isActive</code> - true/false or 1/0</li>
                <li><code className="bg-muted px-1 py-0.5 rounded">isFeatured</code> - true/false or 1/0</li>
                <li><code className="bg-muted px-1 py-0.5 rounded">isNew</code> - true/false or 1/0</li>
              </ul>
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Note:</strong> To get category and brand IDs, export your existing products or check
                the categories and brands pages in the admin panel.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
