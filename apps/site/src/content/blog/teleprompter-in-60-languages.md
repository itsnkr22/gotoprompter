---
title: "Multilingual scripts: how a teleprompter knows what you're reading"
metaTitle: "How a teleprompter detects your language"
description: "How a voice-following teleprompter works out your script's language from its alphabet and wording, handles right-to-left text, and copes with mixed scripts."
keywords: [multilingual teleprompter, teleprompter languages, speech recognition]
date: 2026-10-29
updated: 2026-11-13
image: /images/blog/teleprompter-in-60-languages.jpg
imageAlt: Script text in several scripts and alphabets
---

> The language is worked out from the script text, first from its writing system and then from its wording, so you rarely have to choose it. Arabic, Hebrew, Persian and Urdu are laid out right to left automatically. For a script that mixes languages, bracket the foreign words so they are shown but not matched. For a language the recognizer does not support, Sound mode still scrolls.

## How the language is worked out

A speech recognizer has to be told which language to listen for; it cannot guess from audio alone without a delay you would notice. Asking you to pick from a list of sixty every time you paste a script is the obvious solution and the annoying one.

Instead, we read the script. It is right there before you say a word, and the web app looks at it in two passes.

The first pass is the alphabet. Many writing systems belong to exactly one of the languages a recognizer offers: Greek, Hebrew, Thai, Korean, Georgian, Armenian, Tamil, Telugu and a dozen more. If most of the letters come from one of those, the question is settled without any statistics. Scripts shared by several languages get a second look at the letters only one of them uses: ї and є point to Ukrainian rather than Russian, ٹ and ے to Urdu rather than Arabic, پ and گ to Persian.

The second pass is wording, for everything written in Latin letters and the remaining Cyrillic. A language-identification model compares the text against the letter patterns of about sixty languages. A few sentences are enough for most of them. Close relatives need more: one line of Danish can pass for Norwegian, a paragraph cannot.

Between the two passes the web app recognises 51 of its 65 languages on its own. The other 14 are ones no detector separates reliably from a neighbour, such as Malay from Indonesian or Croatian from Serbian, and you pick those from the menu once. The Mac app does the same job against the locales Apple's on-device recognition offers, which is more than sixty. If the guess is wrong, or the script is too short to be sure, the app says so and you choose manually.

## Right-to-left text and regional accents

Knowing the language also fixes the layout. Arabic, Hebrew, Persian and Urdu scripts are set right to left, with lines starting at the right edge, without you touching the direction setting. You can still force either direction if a script needs it.

Accent matters to a recognizer as much as language does. Brazilian and European Portuguese, British, Australian and Indian English, Mexican Spanish and Canadian French are separate entries in the menu, and when the detected language has a variant that matches your browser's own language setting, the app uses it. A reader in São Paulo gets the Brazilian recognizer without asking.

Detection happens on the device as well. The text never leaves the app to be classified.

## Where the listening happens

Where recognition runs matters for privacy, for latency and for whether the thing works on a plane.

On Mac, gotoprompter uses Apple's Speech framework with on-device recognition. The audio is processed locally, nothing is sent anywhere, and it works offline once the dictation model for a language is installed, which macOS handles automatically for most languages in System Settings. The set of supported languages is Apple's, which is why we say "60+" rather than a fixed number: it grows with macOS releases.

In the browser, the web app uses the Web Speech API, which means the browser does the listening, not us. Where that happens depends on the browser and the language: Safari can recognise many languages on the device, while Chrome and Edge normally pass the audio to their vendor's speech service, which is also why voice scrolling there needs a connection. The browser's own privacy policy governs that, and we mention it in ours. Your script text is never sent anywhere either way. Firefox does not ship the API at all, so voice scrolling is unavailable there and the app offers Sound and Constant modes instead; those two work offline in every browser.

## Scripts that switch language

Real scripts mix languages more often than language menus assume. A product name, a quotation, a greeting in the audience's language, a technical term that only exists in English.

A recognizer listening for one language will mishear words from another, and a naive matcher would then lose its place. The fix is simple and reliable: put the foreign words in square brackets. gotoprompter shows bracketed text so you can read it, but excludes it from matching, so the sync holds on the words around it. "Our new feature, [Schnellstart], lets you..." reads naturally and tracks perfectly.

For a script that is entirely in another language, there is nothing to do; detection picks the right recognizer. For a script that alternates paragraphs between two languages, split it into two scripts, or bracket the smaller portion.

## When to use Sound mode

Sound mode scrolls while the microphone hears you and pauses when you go quiet. It does no recognition at all, which makes it the right tool in three situations.

The first is a language the recognizer does not support. The list is long but not infinite, and Sound mode treats every language the same because it only measures volume.

The second is a script that is mostly names, numbers or jargon. If most words are ones the recognizer gets wrong, there is little left to match, and a steady crawl that stops when you stop is more predictable.

The third is a loud environment. Speech recognition degrades with background noise before a level meter does. A headset or a directional microphone fixes most of this, but on a trade-show floor Sound mode just works.

Switching modes takes one click, and the display settings carry over, so trying both on a new script costs nothing.

## Frequently asked questions

**Which languages does the web app support?** Sixty-five: most European languages, Arabic, Hebrew, Persian and Urdu, Hindi, Bengali, Tamil, Telugu and other Indian languages, Chinese, Cantonese, Japanese, Korean, Thai, Vietnamese, Indonesian, Filipino, Swahili, Afrikaans and more. The full list is in the language menu inside the app, with the automatically detected ones marked. Which of them a given browser can actually recognise is up to that browser; if it cannot, the app tells you and falls back to English.

**Does the Mac app need an internet connection to download a language?** The first time you use a language, macOS may download its on-device dictation model. After that recognition works fully offline.

**My script is in English but I have an accent. Will it track?** Yes. Recognizers are trained on many accents, and the matcher tolerates occasional misheard words because it looks for runs of matching words, not perfection. If it lags, a closer microphone helps more than anything else.

**Can I force a specific language?** Yes. Pick it in the settings and the app stops guessing for that script.

---

**Related:** [[how-a-voice-following-teleprompter-works]] · [[free-web-teleprompter-no-download]] · [[best-teleprompter-app-for-mac]]
