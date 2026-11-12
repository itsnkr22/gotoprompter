---
title: "A teleprompter in 60+ languages: how detection and recognition work"
metaTitle: "Teleprompter in 60+ languages: how it works"
description: "How a voice-following teleprompter detects your script's language, where recognition runs, mixed-language scripts, and when Sound mode is the better choice."
keywords: [multilingual teleprompter, teleprompter languages, speech recognition]
date: 2026-10-29
image: /images/blog/teleprompter-in-60-languages.jpg
imageAlt: Script text in several scripts and alphabets
---

> The language is detected from the script text, so you rarely have to choose it. Recognition runs on the device on Mac and in most modern browsers. For a script that mixes languages, bracket the foreign words so they are shown but not matched. For a language the recognizer does not support, Sound mode still scrolls.

## Detection from the script

A speech recognizer has to be told which language to listen for; it cannot guess from audio alone without a delay you would notice. Asking you to pick from a list of sixty every time you paste a script is the obvious solution and the annoying one.

Instead, we detect the language from the text. The script is right there before you say a word, and a few sentences of text are enough to identify most languages with high confidence. The web app runs a small language-identification model over the pasted text and picks from the 34 languages the browser engines support; the Mac app does the same against the list of locales Apple's on-device recognition offers, which is more than sixty. If the guess is wrong, or the script is too short to be sure, you can pick manually from the settings and the app remembers the choice for that script.

Detection happens on the device as well. The text never leaves the app to be classified.

## On-device recognition

Where recognition runs matters for privacy, for latency and for whether the thing works on a plane.

On Mac, gotoprompter uses Apple's Speech framework with on-device recognition. The audio is processed locally, nothing is sent anywhere, and it works offline once the dictation model for a language is installed, which macOS handles automatically for most languages in System Settings. The set of supported languages is Apple's, which is why we say "60+" rather than a fixed number: it grows with macOS releases.

In the browser, the web app uses the Web Speech API. Safari and recent versions of Chrome perform recognition on the device for most of the 34 languages we offer. Some browsers and some languages may route audio to the vendor's service; the browser's own privacy policy governs that, and we mention it in ours. Firefox does not ship the API at all, so voice scrolling is unavailable there and the app offers Sound and Constant modes instead.

## Mixed languages with brackets

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

**Which 34 languages does the web app support?** The ones Chrome, Edge and Safari can recognize reliably, with automatic detection: most European languages, Arabic, Hebrew, Hindi, Chinese, Japanese, Korean, Thai, Vietnamese and others. The full list is in the language menu inside the app.

**Does the Mac app need an internet connection to download a language?** The first time you use a language, macOS may download its on-device dictation model. After that recognition works fully offline.

**My script is in English but I have an accent. Will it track?** Yes. Recognizers are trained on many accents, and the matcher tolerates occasional misheard words because it looks for runs of matching words, not perfection. If it lags, a closer microphone helps more than anything else.

**Can I force a specific language?** Yes. Pick it in the settings and the app stops guessing for that script.

---

**Related:** [[how-a-voice-following-teleprompter-works]] · [[free-web-teleprompter-no-download]] · [[best-teleprompter-app-for-mac]]
