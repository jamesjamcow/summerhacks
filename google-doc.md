We’re building an interactive multiplayer scrapbook where you don’t create your own character — your friends build it through their memories of you. Friends can upload photos of moments you shared, and an AI pipeline identifies meaningful objects from each photo and turns them into items that permanently get added to your character. Each item keeps the original memory attached to it and gets its own unique ability or attack. Over time, as more people add memories, your character grows into a playable representation of how others remember you. You can then enter a 2D world and battle friends using the items and abilities you’ve collected, with health bars and combat similar to games like Prodigy.

Timeline :
3d page - landing page
Join logic, joining scrapbooks/worlds with people- we can make it a code to send to people
When they join their character is empty, users can then select an upload feature and upload a photo or something and choose a person from the scrapbook they wanna attach the memory too
Then after that's done the item can pop up on their character/ in their inventory
After this there's a arena where 1 person joins it and the second someone else joins, they select items from their own inventory and can use the attacks assigned by AI and fight like they would in prodigy
The items also grow over time on the person

Implementation flow:

3D Book Landing Page — acts as the main menu. Open book → Create Scrapbook or Join with Code.
Scrapbook Lobby — users join a shared scrapbook/world using an invite code. - add 2 buttons, invite/join and it generates a copy paste code on the main “page”/menu so it only should be able to flip to one pag e so the cover says get started or something for example and then it flips to one thing thats invite or join, and then once a user does an action it then renders the actual scrapbook logic we implement after that yk
Character Creation — every new user starts with an empty character; they cannot add items to themselves.
Memory Upload — upload a photo, select which person in the scrapbook the memory belongs to.
AI Pipeline — vision model finds the main meaningful object → generates an item name, ability, damage/use case, and sprite.
Inventory + Character — item gets permanently attached to that person and stores the original photo/memory with it.
2D Arena — player enters matchmaking; when another joins, both choose items from their inventories and battle in real time with health bars.
Character Growth — as more friends upload memories, more items visually appear on the character and their inventory expands.
Neon DB — store users, scrapbooks, memberships, memories, generated items, abilities, inventories, and battle data.
Doesn’t need realtime — since it’s turn based, we can just use HTTP no WebSockets for arena movement, attacks, health, and matchmaking.
Make sure the state is server-side authoritative because we don’t want a user to be able to oneshot their opponent by opening devtools

Neon db
Clerk for auth Upload thing for file storage

Features for later:
Fight 2018 me type thing
Categories of certain items map to certain types of damage?
Ideas from claude:
Rarity/tiers by emotional weight, not randomness — let the frequency an object/memory gets mentioned by different friends make it stronger, so your character's strongest abilities are literally your most shared/resonant memories. That's a nice mechanical metaphor.
Item "evolution" — the same object appearing in multiple people's uploads (e.g., three friends all upload photos with the same guitar) could merge/level up that item, visually showing the memory is collectively held.
A gentler mode — let people opt into scrapbook-only, no combat, for characters that are more about grief/memorial use cases (this concept could actually be really moving as a memorial tool for someone who's passed, if you want to go there carefully).
Cooldown on additions — new items funnel through a "pending" state so the subject isn't blindsided by a combat character built entirely by someone else while they're offline.

interactivebook

PROMPTS:

Implement the full scrapbook invite/join entry flow in the existing Next.js codebase using Clerk for authentication and Neon Postgres for persistence.
First inspect the existing codebase, current scrapbook UI, Clerk setup, routing, components, styles, animations, and package.json. Reuse what already exists and DO NOT redesign or rewrite unrelated parts of the app.
Flow
User must be authenticated through the existing Clerk setup.
Initial screen is the existing closed 3D scrapbook/book cover with a simple “Get Started” button.
Clicking “Get Started” should flip/open the book to only ONE main page.
That page should have two main buttons:
Invite / Create
Join
Invite/Create:
Create a new scrapbook in Neon.
Generate a short, unique, copy-pasteable invite code.
Use the current Clerk userId as the creator.
Automatically add that user as a member.
Display the invite code with a working Copy button.
Then allow them to enter/render the actual existing scrapbook UI.
Join:
User enters an invite code.
Validate the code server-side.
If valid, add their Clerk userId to that scrapbook.
Prevent duplicate memberships.
Render the actual scrapbook UI after joining.
Show a simple error for invalid codes.
The book flow should stay extremely simple:
Closed Cover → Get Started → ONE Invite/Join Page → Actual Scrapbook
Do NOT create unnecessary additional book pages.
Clerk
Use the existing Clerk integration.
Get the authenticated user with Clerk's server-side auth utilities.
Never trust a user ID sent from the client.
Database mutations should determine the user from the Clerk session server-side.
Unauthenticated users should not be able to create or join scrapbooks.
Use the Clerk userId as the persistent user identifier.
If useful for displaying scrapbook members, retrieve basic user information such as name/avatar using the existing Clerk setup rather than building a second authentication system.
Neon Database
Use the existing Neon/database setup if one exists. If not, configure Neon cleanly using DATABASE_URL, keeping all credentials server-side.
Create the necessary schema/migrations.
scrapbooks
id
invite_code UNIQUE
created_by (Clerk user ID)
created_at
scrapbook_members
id
scrapbook_id
user_id (Clerk user ID)
joined_at
UNIQUE(scrapbook_id, user_id)
Do NOT create a separate authentication/users system unless the existing codebase genuinely requires one. Clerk should remain the source of truth for user identity.
Backend
Implement server-side functions/routes/actions for:
createScrapbook()
joinScrapbook(inviteCode)
getScrapbook()
getScrapbookMembers()
Generate short readable invite codes and safely handle collisions.
All database access must remain server-side. Never expose DATABASE_URL or privileged credentials to the browser.
UI
Preserve the existing scrapbook aesthetic.
Add/reuse clean components such as:
BookCover
ScrapbookEntry
InviteView
JoinView
existing ScrapbookContent
Include:
loading states
disabled buttons while requests run
invalid-code feedback
working clipboard Copy button
smooth existing book/page animation
After create/join succeeds, transition directly into the existing scrapbook experience.
Verification
After implementing:
run TypeScript/type checking
run lint
fix errors introduced by the changes
test authenticated scrapbook creation
test invite code generation/copying
test joining from another Clerk user
test invalid invite codes
test duplicate joins
verify users cannot spoof another Clerk user ID
verify existing scrapbook UI still works
Make the smallest clean set of changes necessary. Do not modify unrelated functionality.
