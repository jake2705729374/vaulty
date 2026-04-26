/**
 * lib/prompts/journaling.ts
 *
 * Journaling prompt bank + personalised daily picker.
 * Prompts are tagged by goal, situation, and mood group so the engine
 * can surface contextually relevant ones.
 *
 * Bank size: 470 prompts across 19 categories.
 */

// ── Mood groups ───────────────────────────────────────────────────────────────
const POSITIVE_MOODS = ["GREAT", "GOOD"]
const NEUTRAL_MOODS  = ["OKAY"]
const LOW_MOODS      = ["LOW", "AWFUL"]

// ── Prompt bank ───────────────────────────────────────────────────────────────
interface JournalingPrompt {
  text:         string
  goals?:       string[]   // matches UserPreferences.journalingGoals values
  situations?:  string[]   // matches coachLifeContext.situations
  moods?:       string[]   // "positive" | "neutral" | "low"
  weight?:      number     // higher = more likely to appear (default 1)
}

const PROMPT_BANK: JournalingPrompt[] = [

  // ── Gratitude ─────────────────────────────────────────────────────────────
  { text: "What are three small things that brought you joy or relief today?",                              goals: ["gratitude"], weight: 2 },
  { text: "Who or what are you most grateful for right now — and why?",                                    goals: ["gratitude"] },
  { text: "Describe a moment this week when you felt genuinely content.",                                  goals: ["gratitude"], moods: ["positive", "neutral"] },
  { text: "What's something you often overlook but would truly miss?",                                     goals: ["gratitude"] },
  { text: "Write a thank-you note to yourself for something you did recently.",                            goals: ["gratitude", "personal_growth"] },
  { text: "What's a simple pleasure you experienced today that you almost missed?",                        goals: ["gratitude"] },
  { text: "Who made your life easier this week, even in a small or invisible way?",                        goals: ["gratitude"] },
  { text: "What's something about your body you're grateful for right now?",                               goals: ["gratitude", "emotional_wellbeing"] },
  { text: "Name five things in your home that make your daily life better.",                               goals: ["gratitude"] },
  { text: "What skill or ability do you take for granted that others might envy?",                         goals: ["gratitude"] },
  { text: "What's the best piece of advice you ever received — and from whom?",                            goals: ["gratitude", "personal_growth"] },
  { text: "What's a challenge you've overcome that you're now grateful for?",                              goals: ["gratitude", "personal_growth"] },
  { text: "Describe the last time someone's kindness caught you completely off guard.",                    goals: ["gratitude"] },
  { text: "What's something about your past self you're grateful to have grown from?",                     goals: ["gratitude", "personal_growth"] },
  { text: "Who shaped who you are today, even without realising it?",                                      goals: ["gratitude"] },
  { text: "What's something you once desperately wanted that you now simply have?",                        goals: ["gratitude"] },
  { text: "Write about a place that always lifts your spirits — what is it about that place?",             goals: ["gratitude", "creativity"] },
  { text: "What's a memory you return to when you need comfort?",                                          goals: ["gratitude"] },
  { text: "What's something about today's world that you're glad you get to experience?",                  goals: ["gratitude"] },
  { text: "What's a relationship in your life that has quietly made you better?",                          goals: ["gratitude"] },
  { text: "What's something difficult that turned out to be a gift?",                                      goals: ["gratitude", "personal_growth"] },
  { text: "What small, daily ritual are you grateful for?",                                                goals: ["gratitude", "habit_tracking"] },
  { text: "Who deserves more of your appreciation than they currently receive?",                           goals: ["gratitude"] },
  { text: "What book, song, or piece of art changed something in you?",                                    goals: ["gratitude", "creativity"] },
  { text: "What season, weather, or natural moment fills you with appreciation?",                          goals: ["gratitude"] },
  { text: "What made you laugh this week — really laugh?",                                                 goals: ["gratitude"], moods: ["positive"] },
  { text: "What aspect of your current life would a past version of you be amazed by?",                   goals: ["gratitude", "personal_growth"] },
  { text: "Write about someone who believed in you when you didn't believe in yourself.",                  goals: ["gratitude"] },
  { text: "What's a 'boring' part of your routine that you'd genuinely miss if it were gone?",             goals: ["gratitude", "habit_tracking"] },
  { text: "What does abundance look like in your life right now — even in small ways?",                    goals: ["gratitude"], weight: 2 },

  // ── Mental clarity ────────────────────────────────────────────────────────
  { text: "What's been occupying your mind the most lately? Write it all out.",                            goals: ["mental_clarity"], weight: 2 },
  { text: "If you could clear one mental burden today, what would it be?",                                 goals: ["mental_clarity"] },
  { text: "Brain-dump everything on your plate right now — no filter, just list it.",                      goals: ["mental_clarity"], weight: 2 },
  { text: "What's one decision you've been avoiding? What's really holding you back?",                     goals: ["mental_clarity"] },
  { text: "Describe your ideal mental state. What would have to be true to feel that way?",                goals: ["mental_clarity"] },
  { text: "What's taking up space in your head that you haven't dealt with?",                              goals: ["mental_clarity"] },
  { text: "List every worry you have right now. Then mark the ones you actually control.",                 goals: ["mental_clarity"], weight: 2 },
  { text: "What's the one thing, if resolved, would make everything else feel lighter?",                   goals: ["mental_clarity"], weight: 2 },
  { text: "What story are you telling yourself that might not be true?",                                   goals: ["mental_clarity", "personal_growth"] },
  { text: "What do you need to stop thinking about — and what would help you let it go?",                  goals: ["mental_clarity"] },
  { text: "What's the gap between how things are and how you want them to be?",                            goals: ["mental_clarity"] },
  { text: "If your mind were a room right now, how would you describe it?",                                goals: ["mental_clarity", "creativity"] },
  { text: "What's something you've been overthinking? Write out every thread until it's quiet.",           goals: ["mental_clarity"], weight: 2 },
  { text: "What would you do today if fear weren't a factor?",                                             goals: ["mental_clarity", "personal_growth"] },
  { text: "What's the loudest voice in your head saying lately? Is it telling the truth?",                 goals: ["mental_clarity"] },
  { text: "What do you need to give yourself permission to release?",                                      goals: ["mental_clarity", "emotional_wellbeing"] },
  { text: "Finish this sentence 10 times: 'Right now I'm worried about…'",                                 goals: ["mental_clarity"], weight: 2 },
  { text: "What are you ruminating on that would be better handled with action?",                          goals: ["mental_clarity"] },
  { text: "What assumption are you carrying that has never actually been tested?",                         goals: ["mental_clarity", "personal_growth"] },
  { text: "What would 'mental freedom' look and feel like for you?",                                       goals: ["mental_clarity"] },
  { text: "What are you saying yes to that you really want to say no to?",                                 goals: ["mental_clarity", "personal_growth"] },
  { text: "What clutters your mind most often — tasks, people, memories, or fears?",                       goals: ["mental_clarity"] },
  { text: "Write a pros and cons list for the decision you can't stop thinking about.",                    goals: ["mental_clarity"] },
  { text: "What's the most important thing that needs your attention right now?",                          goals: ["mental_clarity"], weight: 2 },
  { text: "What do you already know the answer to, but are avoiding admitting?",                           goals: ["mental_clarity", "personal_growth"] },
  { text: "What would your wisest, calmest self tell you right now?",                                      goals: ["mental_clarity", "emotional_wellbeing"] },
  { text: "What's a problem you can break into three smaller, manageable pieces?",                         goals: ["mental_clarity"] },
  { text: "What's one thing you can do in the next 24 hours to feel lighter?",                             goals: ["mental_clarity"] },
  { text: "Where is your mental energy going that you didn't consciously choose?",                         goals: ["mental_clarity"] },
  { text: "What would change if you stopped second-guessing yourself for one week?",                       goals: ["mental_clarity", "personal_growth"] },

  // ── Emotional wellbeing ───────────────────────────────────────────────────
  { text: "How are you really feeling today — beneath the surface?",                                       goals: ["emotional_wellbeing"], weight: 2 },
  { text: "What emotion has shown up most this week? Where do you think it's coming from?",                goals: ["emotional_wellbeing"] },
  { text: "Write to your past self from six months ago. What do you want them to know?",                   goals: ["emotional_wellbeing", "personal_growth"] },
  { text: "What does your body need right now that you haven't given it?",                                 goals: ["emotional_wellbeing"] },
  { text: "What are you allowing to affect your peace that you actually have the power to change?",        goals: ["emotional_wellbeing"] },
  { text: "Name the emotion you've been avoiding this week. What is it trying to tell you?",               goals: ["emotional_wellbeing"] },
  { text: "What does your heart need to hear that your head keeps overriding?",                            goals: ["emotional_wellbeing"] },
  { text: "Where in your body do you carry your stress? Write directly to that place.",                    goals: ["emotional_wellbeing"] },
  { text: "What's something you haven't allowed yourself to feel yet?",                                    goals: ["emotional_wellbeing"] },
  { text: "When did you last feel truly safe and at ease? What was different?",                            goals: ["emotional_wellbeing"] },
  { text: "What would you do if you weren't trying to hold it all together?",                              goals: ["emotional_wellbeing"] },
  { text: "Describe a moment this week when your emotions surprised you.",                                 goals: ["emotional_wellbeing"] },
  { text: "What are you quietly mourning right now, even if no one around you knows?",                     goals: ["emotional_wellbeing"] },
  { text: "What's the difference between how you feel and how you're presenting yourself?",                goals: ["emotional_wellbeing"] },
  { text: "What part of yourself have you been neglecting lately?",                                        goals: ["emotional_wellbeing"] },
  { text: "Write a letter to the version of you who's struggling right now.",                              goals: ["emotional_wellbeing"] },
  { text: "What's something you feel but don't know how to put into words?",                               goals: ["emotional_wellbeing", "creativity"] },
  { text: "What would it feel like to stop fighting how you feel and just let it be?",                     goals: ["emotional_wellbeing"] },
  { text: "What's draining your emotional battery the most right now?",                                    goals: ["emotional_wellbeing"] },
  { text: "When did you last cry? What was it really about?",                                              goals: ["emotional_wellbeing"] },
  { text: "What are you holding onto that's hurting you more than it's helping?",                          goals: ["emotional_wellbeing"] },
  { text: "What does your inner child need from you right now?",                                           goals: ["emotional_wellbeing"] },
  { text: "What emotion is underneath the one you're showing the world?",                                  goals: ["emotional_wellbeing"] },
  { text: "Write about a time you surprised yourself with your own emotional strength.",                   goals: ["emotional_wellbeing", "personal_growth"] },
  { text: "What's the most compassionate thing you could do for yourself today?",                          goals: ["emotional_wellbeing"] },
  { text: "How do you typically respond to feeling overwhelmed — and does it actually help?",              goals: ["emotional_wellbeing"] },
  { text: "What boundary would protect your emotional health that you haven't set yet?",                   goals: ["emotional_wellbeing"] },
  { text: "What does it mean to you to feel emotionally free?",                                            goals: ["emotional_wellbeing"] },
  { text: "If your emotions sent you a message today, what would they say?",                               goals: ["emotional_wellbeing"] },
  { text: "What does healing look like in practical, daily terms for you?",                                goals: ["emotional_wellbeing"], weight: 2 },

  // ── Personal growth ───────────────────────────────────────────────────────
  { text: "What's one thing you did this week that you're proud of — however small?",                      goals: ["personal_growth"], weight: 2 },
  { text: "What would you do differently if you knew you couldn't fail?",                                  goals: ["personal_growth"] },
  { text: "Describe the person you're becoming. Does your current life reflect that?",                     goals: ["personal_growth"] },
  { text: "What's a belief about yourself that you're ready to let go of?",                                goals: ["personal_growth"] },
  { text: "What are you learning about yourself right now?",                                               goals: ["personal_growth"] },
  { text: "What does success mean to you this year — not to anyone else, just you?",                       goals: ["personal_growth"] },
  { text: "What version of yourself are you most afraid of becoming?",                                     goals: ["personal_growth"] },
  { text: "What habit or behaviour have you outgrown that you're still carrying?",                         goals: ["personal_growth"] },
  { text: "What's the gap between who you are today and who you want to be?",                              goals: ["personal_growth"] },
  { text: "What one change would have the biggest ripple effect in your life?",                             goals: ["personal_growth"], weight: 2 },
  { text: "What's a compliment you consistently struggle to accept about yourself?",                       goals: ["personal_growth"] },
  { text: "What are you pretending is fine when it isn't?",                                                goals: ["personal_growth", "mental_clarity"] },
  { text: "Write about a time you grew most through discomfort.",                                          goals: ["personal_growth"] },
  { text: "What would you regret not doing or saying five years from now?",                                goals: ["personal_growth"] },
  { text: "What standard do you hold others to that you don't hold for yourself?",                         goals: ["personal_growth"] },
  { text: "What does the best version of your daily life actually look like?",                             goals: ["personal_growth"] },
  { text: "What are you tolerating that's keeping you small?",                                             goals: ["personal_growth"] },
  { text: "Who do you admire most — and what specifically about them do you want to develop?",             goals: ["personal_growth"] },
  { text: "What's one way you've grown in the last year that you rarely acknowledge?",                     goals: ["personal_growth"] },
  { text: "What's something that used to scare you that no longer does?",                                  goals: ["personal_growth"] },
  { text: "What story do you keep telling about why you can't have what you want?",                        goals: ["personal_growth", "mental_clarity"] },
  { text: "What area of life have you been coasting in that deserves more of you?",                        goals: ["personal_growth"] },
  { text: "What skill would change your life if you gave it 30 minutes a day?",                            goals: ["personal_growth", "habit_tracking"] },
  { text: "What does your future self thank you for doing today?",                                         goals: ["personal_growth"], weight: 2 },
  { text: "Where do you most resist feedback — and what does that tell you?",                              goals: ["personal_growth"] },
  { text: "What's a mistake you've made twice that you're determined not to make again?",                  goals: ["personal_growth"] },
  { text: "What would you do if you truly, deeply believed you were enough?",                              goals: ["personal_growth"] },
  { text: "How have your values shifted in the last few years?",                                           goals: ["personal_growth"] },
  { text: "What part of your personality are you still discovering?",                                      goals: ["personal_growth"] },
  { text: "What's a difficult conversation you've been putting off that would actually help?",             goals: ["personal_growth"] },
  { text: "What does courage look like in your everyday life right now?",                                  goals: ["personal_growth"] },
  { text: "What's something you know you should do but keep making excuses about?",                        goals: ["personal_growth"] },
  { text: "What does it mean to live with integrity in your specific life?",                               goals: ["personal_growth"] },
  { text: "What would you attempt if you weren't worried about what people think?",                        goals: ["personal_growth"] },
  { text: "Write a job description for the person you're actively working to become.",                     goals: ["personal_growth", "creativity"] },
  { text: "What's the kindest, most honest thing you could say to yourself right now?",                    goals: ["personal_growth", "emotional_wellbeing"] },
  { text: "What fear is keeping you comfortable in a place you've already outgrown?",                      goals: ["personal_growth"] },
  { text: "What would living more boldly look like in your everyday choices?",                             goals: ["personal_growth"] },
  { text: "What's something about your character you've only recently started to appreciate?",             goals: ["personal_growth"] },
  { text: "What does the next version of yourself need you to start doing today?",                         goals: ["personal_growth"], weight: 2 },

  // ── Creativity ────────────────────────────────────────────────────────────
  { text: "If your life were a story, what chapter are you in right now?",                                 goals: ["creativity"], weight: 2 },
  { text: "Describe today using only sensory details — no emotions, just what you saw, heard, felt.",      goals: ["creativity"] },
  { text: "Write about a dream you've been too afraid to say out loud.",                                   goals: ["creativity"] },
  { text: "If you could live one day completely differently, what would it look like?",                    goals: ["creativity"] },
  { text: "What idea has been quietly knocking on the door of your mind lately?",                          goals: ["creativity"] },
  { text: "Describe the colour of your mood today.",                                                       goals: ["creativity"] },
  { text: "If your life were a film right now, what genre would it be?",                                   goals: ["creativity"] },
  { text: "Write a letter from ten years in the future — what does that version of you want you to know?", goals: ["creativity"] },
  { text: "Describe your ideal ordinary Tuesday.",                                                         goals: ["creativity"] },
  { text: "If you could design your perfect week, what would it look like hour by hour?",                  goals: ["creativity"] },
  { text: "Write about a place you've never been but feel inexplicably drawn to.",                         goals: ["creativity"] },
  { text: "If your biggest challenge had a physical shape and weight, what would it be?",                  goals: ["creativity"] },
  { text: "Write three alternate lives you could plausibly be living right now.",                          goals: ["creativity"] },
  { text: "Describe a version of your future that genuinely excites you — in as much detail as possible.", goals: ["creativity"] },
  { text: "If your life this week had a theme song, what would it be and why?",                            goals: ["creativity"] },
  { text: "Write a short story about someone who makes the decision you've been afraid to make.",          goals: ["creativity"] },
  { text: "Imagine you're being interviewed in 20 years about your life. What do you say?",                goals: ["creativity"] },
  { text: "What would a documentary about your last month look like?",                                     goals: ["creativity"] },
  { text: "Write about a conversation you'd have with your 80-year-old self.",                             goals: ["creativity"] },
  { text: "If your current chapter had a title, what would you call it?",                                  goals: ["creativity"] },
  { text: "Describe a memory as vividly as possible — every detail you can still recall.",                 goals: ["creativity"] },
  { text: "If you could change one thing about the world, what would it be and why?",                      goals: ["creativity"] },
  { text: "Write about the last thing that genuinely surprised you.",                                      goals: ["creativity"] },
  { text: "What's a question you keep returning to that you can't fully answer?",                          goals: ["creativity"] },
  { text: "If your current emotional state were a weather system, describe it in detail.",                 goals: ["creativity", "emotional_wellbeing"] },
  { text: "Write a short letter to someone who has never met you, describing your life.",                  goals: ["creativity"] },
  { text: "If you could give your current self one symbol or object as a guide, what would it be?",        goals: ["creativity"] },
  { text: "Describe your perfect creative afternoon — no obligations, no interruptions.",                  goals: ["creativity"] },
  { text: "What's a metaphor that perfectly describes where you are in life right now?",                   goals: ["creativity"] },
  { text: "Write about a world where you made a completely different choice at a key crossroads.",         goals: ["creativity"] },

  // ── Habit tracking ────────────────────────────────────────────────────────
  { text: "Which habit are you most proud of keeping up? What keeps you going?",                           goals: ["habit_tracking"], weight: 2 },
  { text: "Rate your week on sleep, movement, and nourishment. What pattern do you notice?",               goals: ["habit_tracking"] },
  { text: "What's one tiny change you could make tomorrow that your future self would thank you for?",     goals: ["habit_tracking"] },
  { text: "Where did your energy go this week? Was it spent on what matters to you?",                      goals: ["habit_tracking"] },
  { text: "What habit are you currently building, and how is it going — honestly?",                        goals: ["habit_tracking"] },
  { text: "What's one routine that's been slipping lately? What actually got in the way?",                 goals: ["habit_tracking"] },
  { text: "How many days this week did you do something genuinely good for your body?",                    goals: ["habit_tracking"] },
  { text: "What time of day do you feel most like yourself? Are you protecting that time?",                goals: ["habit_tracking"] },
  { text: "What habit do you keep restarting? What's really blocking it this time?",                       goals: ["habit_tracking"] },
  { text: "Write about your morning routine. Does it set you up well or just get you moving?",             goals: ["habit_tracking"] },
  { text: "What did you consume this week — food, content, relationships — and how did each make you feel?", goals: ["habit_tracking"] },
  { text: "If you tracked your screen time honestly, what would you find — and how do you feel about it?", goals: ["habit_tracking"] },
  { text: "What healthy habit did you let drop during stress that you want back?",                         goals: ["habit_tracking"] },
  { text: "What does your body tell you when you're off-track?",                                           goals: ["habit_tracking", "emotional_wellbeing"] },
  { text: "What's one boundary around your time that you've actually kept this week?",                     goals: ["habit_tracking"] },
  { text: "How did you sleep this week — really? What affected it?",                                       goals: ["habit_tracking"] },
  { text: "What did you do purely for enjoyment this week, with no productivity attached?",                goals: ["habit_tracking"] },
  { text: "Where does discipline show up in your life — and where does it consistently collapse?",         goals: ["habit_tracking"] },
  { text: "What would your ideal week look like as a set of daily habits?",                                goals: ["habit_tracking"] },
  { text: "What habit do you watch others maintain that you want for yourself?",                           goals: ["habit_tracking"] },
  { text: "What's the first thing you do when you wake up? Does it serve you?",                            goals: ["habit_tracking"] },
  { text: "Write about a time a small, consistent action led to a surprisingly big result.",               goals: ["habit_tracking", "personal_growth"] },
  { text: "What habit, if dropped tomorrow, would you feel the most?",                                     goals: ["habit_tracking"] },
  { text: "What does 'taking care of yourself' actually mean in practice for you right now?",              goals: ["habit_tracking", "emotional_wellbeing"] },
  { text: "What habits do you maintain when life is easy that fall away when things get hard?",            goals: ["habit_tracking"] },

  // ── Situation: stress / major decision ────────────────────────────────────
  { text: "Write out both sides of the decision you're facing. Which feels truer to you?",                 situations: ["Major decision"] },
  { text: "What would you tell a close friend who was in your exact situation right now?",                  situations: ["Stress", "Major decision"], weight: 2 },
  { text: "What is within your control today? What are you ready to release?",                             situations: ["Stress"] },
  { text: "Name the biggest source of stress right now. What's one small step you could take?",            situations: ["Stress"], weight: 2 },
  { text: "What would happen if you did nothing? Is that actually an option?",                             situations: ["Major decision", "Stress"] },
  { text: "What does your gut say — the part of you that already knows?",                                  situations: ["Major decision"] },
  { text: "What's the worst realistic outcome? Can you live with it?",                                     situations: ["Major decision", "Stress"] },
  { text: "What's the best realistic outcome? What would it take to get there?",                           situations: ["Major decision"] },
  { text: "Who has navigated something similar? What can you learn from them?",                            situations: ["Major decision", "Stress"] },
  { text: "What are you catastrophising that's unlikely to actually happen?",                              situations: ["Stress"] },
  { text: "When have you been under this kind of pressure before — and how did it resolve?",               situations: ["Stress"] },
  { text: "What do you need to decide in the next 24 hours vs. what can wait?",                            situations: ["Major decision", "Stress"] },
  { text: "What would make this decision feel easier? Is that something you can create?",                  situations: ["Major decision"] },
  { text: "What are you afraid of admitting about this situation?",                                        situations: ["Stress", "Major decision"] },
  { text: "What has stress been costing you — in your body, your relationships, your work?",               situations: ["Stress"] },
  { text: "Write about the version of your life where you made the brave choice.",                         situations: ["Major decision"], goals: ["creativity"] },
  { text: "What would you do if the people who might judge you couldn't see?",                             situations: ["Major decision"] },
  { text: "What's the difference between what you think you should do and what you want to do?",           situations: ["Major decision"] },
  { text: "Write out every fear about this decision. Then ask: is each one real or imagined?",             situations: ["Major decision"] },
  { text: "If this stress had a message for you, what would it be?",                                       situations: ["Stress"] },

  // ── Situation: relationships ───────────────────────────────────────────────
  { text: "How are your closest relationships making you feel right now?",                                 situations: ["Relationship change", "Breakup"] },
  { text: "What do you need from the people around you that you haven't asked for?",                       situations: ["Relationship change"] },
  { text: "Write about a conversation you wish you could have.",                                           situations: ["Breakup", "Relationship change"] },
  { text: "Who in your life makes you feel most like yourself?",                                           situations: ["Relationship change"] },
  { text: "Is there a relationship you're staying in out of habit rather than genuine connection?",        situations: ["Relationship change", "Breakup"] },
  { text: "What would you like someone close to you to understand about you right now?",                   situations: ["Relationship change"] },
  { text: "What pattern keeps showing up in your relationships that you want to change?",                  situations: ["Relationship change", "Breakup"] },
  { text: "Write about a friendship that has meant more to you than you've ever expressed.",               situations: ["Relationship change"] },
  { text: "How do you show up in relationships when things get hard?",                                     situations: ["Relationship change", "Breakup"] },
  { text: "What do you give in relationships that you rarely receive?",                                    situations: ["Relationship change"] },
  { text: "What's something you're afraid to ask for in your most important relationship?",                situations: ["Relationship change"] },
  { text: "Who challenges you to be better — and do you appreciate them for it?",                         situations: ["Relationship change"] },
  { text: "What's a conflict you've been avoiding? What do you fear about that conversation?",             situations: ["Relationship change", "Breakup"] },
  { text: "Write about someone who recently showed up for you. Did you let them in?",                      situations: ["Relationship change"] },
  { text: "What does love look and feel like in your daily life right now?",                               situations: ["Relationship change", "Breakup"] },
  { text: "What kind of friend, partner, or family member do you want to be — and are you there?",        situations: ["Relationship change"] },
  { text: "What resentment are you still carrying that's heavier than the original event deserves?",       situations: ["Breakup", "Relationship change"] },
  { text: "How do you behave when you feel disconnected from someone you love?",                           situations: ["Relationship change", "Breakup"] },
  { text: "What relationship in your life needs more tending than you've been giving?",                    situations: ["Relationship change"] },
  { text: "What does the relationship dynamic you want actually look like, in concrete terms?",            situations: ["Relationship change", "Breakup"] },

  // ── Situation: grief / health ──────────────────────────────────────────────
  { text: "What has grief been teaching you, even when it's hard to receive?",                             situations: ["Grief"] },
  { text: "What does your body need today? How are you honouring that?",                                   situations: ["Health journey", "Grief"] },
  { text: "What does healing look like for you right now?",                                                 situations: ["Grief", "Health journey"] },
  { text: "What's the hardest part of what you're going through right now?",                               situations: ["Grief", "Health journey"] },
  { text: "Write to the version of you who was whole before this loss or change.",                         situations: ["Grief"] },
  { text: "What are people getting wrong about what you need right now?",                                  situations: ["Grief", "Health journey"] },
  { text: "What's a small way you've been kind to yourself through this hard time?",                       situations: ["Grief", "Health journey"] },
  { text: "What does grief feel like in your body today?",                                                 situations: ["Grief"] },
  { text: "What do you wish someone would ask you about what you're going through?",                       situations: ["Grief", "Health journey"] },
  { text: "When did you last feel okay — and what does 'okay' even mean now?",                             situations: ["Grief", "Health journey"] },
  { text: "What are you allowing yourself to feel, and what are you still pushing away?",                  situations: ["Grief"] },
  { text: "Write about a moment of unexpected peace in the middle of this hard time.",                     situations: ["Grief", "Health journey"] },
  { text: "What's one thing that's helped more than you expected?",                                        situations: ["Grief", "Health journey"] },
  { text: "How has this experience changed what you care about?",                                          situations: ["Grief", "Health journey"] },
  { text: "Write a letter to the person or part of life you lost.",                                        situations: ["Grief"] },
  { text: "What does your body know that your mind hasn't fully accepted yet?",                            situations: ["Grief", "Health journey"] },
  { text: "What does rest look like for you right now — not sleep, but true rest?",                        situations: ["Health journey", "Grief"] },
  { text: "Who has surprised you with their support through this?",                                        situations: ["Grief", "Health journey"] },
  { text: "What are you learning about your own resilience?",                                              situations: ["Grief", "Health journey"] },
  { text: "What would it mean to move forward without leaving behind?",                                    situations: ["Grief"] },

  // ── Situation: new chapter ─────────────────────────────────────────────────
  { text: "What are you most excited and most nervous about with this new beginning?",                     situations: ["New job", "Major Transition"] },
  { text: "What do you want to carry forward from your last chapter into this one?",                       situations: ["New job", "Major Transition"] },
  { text: "What does the version of you who thrives in this new role look like?",                          situations: ["New job"] },
  { text: "What do you want this chapter to be about, in one sentence?",                                   situations: ["Major Transition", "New job"] },
  { text: "What habits or patterns are you consciously leaving behind as you begin this?",                 situations: ["New job", "Major Transition"] },
  { text: "Write about the moment you knew things were going to change.",                                  situations: ["Major Transition"] },
  { text: "What does 'starting over' feel like — and how do you honestly feel about it?",                  situations: ["Major Transition"] },
  { text: "What's the scariest part of where you're headed?",                                              situations: ["New job", "Major Transition"] },
  { text: "What's the most exciting part of where you're headed?",                                         situations: ["New job", "Major Transition"] },
  { text: "What would you want to say to yourself at the end of this chapter?",                            situations: ["Major Transition", "New job"] },
  { text: "Who do you want in your corner for this new phase?",                                            situations: ["New job", "Major Transition"] },
  { text: "What does success look like 12 months into this new beginning?",                                situations: ["New job", "Major Transition"] },
  { text: "What would help you feel more ready than you do right now?",                                    situations: ["New job", "Major Transition"] },
  { text: "What are you releasing so something new can enter?",                                            situations: ["Major Transition"] },
  { text: "What's the first small step into this chapter that you can take today?",                        situations: ["New job", "Major Transition"] },
  { text: "Write about the last time you started something new. What did that feel like?",                 situations: ["New job", "Major Transition"] },
  { text: "What version of yourself do you want to meet on the other side of this transition?",            situations: ["Major Transition"] },
  { text: "What would you want your future self to know about why you chose this path?",                   situations: ["New job", "Major Transition"] },
  { text: "What does belonging feel like in this new context?",                                            situations: ["New job"] },
  { text: "What's a new beginning you didn't choose — and how are you finding meaning in it?",             situations: ["Major Transition"] },

  // ── Mood-aware: positive ──────────────────────────────────────────────────
  { text: "You seem to be in a good place lately. What's been working?",                                   moods: ["positive"], weight: 2 },
  { text: "What's contributing to the positive momentum in your life right now?",                          moods: ["positive"] },
  { text: "What's the best thing that happened this week?",                                                moods: ["positive"] },
  { text: "When did you last feel genuinely proud of yourself? Sit with that feeling.",                    moods: ["positive"] },
  { text: "What's something you accomplished recently that you haven't properly celebrated?",              moods: ["positive"] },
  { text: "Write about someone who's making your life better right now.",                                  moods: ["positive"] },
  { text: "What good thing is actually sticking? What does that tell you about yourself?",                 moods: ["positive"] },
  { text: "Describe a moment of flow — when you were completely absorbed in something.",                   moods: ["positive"] },
  { text: "What does joy feel like in your body? When did you last feel it?",                              moods: ["positive"] },
  { text: "What are you most looking forward to in the next week?",                                        moods: ["positive"] },
  { text: "What's going better than you expected?",                                                        moods: ["positive"] },
  { text: "Write about a connection or conversation that left you feeling genuinely energised.",            moods: ["positive"] },
  { text: "What's something you want to preserve about how you're living right now?",                      moods: ["positive"] },
  { text: "What's something that used to feel hard that now feels natural?",                               moods: ["positive", "neutral"] },
  { text: "If this good energy had a source, what would it be?",                                           moods: ["positive"] },

  // ── Mood-aware: low ───────────────────────────────────────────────────────
  { text: "Today feels heavy. What's one thing — just one — that you can do for yourself?",                moods: ["low"], weight: 2 },
  { text: "It's okay to not be okay. What do you need to hear most right now?",                            moods: ["low"] },
  { text: "What's one thing you're looking forward to, even if it feels very small?",                      moods: ["low", "neutral"] },
  { text: "On a hard day, what's one thing that's still true and good?",                                   moods: ["low"] },
  { text: "What does 'getting through today' look like for you?",                                          moods: ["low"] },
  { text: "What would you tell a friend who was feeling exactly how you feel right now?",                  moods: ["low"] },
  { text: "What's the smallest kind thing you could do for yourself in the next hour?",                    moods: ["low"], weight: 2 },
  { text: "What's weighing on you that you haven't said out loud?",                                        moods: ["low"] },
  { text: "What would true rest — not just sleep — look like for you today?",                              moods: ["low"] },
  { text: "When did you last feel okay? What was different then?",                                         moods: ["low", "neutral"] },
  { text: "What does your body need right now, and are you listening to it?",                              moods: ["low"] },
  { text: "Write about something that made today worth getting through.",                                  moods: ["low"] },
  { text: "What's one thing you don't have to do today that you've been telling yourself you must?",       moods: ["low"] },
  { text: "What are you carrying that's not actually yours to carry?",                                     moods: ["low"] },
  { text: "If this low feeling could speak, what would it say — and what would you say back?",             moods: ["low"] },

  // ── Work & purpose ────────────────────────────────────────────────────────
  { text: "What does meaningful work feel like for you — and are you doing it?",                           goals: ["personal_growth"] },
  { text: "What would you do with your time if money weren't a factor?",                                   goals: ["personal_growth", "creativity"] },
  { text: "Write about a project or task that absorbed you completely. What made it different?",           goals: ["personal_growth"] },
  { text: "What's something at work that's been draining you more than it should?",                        goals: ["mental_clarity"] },
  { text: "What does ambition look like in your life right now?",                                          goals: ["personal_growth"] },
  { text: "What legacy do you want to leave in your work?",                                                goals: ["personal_growth"] },
  { text: "Write about a moment you felt truly useful or genuinely impactful.",                            goals: ["personal_growth"] },
  { text: "What's the difference between the work you do and the work you want to do?",                    goals: ["personal_growth", "mental_clarity"] },
  { text: "What does 'enough' look like in your career or sense of purpose?",                              goals: ["personal_growth"] },
  { text: "What would you build, create, or start if you knew people would value it?",                     goals: ["personal_growth", "creativity"] },
  { text: "What parts of your work bring you life — and what parts consistently drain it?",                goals: ["mental_clarity"] },
  { text: "Write about a time you felt proud of your work.",                                               goals: ["personal_growth"] },
  { text: "What does a fulfilling workday feel and look like for you?",                                    goals: ["personal_growth"] },
  { text: "What's a professional risk you've been too cautious to take?",                                  goals: ["personal_growth"] },
  { text: "How would you describe your relationship with ambition right now?",                             goals: ["personal_growth"] },
  { text: "What does your work say about what you actually value?",                                        goals: ["personal_growth"] },
  { text: "What project or goal would you regret not pursuing?",                                           goals: ["personal_growth"] },
  { text: "What would it mean to do your work with more presence and less urgency?",                       goals: ["personal_growth", "mental_clarity"] },
  { text: "What's the next thing you want to learn — and what's honestly stopping you?",                   goals: ["personal_growth"] },
  { text: "Write about what 'doing good work' means to you — separate from being seen for it.",            goals: ["personal_growth"] },

  // ── Self-reflection ───────────────────────────────────────────────────────
  { text: "Who are you when no one is watching?",                                                          goals: ["personal_growth", "emotional_wellbeing"] },
  { text: "What are three words people who know you best would use to describe you?",                      goals: ["personal_growth"] },
  { text: "What are three words you would use to describe yourself — honestly?",                           goals: ["personal_growth"] },
  { text: "What's the gap between how others see you and how you see yourself?",                           goals: ["personal_growth", "emotional_wellbeing"] },
  { text: "What's something about yourself you've never told anyone?",                                     goals: ["emotional_wellbeing"] },
  { text: "What does your relationship with yourself look like right now?",                                goals: ["personal_growth", "emotional_wellbeing"] },
  { text: "What part of yourself are you most at peace with?",                                             goals: ["personal_growth"] },
  { text: "What part of yourself are you still learning to accept?",                                       goals: ["personal_growth", "emotional_wellbeing"] },
  { text: "What's a quality you have that you once saw as a weakness?",                                    goals: ["personal_growth"] },
  { text: "How have you changed in the last three years?",                                                 goals: ["personal_growth"] },
  { text: "What does it mean to be authentic for you — in practice, not in theory?",                       goals: ["personal_growth"] },
  { text: "What are you most afraid of about being truly known?",                                          goals: ["emotional_wellbeing"] },
  { text: "What's a contradiction you hold — two things that are both true about you?",                    goals: ["personal_growth", "creativity"] },
  { text: "What does solitude feel like for you? Do you crave it or resist it?",                           goals: ["emotional_wellbeing"] },
  { text: "What's your relationship with failure right now?",                                              goals: ["personal_growth"] },
  { text: "What masks do you wear in different areas of your life?",                                       goals: ["personal_growth"] },
  { text: "What would you do with your life if other people's opinions simply didn't exist?",              goals: ["personal_growth"] },
  { text: "What does self-respect look like in your daily choices?",                                       goals: ["personal_growth"] },
  { text: "Write about a time you chose yourself over what was expected.",                                 goals: ["personal_growth"] },
  { text: "What's something that used to define you that no longer does?",                                 goals: ["personal_growth"] },
  { text: "What's a part of your story you're still making sense of?",                                    goals: ["personal_growth", "emotional_wellbeing"] },
  { text: "If you could observe yourself from the outside for a day, what would you notice?",              goals: ["personal_growth", "creativity"] },
  { text: "What's a question you're afraid to ask yourself?",                                              goals: ["personal_growth"] },
  { text: "What do you owe yourself that you haven't given yet?",                                          goals: ["personal_growth"] },
  { text: "If you wrote your own honest biography, what would the current chapter be about?",              goals: ["personal_growth", "creativity"] },

  // ── Body & wellness ───────────────────────────────────────────────────────
  { text: "How did your body feel when you woke up today?",                                                goals: ["habit_tracking", "emotional_wellbeing"] },
  { text: "What has your body been trying to tell you that you haven't been listening to?",                goals: ["habit_tracking", "emotional_wellbeing"] },
  { text: "When did you last feel truly physically well? What was different then?",                        goals: ["habit_tracking"] },
  { text: "Write about your relationship with rest — do you honour it or resist it?",                      goals: ["habit_tracking", "emotional_wellbeing"] },
  { text: "What does 'taking care of your body' mean in this specific season of your life?",               goals: ["habit_tracking"] },
  { text: "What physical sensation have you experienced today that you don't usually notice?",             goals: ["habit_tracking"] },
  { text: "What does your body carry that your mind hasn't fully processed yet?",                          goals: ["emotional_wellbeing"] },
  { text: "Write about a time your body surprised you with its strength or resilience.",                   goals: ["personal_growth", "habit_tracking"] },
  { text: "How do you treat your body when you're stressed vs. when you're at peace?",                     goals: ["habit_tracking", "emotional_wellbeing"] },
  { text: "What's one thing you could do today that would feel genuinely nourishing?",                     goals: ["habit_tracking"] },
  { text: "Write about your relationship with sleep — what does it give you, and what keeps you from it?", goals: ["habit_tracking"] },
  { text: "What movement or physical activity makes you feel most like yourself?",                         goals: ["habit_tracking"] },
  { text: "What are you eating, and how is it honestly making you feel?",                                  goals: ["habit_tracking"] },
  { text: "What would change if you treated your body the way you treat someone you deeply love?",        goals: ["habit_tracking", "emotional_wellbeing"] },
  { text: "How do you know, in your body, when something is genuinely wrong?",                             goals: ["habit_tracking", "emotional_wellbeing"] },
  { text: "When did you last feel at home in your body?",                                                  goals: ["habit_tracking", "emotional_wellbeing"] },
  { text: "What's a small physical ritual that grounds you?",                                              goals: ["habit_tracking"] },
  { text: "Write about a physical place where your body feels completely at ease.",                        goals: ["habit_tracking", "creativity"] },
  { text: "What's your body celebrating right now?",                                                       goals: ["habit_tracking"], moods: ["positive"] },
  { text: "What's one physical habit you're grateful to have built?",                                      goals: ["habit_tracking", "gratitude"] },

  // ── Future & vision ───────────────────────────────────────────────────────
  { text: "Where do you want to be in five years — not in achievement, but in feeling?",                   goals: ["personal_growth"] },
  { text: "Write about the life you're building. Is it the one you actually want?",                        goals: ["personal_growth"] },
  { text: "What's a dream you've had for years that you keep quietly pushing off?",                        goals: ["personal_growth", "creativity"] },
  { text: "What would you do this year if you fully believed it would work?",                              goals: ["personal_growth"] },
  { text: "Write about the version of yourself you're most excited to eventually become.",                 goals: ["personal_growth", "creativity"] },
  { text: "What does your ideal life feel like at 8am on an ordinary weekday?",                            goals: ["personal_growth", "creativity"] },
  { text: "What would you need to change to live more in line with your values?",                          goals: ["personal_growth"] },
  { text: "Who do you want to be for the people around you — five years from now?",                        goals: ["personal_growth"] },
  { text: "What's something you want to start today that your future self will be grateful for?",          goals: ["personal_growth"], weight: 2 },
  { text: "Write a letter from your 80-year-old self to the you of today.",                                goals: ["personal_growth", "creativity"] },
  { text: "What does your ideal relationship with time look like?",                                        goals: ["personal_growth", "mental_clarity"] },
  { text: "What does success feel like in your gut — separate from how others measure it?",                goals: ["personal_growth"] },
  { text: "Write about a future version of your life that feels both ambitious and genuinely possible.",   goals: ["personal_growth", "creativity"] },
  { text: "What are you building that's bigger than just yourself?",                                       goals: ["personal_growth"] },
  { text: "What would your future self forgive you for struggling with right now?",                        goals: ["personal_growth", "emotional_wellbeing"] },
  { text: "What chapter of your life do you want to be in five years from now?",                           goals: ["personal_growth", "creativity"] },
  { text: "What version of your future have you dismissed too quickly?",                                   goals: ["personal_growth"] },
  { text: "If nothing in your life changed, how would you honestly feel in five years?",                   goals: ["personal_growth"] },
  { text: "What would you start if you were ten years younger but had all the knowledge you have now?",    goals: ["personal_growth"] },
  { text: "What does the most fully lived version of your life look like?",                                goals: ["personal_growth", "creativity"], weight: 2 },

  // ── Memories & past ───────────────────────────────────────────────────────
  { text: "Write about a memory that shaped who you are — even if it seems small.",                        goals: ["personal_growth", "creativity"] },
  { text: "What's something from your childhood you're still carrying — good or hard?",                    goals: ["personal_growth", "emotional_wellbeing"] },
  { text: "Write about a person who is no longer in your life but who still influences you.",              goals: ["personal_growth"] },
  { text: "What's a chapter of your life you've never fully written about?",                               goals: ["personal_growth", "creativity"] },
  { text: "What's something you did in your past that you're proud of but rarely mention?",                goals: ["personal_growth"] },
  { text: "Write about a place from your past that still holds meaning.",                                  goals: ["personal_growth", "creativity"] },
  { text: "What's something you wish you had known ten years ago?",                                        goals: ["personal_growth"] },
  { text: "Write about a moment that felt insignificant at the time but turned out to matter.",            goals: ["personal_growth", "creativity"] },
  { text: "What's a lesson that took you far too long to learn?",                                          goals: ["personal_growth"] },
  { text: "Write about the best decision you've ever made.",                                               goals: ["personal_growth"] },
  { text: "What's something from your past you've genuinely made peace with?",                             goals: ["personal_growth", "emotional_wellbeing"] },
  { text: "What's something from your past you haven't fully let go of yet?",                              goals: ["emotional_wellbeing"] },
  { text: "Who were you five years ago, and what would you say to that version of yourself?",              goals: ["personal_growth", "creativity"] },
  { text: "Write about a transition in your life that quietly changed everything.",                        goals: ["personal_growth", "creativity"] },
  { text: "What's a story from your life that you think about more than you'd expect?",                    goals: ["personal_growth", "creativity"] },

  // ── Philosophy & meaning ──────────────────────────────────────────────────
  { text: "What do you believe gives life meaning?",                                                       goals: ["personal_growth"] },
  { text: "What does it mean to live a good life, by your own definition?",                                goals: ["personal_growth"] },
  { text: "What do you think you're here to do — as best as you can tell right now?",                      goals: ["personal_growth"] },
  { text: "What would you want people to say about you at the very end of your life?",                     goals: ["personal_growth"] },
  { text: "What do you believe about human connection — and does your life reflect that belief?",          goals: ["personal_growth"] },
  { text: "What's something you've changed your mind about that once felt absolutely certain?",            goals: ["personal_growth"] },
  { text: "What's the most important thing you've learned about people?",                                  goals: ["personal_growth"] },
  { text: "What does it mean to be a good person in the specifics of your daily life?",                    goals: ["personal_growth"] },
  { text: "What's a principle you try to live by that others might find unusual?",                         goals: ["personal_growth"] },
  { text: "What's a question about life that you keep returning to without a full answer?",                goals: ["personal_growth", "creativity"] },
  { text: "What do you think about fear — is it a sign to stop or a sign to go?",                         goals: ["personal_growth"] },
  { text: "What's something you believe about the future that gives you genuine hope?",                    goals: ["personal_growth"] },
  { text: "What's the most important thing you want to teach or model for others?",                        goals: ["personal_growth"] },
  { text: "What does freedom mean to you right now — not abstractly, but in your real life?",             goals: ["personal_growth"] },
  { text: "When you look back at the end, what do you think will have mattered most?",                     goals: ["personal_growth"] },

  // ── Universal fallbacks ───────────────────────────────────────────────────
  { text: "What happened today? Write it all out — the big stuff and the small stuff.",                    weight: 2 },
  { text: "What's on your mind that you haven't said to anyone yet?",                                      weight: 3 },
  { text: "What was the best part of your day? What made it good?",                                        weight: 2 },
  { text: "What are you currently worried about? And what's most likely to actually happen?",              weight: 2 },
  { text: "If this week had a title, what would it be?",                                                   weight: 2 },
  { text: "What do you want to remember about today, one year from now?",                                  weight: 2 },
  { text: "What are you not saying that needs to be said?",                                                weight: 2 },
  { text: "Where did your attention keep going today?",                                                    weight: 1 },
  { text: "What's something you've been procrastinating that's quietly draining you?",                     weight: 2 },
  { text: "Describe your emotional weather today — sun, clouds, storms, all of it.",                       weight: 2 },
  { text: "What surprised you today?",                                                                     weight: 2 },
  { text: "What's one thing you want more of in your life?",                                               weight: 2 },
  { text: "What's one thing you want less of?",                                                            weight: 2 },
  { text: "Write about a conversation you had today — what was said and what was left unsaid.",            weight: 1 },
  { text: "What's something you've been meaning to do that keeps getting pushed to tomorrow?",             weight: 2 },
  { text: "What's different about today compared to a week ago?",                                          weight: 1 },
  { text: "What would you do with an extra two unscheduled hours today?",                                  weight: 2 },
  { text: "Write about something that challenged you this week.",                                          weight: 2 },
  { text: "What's a question someone asked you recently that made you stop and think?",                    weight: 1 },
  { text: "What's one thing about yourself that you've been quietly discovering lately?",                  weight: 2 },
  { text: "What does your day-to-day life say about what you actually value?",                             weight: 2 },
  { text: "What have you been comparing yourself to others about — and is the comparison fair?",           weight: 1 },
  { text: "Write about your week as if telling it to a close friend who genuinely wanted to know.",        weight: 2 },
  { text: "What do you most need to hear today?",                                                          weight: 2 },
  { text: "What's a small act of courage you did recently that you haven't acknowledged?",                 weight: 2 },
  { text: "What made you smile this week — even briefly?",                                                 weight: 2 },
  { text: "What's been harder than you expected lately?",                                                  weight: 2 },
  { text: "What's been easier than you expected?",                                                         weight: 1 },
  { text: "Write about something you're looking forward to.",                                              weight: 2 },
  { text: "What would you change about yesterday?",                                                        weight: 1 },
  { text: "What are you learning right now — about life, about others, about yourself?",                   weight: 2 },
  { text: "What conversation is overdue in your life?",                                                    weight: 2 },
  { text: "What's a realisation you've had recently that you want to hold onto?",                          weight: 2 },
  { text: "What would making today count actually look like?",                                             weight: 2 },
  { text: "Write about something that's been on your mind all week.",                                      weight: 2 },
  { text: "What's something you did for someone else recently?",                                           weight: 1 },
  { text: "What's something someone did for you that you didn't fully acknowledge?",                       weight: 1 },
  { text: "Describe where you physically are right now — your space — and how it makes you feel.",         weight: 1 },
  { text: "What's something you're avoiding thinking about?",                                              weight: 2 },
  { text: "What would your life look like if it perfectly reflected your values?",                         weight: 2 },
  { text: "Write about a risk you took recently — big or small.",                                          weight: 2 },
  { text: "What's something you used to believe that you no longer do?",                                   weight: 1 },
  { text: "What's a boundary you set recently — and how did it feel to hold it?",                          weight: 2 },
  { text: "What's something you're proud of that no one else knows?",                                      weight: 2 },
  { text: "Write about a time you changed your mind about something important.",                           weight: 1 },
  { text: "What's something you're learning to accept?",                                                   weight: 2 },
  { text: "What does a genuinely good day look like for you right now?",                                   weight: 2 },
  { text: "What are you working toward that still excites you when you think about it?",                   weight: 2 },
  { text: "What's a quality in yourself that you're still learning to appreciate?",                        weight: 2 },
  { text: "Write about something that frustrated you this week — and what it revealed about you.",         weight: 1 },
  { text: "What's something you said recently that you wish you'd said differently?",                      weight: 1 },
  { text: "What's something you kept to yourself recently that you're glad you did?",                      weight: 1 },
  { text: "What's one thing that's changed about how you see yourself?",                                   weight: 2 },
  { text: "Write about something that gave you hope recently.",                                            weight: 2 },
  { text: "What's a decision you made recently that you feel genuinely good about?",                       weight: 2 },
  { text: "What's something about the people in your life that you don't say enough?",                     weight: 2 },
  { text: "What's something you're figuring out as you go?",                                               weight: 2 },
  { text: "Write about a moment this week when you felt fully present.",                                   weight: 2 },
  { text: "What's one thing that would make next week better than this one?",                              weight: 2 },
  { text: "What do you want your life to feel like — not look like, but feel like?",                       weight: 3 },

]

