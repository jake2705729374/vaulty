export type QuoteCategory =
  | "stoic"
  | "religious"
  | "success"
  | "motivation"
  | "mindfulness"
  | "philosophy"
  | "gratitude"
  | "leadership"
  | "love"
  | "wisdom"

export interface Quote {
  text:     string
  author:   string
  category: QuoteCategory
}

export const QUOTES: Quote[] = [
  // Stoic
  { text: "You have power over your mind, not outside events. Realize this, and you will find strength.", author: "Marcus Aurelius", category: "stoic" },
  { text: "We suffer more in imagination than in reality.", author: "Seneca", category: "stoic" },
  { text: "It is not what happens to you, but how you react to it that matters.", author: "Epictetus", category: "stoic" },
  { text: "The impediment to action advances action. What stands in the way becomes the way.", author: "Marcus Aurelius", category: "stoic" },
  { text: "Waste no more time arguing what a good man should be. Be one.", author: "Marcus Aurelius", category: "stoic" },
  { text: "He who fears death will never do anything worthy of a living man.", author: "Seneca", category: "stoic" },

  // Religious
  { text: "Be still and know that I am God.", author: "Psalm 46:10", category: "religious" },
  { text: "For I know the plans I have for you — plans to prosper you and not to harm you.", author: "Jeremiah 29:11", category: "religious" },
  { text: "Whoever relies upon Allah — then He is sufficient for him.", author: "Quran 65:3", category: "religious" },
  { text: "In all your ways acknowledge Him, and He will make your paths straight.", author: "Proverbs 3:6", category: "religious" },
  { text: "Faith is taking the first step even when you don't see the whole staircase.", author: "Martin Luther King Jr.", category: "religious" },
  { text: "Our heart is restless until it finds its rest in Thee.", author: "Augustine of Hippo", category: "religious" },

  // Success
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill", category: "success" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain", category: "success" },
  { text: "Success usually comes to those who are too busy to be looking for it.", author: "Henry David Thoreau", category: "success" },
  { text: "The only limit to our realization of tomorrow is our doubts of today.", author: "Franklin D. Roosevelt", category: "success" },
  { text: "I find that the harder I work, the more luck I seem to have.", author: "Thomas Jefferson", category: "success" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson", category: "success" },

  // Motivation
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela", category: "motivation" },
  { text: "Act as if what you do makes a difference. It does.", author: "William James", category: "motivation" },
  { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe", category: "motivation" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt", category: "motivation" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs", category: "motivation" },
  { text: "Everything you've ever wanted is on the other side of fear.", author: "George Addair", category: "motivation" },

  // Mindfulness
  { text: "The present moment is the only moment available to us, and it is the door to all moments.", author: "Thich Nhat Hanh", category: "mindfulness" },
  { text: "Wherever you are, be all there.", author: "Jim Elliot", category: "mindfulness" },
  { text: "You can't calm the storm. What you can do is calm yourself. The storm will pass.", author: "Timber Hawkeye", category: "mindfulness" },
  { text: "Peace comes from within. Do not seek it without.", author: "Buddha", category: "mindfulness" },
  { text: "Almost everything will work again if you unplug it for a few minutes — including you.", author: "Anne Lamott", category: "mindfulness" },
  { text: "Inhale the future, exhale the past.", author: "Unknown", category: "mindfulness" },

  // Philosophy
  { text: "The unexamined life is not worth living.", author: "Socrates", category: "philosophy" },
  { text: "That which does not kill us makes us stronger.", author: "Friedrich Nietzsche", category: "philosophy" },
  { text: "The only true wisdom is in knowing you know nothing.", author: "Socrates", category: "philosophy" },
  { text: "Man is condemned to be free.", author: "Jean-Paul Sartre", category: "philosophy" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle", category: "philosophy" },
  { text: "The purpose of life is not to be happy. It is to be useful, to be honorable, to be compassionate.", author: "Ralph Waldo Emerson", category: "philosophy" },

  // Gratitude
  { text: "Gratitude turns what we have into enough.", author: "Melody Beattie", category: "gratitude" },
  { text: "When you are grateful, fear disappears and abundance appears.", author: "Tony Robbins", category: "gratitude" },
  { text: "Joy is the simplest form of gratitude.", author: "Karl Barth", category: "gratitude" },
  { text: "Acknowledging the good that you already have in your life is the foundation for all abundance.", author: "Eckhart Tolle", category: "gratitude" },
  { text: "Gratitude is not only the greatest of virtues, but the parent of all others.", author: "Cicero", category: "gratitude" },
  { text: "Enjoy the little things, for one day you may look back and realize they were the big things.", author: "Robert Brault", category: "gratitude" },

  // Leadership
  { text: "A leader is one who knows the way, goes the way, and shows the way.", author: "John C. Maxwell", category: "leadership" },
  { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs", category: "leadership" },
  { text: "Management is doing things right; leadership is doing the right things.", author: "Peter Drucker", category: "leadership" },
  { text: "The function of leadership is to produce more leaders, not more followers.", author: "Ralph Nader", category: "leadership" },
  { text: "Be the change you wish to see in the world.", author: "Mahatma Gandhi", category: "leadership" },
  { text: "The greatest leader is not the one who does the greatest things. He is the one that gets people to do the greatest things.", author: "Ronald Reagan", category: "leadership" },

  // Love
  { text: "The best thing to hold onto in life is each other.", author: "Audrey Hepburn", category: "love" },
  { text: "Being deeply loved by someone gives you strength, while loving someone deeply gives you courage.", author: "Lao Tzu", category: "love" },
  { text: "To love and be loved is to feel the sun from both sides.", author: "David Viscott", category: "love" },
  { text: "Love is patient, love is kind.", author: "1 Corinthians 13:4", category: "love" },
  { text: "The best love is the kind that awakens the soul and makes us reach for more.", author: "Nicholas Sparks", category: "love" },
  { text: "Love is not something you feel. It is something you do.", author: "David Wilkerson", category: "love" },

  // Wisdom
  { text: "Yesterday I was clever, so I wanted to change the world. Today I am wise, so I am changing myself.", author: "Rumi", category: "wisdom" },
  { text: "By three methods we may learn wisdom: reflection, imitation, and experience.", author: "Confucius", category: "wisdom" },
  { text: "Turn your wounds into wisdom.", author: "Oprah Winfrey", category: "wisdom" },
  { text: "The measure of intelligence is the ability to change.", author: "Albert Einstein", category: "wisdom" },
  { text: "Life can only be understood backwards; but it must be lived forwards.", author: "Søren Kierkegaard", category: "wisdom" },
  { text: "Not all those who wander are lost.", author: "J.R.R. Tolkien", category: "wisdom" },
]

export const QUOTE_CATEGORIES: { id: QuoteCategory; label: string; sub: string }[] = [
  { id: "stoic",       label: "Stoic",            sub: "Marcus Aurelius, Seneca & Epictetus" },
  { id: "religious",   label: "Faith & Belief",   sub: "Scripture and sacred wisdom" },
  { id: "success",     label: "Success",          sub: "Driven quotes from the world's best" },
  { id: "motivation",  label: "Motivation",       sub: "Fuel to push through any obstacle" },
  { id: "mindfulness", label: "Mindfulness",      sub: "Present-moment calm and clarity" },
  { id: "philosophy",  label: "Philosophy",       sub: "Deep thoughts, timeless ideas" },
  { id: "gratitude",   label: "Gratitude",        sub: "Appreciation and abundance" },
  { id: "leadership",  label: "Leadership",       sub: "Lessons from great leaders" },
  { id: "love",        label: "Love",             sub: "Heart-opening perspectives" },
  { id: "wisdom",      label: "Wisdom",           sub: "Timeless truths about life" },
]

/** Pick a stable daily quote from the given categories (or all if none selected). */
export function getDailyQuote(selectedCategories: QuoteCategory[]): Quote {
  const pool =
    selectedCategories.length > 0
      ? QUOTES.filter((q) => selectedCategories.includes(q.category))
      : QUOTES
  const dayIndex = Math.floor(Date.now() / 86_400_000)
  return pool[dayIndex % pool.length]
}
