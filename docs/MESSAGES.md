# Messages inside the app (20/11/26)

Owner order, 20/11/26: built-in messaging so one level of people can reach
another without phone calls — someone asks, the other replies, inside the app.

## What is built
- **Whole group** — every member reads and writes.
- **Ask the officials** — a member's question is read by that member and the
  officials (chair, secretary, treasurer) only. An official picks a member's
  question and answers in that member's thread. Unanswered questions are listed
  first and marked "Waiting for an answer".
- Plain text, up to 500 letters. Every message passes Stawi's safety screen on
  the server before it is stored. Eight messages a minute per person per group.
- The screen refreshes by itself every 12 seconds while it is open.
- A "Messages" main tab; a "Messages" switch under "Choose what you use" (on
  for groups, off for a business on its own).

## Rules kept
- The server decides what each person receives (`canSeeMessage`); the browser
  is never sent another member's question.
- No phone number is shown beside a message. With "Show officials' posts"
  switched off, ordinary members do not see the Official badge.
- **Database (additive):** `GroupMessage`, group-owned, in `rls.sql`.

## Not yet
- Person-to-person messages between two members.
- A count of unread messages on the tab; a phone notification for a new message.
- Photos and voice notes.
- A watch that raises a question left unanswered for 3 days.
- Removing a message (an official hiding one; a member deleting their own).
- The mobile app.
