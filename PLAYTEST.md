# Playtest checklist

## How to report a problem

On GitHub, open this project, click the **Issues** tab, then **New issue**. Say:
- what device you used (for example "Samsung phone, Chrome")
- what you tapped
- what happened, and what you expected

A screenshot helps a lot. On most Android phones you take one by holding
**Power + Volume Down**.

## Phase 1

- [ ] The game link opens on your phone in Chrome
- [ ] Holding the phone upright shows "Please turn your phone sideways"
- [ ] Sideways, you see the title "Follow Me" over hills, a river and a rising sun
- [ ] The hills slowly drift (the far hills move slower than the near ones)
- [ ] There are no black bars on the left or right
- [ ] **Test Voice** speaks a welcome sentence out loud (check that the volume is up)
- [ ] **Begin** switches to full screen and shows a "Chapter 1 arrives in Phase 2" message
- [ ] The buttons are easy for your kids to tap
- [ ] The link also works on your Windows computer

## Phase 2

Open https://followmegame.netlify.app on your Android phone (Chrome), sideways, volume up.

**Players and saving**
- [ ] **Begin** shows "Who is playing?" with 3 spaces
- [ ] **+ New Player** lets you type a name, then the story starts
- [ ] Make a second player for another child: each one keeps their own place
- [ ] Close Chrome completely mid-scene, reopen the link, pick the player: it continues from the same line
- [ ] **Erase** asks "are you sure?" before deleting a player

