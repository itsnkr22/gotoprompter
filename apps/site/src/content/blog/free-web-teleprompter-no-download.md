---
title: A free web teleprompter you don't have to download
description: What a browser-based teleprompter can do today, how to install the web app on a phone or desktop so it works offline, and the two things it honestly cannot do.
keywords: [free teleprompter, online teleprompter, no download, voice scrolling]
date: 2026-11-02
image: /images/blog/free-web-teleprompter-no-download.jpg
imageAlt: A phone and a laptop both showing the web teleprompter
---

> The gotoprompter web app is a full voice-following teleprompter that runs in Chrome, Edge or Safari, costs nothing, stores scripts only on your device, and installs as an offline app in two taps. It cannot float over other apps or hide from screen sharing; that is the Mac app's job.

## Why browser-based

A teleprompter is a focused tool: show text, move it at the right moment, stay out of the way. Browsers have everything that needs. They can listen to a microphone, run speech recognition, store text locally, and go full screen. Shipping the prompter as a web page means it works on a Windows laptop, a Chromebook, an Android phone and an iPad the same day, with no app store review and no installer to trust.

It also means we can publish the code. The web app is open source under the MIT licence, so anyone can read how the matching works, run their own copy, or fix something we got wrong.

## What it does

The core is the same voice engine as the Mac app. Paste a script, press start, tap the microphone, and the highlight follows your words: it waits when you pause, stays put while you ad-lib, and jumps when you skip ahead or repeat a line. Click any word to continue from there.

Around that core:

- **Three scrolling modes.** Voice, Sound (moves while the mic hears you) and Constant (a steady crawl at a speed you set).
- **34 languages** with automatic detection from the script text, or pick one manually.
- **Voice commands.** "Go back", "go next", "go start" and "go finish" move by paragraph or to either end without touching the screen.
- **Mirror mode.** Flip and rotate the text for a beam-splitter rig.
- **Video recording.** Record yourself from the camera while you read, in a split or overlay layout, and download the file.
- **Google Docs import.** Paste a link to a document shared as "Anyone with the link" and the text loads, with a refresh button for later edits.
- **Display settings.** Font, size, colours, margins, line position and speed, all remembered between sessions.
- **Presenter notes.** Anything in square brackets is shown but never counted as spoken.

Your scripts live in the browser's local storage. They are never uploaded, there is no account, and the only network request the app makes on your behalf is the Google Docs import you ask for.

## Install as an app

Installing the web app makes it launch from the home screen or dock, open full screen without browser chrome, and keep working without a connection.

**iPhone and iPad:** open the app in Safari, tap Share, then "Add to Home Screen".

**Android:** open it in Chrome, tap the three-dot menu, then "Install app" or "Add to Home screen".

**Mac, Windows and Linux:** open it in Chrome or Edge and click the install icon at the right end of the address bar, then Install.

After that it behaves like any other app. Updates arrive silently the next time you are online; the app tells you when a new version is ready and reloads when you say so.

One caveat for iPad users: Apple does not allow speech recognition inside installed web apps on iPadOS. The installed app still works for Sound and Constant modes, and for reading, but for voice scrolling open the site in Safari instead.

## What it can't do

We would rather you know before you plan a presentation around it.

A browser tab cannot float above other applications. If you need the script on top of a full-screen Keynote deck or a Zoom window, a web page is behind it. And a browser tab cannot exclude itself from screen capture: if you share your screen on a call, the tab is part of the share like everything else.

Both limitations come from the browser sandbox, which is the same thing that makes the web app safe to run from any link. Fixing them needs a native app with operating-system permissions, which is exactly what our Mac app is: the same engine, in a window that stays on top and disappears from shares and recordings. If you present on Zoom, Meet or Teams from a Mac, that is the one to use. Everywhere else, the web app is the complete product, not a demo.

## Frequently asked questions

**Is it really free, with no catch?** Yes. The web app is free and open source. We make money from the Mac app, which adds things a browser cannot do.

**Which browsers support voice scrolling?** Chrome, Edge and Safari on desktop and mobile. Firefox does not ship the Web Speech API, so voice scrolling is unavailable there; Sound and Constant modes still work.

**Does speech recognition send my voice to a server?** That depends on the browser. Safari and recent versions of Chrome recognize most languages on the device. Other browsers may use the vendor's speech service; check your browser's privacy policy if that matters for your content.

**Can I use it on a phone as a rig for a DSLR?** Yes. Mirror mode flips and rotates the text for a beam-splitter, and the phone keeps listening while it sits in the rig.

---

**Related:** [[how-a-voice-following-teleprompter-works]] · [[teleprompter-without-subscription]] · [[teleprompter-in-60-languages]]
