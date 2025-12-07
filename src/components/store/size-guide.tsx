"use client";

import { Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc/client";
import Image from "next/image";

interface SizeGuideProps {
  categoryId?: string;
}

export function SizeGuide({ categoryId }: SizeGuideProps) {
  const { data: sizeGuide, isLoading } = trpc.sizeGuide.getByCategory.useQuery(
    { categoryId: categoryId! },
    { enabled: !!categoryId }
  );

  if (!categoryId || isLoading || !sizeGuide) {
    return null;
  }

  const measurements = sizeGuide.measurements as Array<{
    label: string;
    sizes: Record<string, string>;
  }>;

  // Get all unique sizes from measurements
  const sizes = measurements.length > 0
    ? Object.keys(measurements[0].sizes)
    : [];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="text-sm text-muted-foreground underline hover:text-foreground">
          Size Guide
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ruler className="h-5 w-5" />
            {sizeGuide.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Measurement Diagram */}
          {sizeGuide.image && (
            <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
              <Image
                src={sizeGuide.image}
                alt="How to measure"
                fill
                className="object-contain"
              />
            </div>
          )}

          {/* Instructions */}
          {sizeGuide.instructions && (
            <div>
              <h3 className="font-medium mb-2">How to Measure</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {sizeGuide.instructions}
              </p>
            </div>
          )}

          {/* Size Chart Table */}
          <div>
            <h3 className="font-medium mb-2">Size Chart</h3>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="bg-gray-50">Measurement</TableHead>
                    {sizes.map((size) => (
                      <TableHead key={size} className="bg-gray-50 text-center">
                        {size}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {measurements.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{row.label}</TableCell>
                      {sizes.map((size) => (
                        <TableCell key={size} className="text-center">
                          {row.sizes[size] || "-"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              All measurements are in centimeters (cm)
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