// ── Daily prompt picker ───────────────────────────────────────────────────────
interface PickContext {
  goals:      string[]
  situations: string[]
  moods:      string[]  // recent Mood enum values e.g. ["GREAT","GOOD","OKAY"]
}

function getMoodGroup(moods: string[]): "positive" | "neutral" | "low" | null {
  if (!moods.length) return null
  // Use the most recent 3 to determine trend
  const recent = moods.slice(0, 3)
  const lowCount      = recent.filter((m) => LOW_MOODS.includes(m)).length
  const positiveCount = recent.filter((m) => POSITIVE_MOODS.includes(m)).length
  if (lowCount >= 2)      return "low"
  if (positiveCount >= 2) return "positive"
  return "neutral"
}

// Silence unused-variable warning — NEUTRAL_MOODS is kept for documentation
void NEUTRAL_MOODS

/**
 * Picks the best prompt for today using a weighted sampling strategy.
 *
 * Deterministic for a given (date + skip) pair so:
 *  - skip=0  → stable "prompt of the day" that never changes mid-day
 *  - skip=1,2,… → alternative prompts from the same ranked pool, cycling
 *    forward by a large prime so each skip value lands somewhere different
 */
export function pickDailyPrompt(ctx: PickContext, skip = 0): string {
  const moodGroup = getMoodGroup(ctx.moods)

  // Score each prompt
  const scored = PROMPT_BANK.map((p) => {
    let score = (p.weight ?? 1)

    // Boost by matching goals
    if (p.goals?.some((g) => ctx.goals.includes(g))) score += 3
    // Boost by matching situation
    if (p.situations?.some((s) => ctx.situations.includes(s))) score += 4
    // Boost by matching mood group
    if (moodGroup && p.moods?.includes(moodGroup)) score += 2

    // Penalty for very specific prompts that don't match anything in the user's profile
    const isSpecific = (p.goals?.length ?? 0) + (p.situations?.length ?? 0) + (p.moods?.length ?? 0) > 0
    if (isSpecific && score <= (p.weight ?? 1)) score = Math.max(score - 2, 0)

    return { prompt: p, score }
  }).filter((s) => s.score > 0)

  if (!scored.length) return "What's on your mind today?"

  // Date-based seed — stable all day.  skip offsets by a large prime so each
  // refresh lands at a different position in the weighted pool.
  const today = new Date()
  const seed  = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()

  const totalWeight = scored.reduce((sum, s) => sum + s.score, 0)
  let pick = ((seed + skip * 3_701) % totalWeight) + 1
  for (const s of scored) {
    pick -= s.score
    if (pick <= 0) return s.prompt.text
  }

  return scored[scored.length - 1].prompt.text
}
