export type Quote = { text: string; author: string };

/** Curated, high-agency lines — no fluff, no toxic positivity. */
const QUOTES: Quote[] = [
  { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
  { text: "You do not rise to the level of your goals. You fall to the level of your systems.", author: "James Clear" },
  { text: "The successful warrior is the average person, with laser-like focus.", author: "Bruce Lee" },
  { text: "Motivation gets you going, but discipline keeps you growing.", author: "John C. Maxwell" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act but a habit.", author: "Will Durant" },
  { text: "The pain of discipline weighs ounces; the pain of regret weighs tons.", author: "Jim Rohn" },
  { text: "Do something today that your future self will thank you for.", author: "Sean Patrick Flanery" },
  { text: "It is not the mountain we conquer but ourselves.", author: "Edmund Hillary" },
  { text: "Small deeds done are better than great deeds planned.", author: "Peter Marshall" },
  { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { text: "You miss 100% of the reps you don't take.", author: "Anonymous" },
  { text: "How you do anything is how you do everything.", author: "Zen proverb" },
  { text: "Fall in love with the process and the results will come.", author: "Eric Thomas" },
  { text: "A river cuts through rock not because of its power but its persistence.", author: "James N. Watkins" },
  { text: "Suffer the pain of discipline or suffer the pain of regret.", author: "Anonymous" },
  { text: "Your only limit is the amount of action you're willing to take.", author: "Anonymous" },
  { text: "Consistency is what transforms average into excellence.", author: "Anonymous" },
  { text: "Don't count the days. Make the days count.", author: "Muhammad Ali" },
  { text: "The comfort zone is a beautiful place, but nothing ever grows there.", author: "Anonymous" },
  { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
  { text: "Either you run the day or the day runs you.", author: "Jim Rohn" },
  { text: "Nobody who ever gave their best regretted it.", author: "George Halas" },
  { text: "The best time to plant a tree was 20 years ago. The second best is now.", author: "Chinese proverb" },
  { text: "Whether you think you can or you can't, you're right.", author: "Henry Ford" },
  { text: "Discipline equals freedom.", author: "Jocko Willink" },
  { text: "What you do every day matters more than what you do once in a while.", author: "Gretchen Rubin" },
  { text: "The man who moves a mountain begins by carrying away small stones.", author: "Confucius" },
  { text: "Hard choices, easy life. Easy choices, hard life.", author: "Jerzy Gregorek" },
  { text: "You will never always be motivated. You have to learn to be disciplined.", author: "Anonymous" },
  { text: "Great things are done by a series of small things brought together.", author: "Vincent van Gogh" },
  { text: "Amateurs sit and wait for inspiration. The rest of us just get up and go to work.", author: "Stephen King" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Do the hard jobs first. The easy jobs will take care of themselves.", author: "Dale Carnegie" },
  { text: "Energy and persistence conquer all things.", author: "Benjamin Franklin" },
  { text: "The only way out is through.", author: "Robert Frost" },
  { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
  { text: "If it is important to you, you will find a way. If not, you'll find an excuse.", author: "Ryan Blair" },
  { text: "Well done is better than well said.", author: "Benjamin Franklin" },
  { text: "Slow is smooth, and smooth is fast.", author: "Navy SEAL adage" },
];

function dayOfYear(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  const now = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.floor((now - start) / 86_400_000);
}

/** Deterministic per-day pick so server + client agree and it rotates daily. */
export function quoteForDate(iso: string): Quote {
  const d = new Date(`${iso}T00:00:00Z`);
  const idx = Number.isNaN(d.getTime()) ? 0 : dayOfYear(d) % QUOTES.length;
  return QUOTES[idx];
}
