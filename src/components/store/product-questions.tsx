"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { MessageCircleQuestion, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface ProductQuestionsProps {
  productId: string;
}

export function ProductQuestions({ productId }: ProductQuestionsProps) {
  const { data: session } = useSession();
  const [showForm, setShowForm] = useState(false);
  const [question, setQuestion] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

  const utils = trpc.useUtils();

  const { data: questions, isLoading } = trpc.productQuestion.getByProduct.useQuery({
    productId,
  });

  const askMutation = trpc.productQuestion.ask.useMutation({
    onSuccess: () => {
      toast.success("Your question has been submitted! We'll notify you when it's answered.");
      setQuestion("");
      setShowForm(false);
      utils.productQuestion.getByProduct.invalidate({ productId });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit question");
    },
  });

  const askGuestMutation = trpc.productQuestion.askGuest.useMutation({
    onSuccess: () => {
      toast.success("Your question has been submitted! We'll notify you when it's answered.");
      setQuestion("");
      setName("");
      setEmail("");
      setShowForm(false);
      utils.productQuestion.getByProduct.invalidate({ productId });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit question");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    if (session) {
      // Logged-in user
      askMutation.mutate({
        productId,
        question: question.trim(),
      });
    } else {
      // Guest user
      askGuestMutation.mutate({
        productId,
        question: question.trim(),
        name: name.trim() || "Anonymous",
        email: email.trim(),
      });
    }
  };

  const isPending = askMutation.isPending || askGuestMutation.isPending;

  const toggleQuestion = (id: string) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedQuestions(newExpanded);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <MessageCircleQuestion className="h-5 w-5" />
          Questions & Answers
          {questions && questions.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              ({questions.length})
            </span>
          )}
        </h2>
        <Button variant="outline" onClick={() => setShowForm(!showForm)}>
          Ask a Question
        </Button>
      </div>

      {/* Ask Question Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-4 bg-gray-50">
          <div>
            <Label htmlFor="question">Your Question</Label>
            <Textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What would you like to know about this product?"
              className="mt-1"
              rows={3}
              required
            />
          </div>

          {!session && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name (optional)</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="email">Email (optional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="For notification when answered"
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={isPending || !question.trim()}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Question"
              )}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Questions List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : questions && questions.length > 0 ? (
        <div className="space-y-4">
          {questions.map((q) => (
            <Collapsible
              key={q.id}
              open={expandedQuestions.has(q.id)}
              onOpenChange={() => toggleQuestion(q.id)}
            >
              <div className="border rounded-lg overflow-hidden">
                <CollapsibleTrigger className="w-full p-4 flex items-start justify-between text-left hover:bg-gray-50">
                  <div className="flex-1">
                    <p className="font-medium">Q: {q.question}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Asked {formatDistanceToNow(new Date(q.createdAt), { addSuffix: true })}
                      {q.name && ` by ${q.name}`}
                    </p>
                  </div>
                  {q.answer ? (
                    expandedQuestions.has(q.id) ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    )
                  ) : (
                    <span className="text-xs text-muted-foreground bg-gray-100 px-2 py-1 rounded">
                      Awaiting answer
                    </span>
                  )}
                </CollapsibleTrigger>
                {q.answer && (
                  <CollapsibleContent>
                    <div className="px-4 pb-4 pt-0 border-t bg-gray-50">
                      <p className="font-medium text-sm text-green-700 mt-3">A: {q.answer}</p>
                      {q.answeredAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Answered {formatDistanceToNow(new Date(q.answeredAt), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </CollapsibleContent>
                )}
              </div>
            </Collapsible>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 border rounded-lg bg-gray-50">
          <MessageCircleQuestion className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No questions yet</p>
          <p className="text-sm text-muted-foreground">Be the first to ask about this product</p>
        </div>
      )}
    </div>
  );
}