**Story and voice**
- [ ] A banner shows "Chapter 1: The Baptism of Jesus / The Jordan River"
- [ ] Every line is read aloud
- [ ] The word being spoken is highlighted in gold as it is read (on some phones the highlight is estimated, so it may run a little ahead or behind; tell me if it's way off)
- [ ] The speaker's name and round portrait always show
- [ ] Bridging lines say **"Narration"** and look slightly different from Scripture lines
- [ ] Scripture lines show their reference at the bottom right (for example "Matthew 3:15 · BSB")
- [ ] The person speaking bobs gently; the voice from heaven brings a soft light down on Jesus

**Buttons along the top**
- [ ] ⟲ replays the current line
- [ ] ⏭ skips to the next line
- [ ] 🚶 changes speed: 🐢 slow, 🚶 normal, 🐇 fast
- [ ] **Auto** / **Tap**: in Tap mode the game waits for you to tap the box ("Tap to continue ▶")
- [ ] 📜 opens the full passage; **BSB** / **KJV** switches the translation, and the story then uses it
- [ ] ☰ goes back to "Who is playing?"

**Puzzles**
- [ ] The question is read aloud; 🔊 reads it again
- [ ] A wrong answer turns grey and gives a gentle hint with the verse reference
- [ ] The right answer turns green, says "That's right!", and shows **Continue**

**Chapter end**
- [ ] Shows "Chapter 1 complete!", the memory verse (Matthew 3:17) and a Reflect thought, all read aloud

**Questions for you and the kids**
- Was any text too small or too long to read comfortably?
- Is the normal speed right for your youngest?
- Did the kids want to tap the box to move on, or were they happy with Auto?

## Phase 3

The title screen should say **Phase 3 · v0.3.0** in the bottom-left corner.
Your saved players keep their place. A player who already finished Chapter 1 continues into Chapter 2.

**Chapter 2: Tempted in the Wilderness**
- [ ] The wilderness looks dry and rocky; the second scene shows Jerusalem with the temple
- [ ] When the tempter speaks there is no figure, just a round "?" portrait and the screen dims a little (check it isn't scary for your youngest)
- [ ] Jesus answers each time with "It is written…" and the reference shows (Matthew 4:4, 4:7, 4:10)
- [ ] A **ⓘ Note** before the temple scene explains that Luke lists the temptations in a different order, and is read aloud
- [ ] **Fill in the missing word:** the verse shows a blank; a wrong word turns grey with a hint; the right word fills in and the whole verse is read
- [ ] **Find on the map:** tapping a wrong dot names it ("That's Nazareth"); tapping Jerusalem turns it green

**Chapter 3: The First Disciples**
- [ ] A note explains why John's "Lamb of God" words come after the temptation
- [ ] "✦ Andrew is now following Jesus! ✦" appears and is read aloud, and so on for Peter, Philip and Nathanael
- [ ] Disciples who have joined keep walking with Jesus in the scenes after
- [ ] In the last scene Jesus says **"Follow Me."** (John 1:43), the line the game is named after
- [ ] The Bethsaida map puzzle: you can drag the map up and down

**The map (🗺 button, top right, and on the chapter-end screen)**
- [ ] Shows a gold dashed route: Jordan → Wilderness → Jerusalem → Wilderness → Jordan → Galilee
- [ ] The place you are now is gold; places already visited are red
- [ ] Tapping a visited place shows and reads its summary
- [ ] Dragging moves the map up and down
- [ ] **←** returns you to the story (it replays the line you were on)

**Questions for you and the kids**
- Can the kids find places on the map without help? Are the dots big enough?
- Are the notes helpful, or too long for the kids? (They're mostly for parents.)
- With 5 people on screen in Chapter 3, is it still clear who is talking?

## Phase 4

The title screen should say **Phase 4 · v0.4.0**. Existing players keep their place, and start on the **Family** level.

**Levels**
- [ ] Making a new player asks "Who is this player?": Kids, Family or Adult
- [ ] Under each player is a level button (for example "Family"). Tap it to change level
- [ ] **Kids:** answers show pictures. Tapping an answer once reads it out loud, and tapping it again chooses it. There are fewer choices
- [ ] **Kids:** the memory verse is a short part of the verse (for example "Look, the Lamb of God")
- [ ] **Adult:** verses are cut into more pieces in "put the verse in order"

**New puzzles** (all in Chapters 1–3)
- [ ] Chapter 1, scene 2: **Who said it?** Tap a person, then their words
- [ ] Chapter 2, scene 2: **Put Jesus' words back in order.** The verse builds up at the top
- [ ] Chapter 2, scene 3: **Put the temptations in order.** Each card gets a number. After two misses, the right card glows
- [ ] Chapter 3, scene 3: **Find Nathanael under the fig tree.** Wrong places say "Not here"
- [ ] Chapter 3, new scene 4: **Match each disciple to a fact**
- [ ] (A "count the loaves and fish" puzzle is built and will appear in Chapter 14)

**☰ Menu** (top-left during the story)
- [ ] Continue, Map, Verse Journal, The Twelve, Change Player all work

**Verse Journal**
- [ ] After a chapter, its memory verse is in the Journal. Verses from puzzles are added too
- [ ] Tapping a verse reads it aloud
- [ ] **Practice** gives quick puzzles for the verses that are due
- [ ] Stars (★☆☆☆☆): getting a verse right the first time adds a star, and it comes back later (1, 3, 7, then 14 days). A miss starts it over at one star, to practice again soon

**The Twelve (Disciple Cards)**
- [ ] 12 cards: the ones you have met show color and a symbol; the rest say "Not met yet"
- [ ] Tapping a card shows and reads his name, hometown, work, and facts with verse references
- [ ] Nathanael's card has an ⓘ note that "Bartholomew" is tradition, not stated in the Bible
- [ ] Cards don't give away later events. They say "More about him later in the story…"

**Questions for you and the kids**
- Does "tap once to hear, tap again to choose" make sense to your youngest?
- Are any of the new puzzles confusing or too hard? Which ones do the kids like best?
- Is anything on the Disciple Cards worded in a way you'd change?

## Phase 5, part 1: Chapters 4–10

The title screen should say **Phase 5 · v0.5.0**.

**Quick way to reach a chapter:** a player who already finished Chapter 3 continues straight into Chapter 4.

- [ ] **Ch 4, The Wedding at Cana:** Mary, the servants and the master of the banquet; count the 6 stone jars
- [ ] **Ch 5, Born Again and Living Water:** Jesus clears the temple (with a note that this happened twice); Nicodemus at night under the stars; the woman at the well. The disciples are *not* on screen with Nicodemus or at the well (John 4:8 says they had gone into town)
- [ ] **Ch 6, Rejected at Nazareth:** Jesus reads Isaiah in the synagogue; the crowd's anger is told calmly; find Nazareth on the map
- [ ] **Ch 7, Fishers of Men:** the boats and the huge catch; James and John join; put Jesus' day in Capernaum in order
- [ ] **Ch 8, Jesus Calls Matthew:** Matthew joins at the tax booth
- [ ] **Ch 9, Choosing the Twelve:** after a night of prayer, the other five join, so the Twelve are complete (check "The Twelve" in the ☰ menu shows 12/12); count the apostles
- [ ] **Ch 10, The Sermon on the Mount:** the Beatitudes, the light of the world (find the lamp hidden under the basket), the Lord's Prayer, the wise and foolish builders
- [ ] At the end of each chapter, **💬 Talk Together** shows 2–3 questions and a short prayer; 🔊 reads the questions, 🙏 reads the prayer
- [ ] Disciples who aren't speaking stand in a smaller back row without names

**Questions for you**
- Are the discussion questions the right level for your kids?
- Is any wording in the narration lines you'd change? (They're marked "Narration" in the game and are in `content/en/chapters/`.)
- Does Chapter 10 (4 scenes) feel too long for one sitting?
