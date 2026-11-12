---
title: "Reading from a script on Zoom: a setup your audience can't see"
metaTitle: "Hidden script on Zoom: a Mac setup guide"
description: A step-by-step Zoom setup on Mac, where to put the window, what font size works, how to test the screen share, and what recordings do and do not capture.
keywords: [teleprompter zoom, zoom notes, screen share]
date: 2026-11-04
updated: 2026-11-13
image: /images/blog/how-to-use-a-teleprompter-on-zoom.jpg
imageAlt: A floating script window next to a webcam during a Zoom call
---

> On a Mac, a prompter window can be excluded from screen capture at the operating-system level, so Zoom shares and recordings never contain it. Put the window under your camera, make the text bigger than feels natural, and run a ten-second share test before the call.

## Why most prompters show up in the share

When you click Share Screen in Zoom, Zoom asks macOS for a live image of your display or of one window. Anything drawn on that display is part of the image: your slides, your browser, and the teleprompter you were hoping nobody would notice. The same is true of Zoom's local and cloud recordings, which are built from the same capture.

Browser-based prompters and most desktop prompters live inside that captured area. People work around it by putting the prompter on a second monitor and sharing only the first, which works until you need to share the whole screen or you are on a laptop with one display.

## The macOS capture exclusion

macOS lets an app mark a window as excluded from screen capture. Excluded windows are still drawn for the person at the keyboard but are left out of any screenshot, screen recording or screen share, no matter which app requests it. Zoom, Teams, Meet in a browser, OBS, QuickTime and Loom all go through the same capture path, so one setting covers all of them.

gotoprompter for Mac turns that flag on by default. There is no plug-in to install in Zoom and nothing to authorise, because Zoom never learns the window exists.

## Setup in five steps

1. **Write the script the way you talk.** Short sentences, contractions, and a blank line between ideas. Put cues such as [show slide] in square brackets; they are displayed but never counted as spoken.
2. **Copy it and start from the clipboard.** Click the menu-bar icon and choose Start from clipboard. The prompter opens with the text loaded and listening.
3. **Drag the window next to your webcam.** On a laptop that means the top centre of the screen. Keep it narrow so your eyes travel a few degrees, not across the display.
4. **Join the Zoom call** and, if you need to, share your screen or your slides. The prompter stays visible to you and absent from the share.
5. **Talk.** The script follows your voice. If a participant asks a question, answer it; the script waits until you return to the text.

## Window placement and eye line

The goal is for the distance between the camera lens and the line you are reading to be as small as possible. Every centimetre of separation shows up as your eyes pointing slightly below the lens.

Three things help. First, position: top centre, directly under the camera notch or the external webcam. Second, width: a narrow window keeps the text under the lens; a wide one makes your eyes sweep. Third, the active line: gotoprompter keeps the line you are reading near the top of the window rather than the middle, so the words you need are the ones closest to the camera.

If your webcam sits on top of an external monitor, put the prompter on that monitor, at the top. If you present from a laptop with the lid open and a monitor beside it, use the laptop camera and the laptop screen for the prompter; your face points at the right place and the monitor is free for the share.

## Font, opacity, speed

Make the font larger than feels reasonable. On a 14-inch laptop, 32 to 40 points lets you read a line in one glance without the saccade that gives reading away. Fewer words per line also means the highlight moves more often, which makes tracking feel responsive.

Set the opacity so the call behind the window remains legible. Around 70 to 85 percent works for most people: solid enough to read, transparent enough that you still see faces and the chat.

Speed does not apply in Voice mode because the script moves at your pace. If you switch to Sound or Constant mode for a section, pick the speed by reading one paragraph aloud and adjusting until the highlight neither rushes nor lags.

## Test before the call

Thirty seconds of testing avoids the one scenario everyone fears. Start a Zoom meeting with yourself, share your screen, and look at the shared preview: the prompter should not be there. Start a local recording, read a sentence, stop, and open the file. Same result.

If you ever see the window in the preview, the exclusion setting has been turned off. In gotoprompter it lives under Settings, Overlay, "Hidden from screen sharing and recordings". We also recommend keeping an eye on Zoom's own updates; the exclusion is enforced by macOS, not by Zoom, so it has been stable across versions, but a test costs nothing.

## Frequently asked questions

**Does this work with Zoom in a browser?** Yes. Browser-based Zoom captures the screen through the same macOS API, so the window is excluded the same way.

**Will my camera feed show the window?** No. The exclusion is about what is drawn on screen. Your camera films you, and the window is not physically in the room.

**Can other participants tell I am reading?** If the window is under the camera and the font is large, your eye line stays on the lens. The tell is usually eyes sweeping left to right across a wide block of text, which a narrow window prevents.

**What about Windows or an iPad?** The capture exclusion is a macOS feature. On other platforms the free web app still scrolls with your voice, but keep it on a display you are not sharing.

---

**Related:** [[teleprompter-for-google-meet]] · [[how-to-read-a-script-without-looking-like-youre-reading]] · [[how-a-voice-following-teleprompter-works]]
