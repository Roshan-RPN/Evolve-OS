"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { respondToCheckin } from "@/lib/actions/checkins";
import { useRouter } from "next/navigation";

type Checkin = {
  id: string;
  prompt: string;
  response: string | null;
  follow_up_story: string | null;
};

const RESPONSES = [
  { value: "done" as const, label: "Done" },
  { value: "partial" as const, label: "Partially" },
  { value: "skipped" as const, label: "Skipped it" },
];

const MOODS = [
  { value: "good" as const, label: "Good" },
  { value: "low" as const, label: "Low energy" },
  { value: "stuck" as const, label: "Stuck" },
  { value: "confused" as const, label: "Confused" },
];

export function CheckinCard({ checkin }: { checkin: Checkin }) {
  const router = useRouter();
  const [response, setResponse] = useState(checkin.response as "done" | "partial" | "skipped" | null);
  const [story, setStory] = useState(checkin.follow_up_story);
  const [submitting, setSubmitting] = useState(false);

  async function pick(value: "done" | "partial" | "skipped") {
    setResponse(value);
  }

  async function pickMood(mood: "good" | "low" | "stuck" | "confused") {
    if (!response) return;
    setSubmitting(true);
    const res = await respondToCheckin({ id: checkin.id, response, mood });
    setStory(res.followUpStory);
    setSubmitting(false);
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-4 px-4 py-6 lg:p-6">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-lg">{checkin.prompt}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {!story && (
            <>
              <div className="flex gap-2">
                {RESPONSES.map((r) => (
                  <Button
                    key={r.value}
                    variant={response === r.value ? "default" : "outline"}
                    onClick={() => pick(r.value)}
                    className="flex-1"
                  >
                    {r.label}
                  </Button>
                ))}
              </div>
              {response && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">How are you feeling right now?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {MOODS.map((m) => (
                      <Button
                        key={m.value}
                        variant="secondary"
                        disabled={submitting}
                        onClick={() => pickMood(m.value)}
                      >
                        {m.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {story && (
            <div className="space-y-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{story}</p>
              <Button className="w-full" onClick={() => router.push("/")}>
                Back to it
              </Button>
            </div>
          )}

          {response && !story && (
            <p className="text-center text-xs text-muted-foreground">Logged. Keep going.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
