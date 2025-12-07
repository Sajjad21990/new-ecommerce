"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Star, Loader2, User } from "lucide-react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const reviewSchema = z.object({
  rating: z.number().min(1, "Please select a rating").max(5),
  title: z.string().max(255).optional(),
  comment: z.string().max(2000).optional(),
});

type ReviewFormValues = z.infer<typeof reviewSchema>;

interface ProductReviewsProps {
  productId: string;
}

function StarRating({
  rating,
  onRatingChange,
  interactive = false,
  size = "md",
}: {
  rating: number;
  onRatingChange?: (rating: number) => void;
  interactive?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const [hoverRating, setHoverRating] = useState(0);
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onRatingChange?.(star)}
          onMouseEnter={() => interactive && setHoverRating(star)}
          onMouseLeave={() => interactive && setHoverRating(0)}
          className={cn(
            "focus:outline-none",
            interactive && "cursor-pointer hover:scale-110 transition-transform"
          )}
        >
          <Star
            className={cn(
              sizeClasses[size],
              (hoverRating || rating) >= star
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            )}
          />
        </button>
      ))}
    </div>
  );
}

export function ProductReviews({ productId }: ProductReviewsProps) {
  const { data: session, status: authStatus } = useSession();
  const [showReviewForm, setShowReviewForm] = useState(false);

  const utils = trpc.useUtils();

  const { data: reviewsData, isLoading } = trpc.review.getByProduct.useQuery({
    productId,
    page: 1,
    limit: 10,
  });

  const { data: canReviewData } = trpc.review.canReview.useQuery(
    { productId },
    { enabled: authStatus === "authenticated" }
  );

  const createReview = trpc.review.create.useMutation({
    onSuccess: () => {
      toast.success("Review submitted successfully!");
      setShowReviewForm(false);
      form.reset();
      utils.review.getByProduct.invalidate({ productId });
      utils.review.canReview.invalidate({ productId });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit review");
    },
  });

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 0,
      title: "",
      comment: "",
    },
  });

  const onSubmit = (data: ReviewFormValues) => {
    createReview.mutate({
      productId,
      rating: data.rating,
      title: data.title || undefined,
      comment: data.comment || undefined,
    });
  };

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(date));
  };

  if (isLoading) {
    return (
      <div className="py-8 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { reviews, stats } = reviewsData || {
    reviews: [],
    stats: { averageRating: 0, totalReviews: 0, ratingDistribution: {} },
  };

  return (
    <div className="py-8">
      <h2 className="text-2xl font-bold mb-6">Customer Reviews</h2>

      <div className="grid md:grid-cols-3 gap-8 mb-8">
        {/* Rating Summary */}
        <div className="md:col-span-1">
          <div className="text-center md:text-left">
            <div className="text-5xl font-bold mb-2">
              {stats.averageRating.toFixed(1)}
            </div>
            <StarRating rating={Math.round(stats.averageRating)} size="lg" />
            <p className="text-muted-foreground mt-2">
              Based on {stats.totalReviews} review{stats.totalReviews !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Rating Distribution */}
          <div className="mt-6 space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = stats.ratingDistribution[rating] || 0;
              const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
              return (
                <div key={rating} className="flex items-center gap-2">
                  <span className="w-12 text-sm">{rating} star</span>
                  <Progress value={percentage} className="flex-1 h-2" />
                  <span className="w-8 text-sm text-muted-foreground">{count}</span>
                </div>
              );
            })}
          </div>

          {/* Write Review Button */}
          <div className="mt-6">
            {authStatus === "unauthenticated" ? (
              <Button asChild variant="outline" className="w-full">
                <Link href="/login">Sign in to write a review</Link>
              </Button>
            ) : canReviewData?.canReview ? (
              <Button
                onClick={() => setShowReviewForm(!showReviewForm)}
                className="w-full"
              >
                Write a Review
              </Button>
            ) : canReviewData?.reason === "already_reviewed" ? (
              <p className="text-sm text-muted-foreground text-center">
                You&apos;ve already reviewed this product
              </p>
            ) : canReviewData?.reason === "not_purchased" ? (
              <p className="text-sm text-muted-foreground text-center">
                Purchase this product to write a review
              </p>
            ) : null}
          </div>
        </div>

        {/* Review Form & List */}
        <div className="md:col-span-2">
          {/* Review Form */}
          {showReviewForm && (
            <div className="border rounded-lg p-6 mb-6">
              <h3 className="font-semibold mb-4">Write Your Review</h3>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="rating"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rating *</FormLabel>
                        <FormControl>
                          <StarRating
                            rating={field.value}
                            onRatingChange={field.onChange}
                            interactive
                            size="lg"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Review Title</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Sum up your experience in a few words"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="comment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Review</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell others about your experience with this product..."
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowReviewForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createReview.isPending}>
                      {createReview.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Submit Review
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}

          {/* Reviews List */}
          {reviews.length === 0 ? (
            <div className="text-center py-12 border rounded-lg">
              <Star className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No reviews yet</p>
              <p className="text-sm text-muted-foreground">
                Be the first to review this product!
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {reviews.map((review) => (
                <div key={review.id} className="border-b pb-6 last:border-0">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      {review.user?.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={review.user.image}
                          alt={review.user.name || ""}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">
                          {review.user?.name || "Anonymous"}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(review.createdAt)}
                        </span>
                      </div>
                      <StarRating rating={review.rating} size="sm" />
                      {review.title && (
                        <h4 className="font-medium mt-2">{review.title}</h4>
                      )}
                      {review.comment && (
                        <p className="text-muted-foreground mt-1">
                          {review.comment}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
